import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { decryptSsn, encrypt } from "@/lib/prequal/encryption"
import { getPrequalSessionToken } from "@/lib/prequal/session"
import { writePrequalAuditLog } from "@/lib/prequal/audit"
import { callIpredict } from "@/lib/microbilt/ipredict-client"
import type { ApplicationStatus } from "@/lib/types/prequal"

import type { IpredictApplicationInput } from "@/lib/microbilt/ipredict-client"
import { scoreIpredict } from "@/lib/decision/ipredict-scorer"
import { MicroBiltTimeoutError } from "@/lib/microbilt/errors"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionToken =
      (await getPrequalSessionToken()) ??
      request.headers.get("x-prequal-session") ??
      null

    if (!sessionToken) {
      return NextResponse.json({ success: false, error: "No prequal session" }, { status: 401 })
    }

    const application = await prisma.prequalApplication.findUnique({
      where: { sessionToken },
    })

    if (!application) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 })
    }

    if (application.status !== "CONSENT_CAPTURED" && application.status !== "IPREDICT_PENDING") {
      return NextResponse.json(
        { success: false, error: `Invalid status for iPredict: ${application.status}` },
        { status: 409 },
      )
    }

    // Update status to IPREDICT_PENDING
    await prisma.prequalApplication.update({
      where: { id: application.id },
      data: { status: "IPREDICT_PENDING" },
    })

    await writePrequalAuditLog({
      applicationId: application.id,
      eventType: "IPREDICT_REQUESTED",
      actorType: "SYSTEM",
      description: "iPredict API call initiated",
    })

    // Decrypt SSN just-in-time — never log or persist in plain text
    const ssnPlain = decryptSsn(application.ssnEncrypted)

    // Convert gross monthly income from cents to dollars for the API
    const grossMonthlyIncomeDollars = application.grossMonthlyIncome / 100

    const input: IpredictApplicationInput = {
      firstName: application.firstName,
      lastName: application.lastName,
      ssn: ssnPlain,
      dob: application.dateOfBirth.toISOString().split("T")[0],
      address1: application.addressLine1,
      city: application.city,
      state: application.state,
      zip: application.zipCode,
      phone: application.phone.replace(/\D/g, ""),
      employerName: application.employerName ?? undefined,
      grossMonthlyIncome: grossMonthlyIncomeDollars,
      payFrequency: undefined,
      applicationId: application.id,
    }

    let callResult
    let scoringResult

    try {
      // Call with auto-retry (client handles one retry internally)
      callResult = await callIpredict(input)
      scoringResult = scoreIpredict(callResult.parsed)
    } catch (firstError: unknown) {
      // If retryable, try once more at the route level
      if (firstError instanceof MicroBiltTimeoutError) {
        try {
          callResult = await callIpredict(input)
          scoringResult = scoreIpredict(callResult.parsed)
        } catch (retryError: unknown) {
          // Both attempts failed — route to manual review
          await prisma.prequalApplication.update({
            where: { id: application.id },
            data: { status: "SYSTEM_ERROR", queueSegment: "READY_FOR_REVIEW" },
          })

          await writePrequalAuditLog({
            applicationId: application.id,
            eventType: "IPREDICT_ERROR",
            actorType: "SYSTEM",
            description: retryError instanceof Error ? retryError.message : "iPredict failed after retry",
          })

          return NextResponse.json(
            { success: false, error: "Credit assessment service temporarily unavailable" },
            { status: 503 },
          )
        }
      } else {
        // Non-retryable error
        await prisma.prequalApplication.update({
          where: { id: application.id },
          data: { status: "SYSTEM_ERROR" },
        })

        await writePrequalAuditLog({
          applicationId: application.id,
          eventType: "IPREDICT_ERROR",
          actorType: "SYSTEM",
          description: firstError instanceof Error ? firstError.message : "iPredict API error",
        })

        return NextResponse.json(
          { success: false, error: "Credit assessment service temporarily unavailable" },
          { status: 503 },
        )
      }
    }

    // Encrypt and store the raw vendor response
    const encryptedPayload = encrypt(callResult.rawResponseJson)
    await prisma.prequalIpredictReport.create({
      data: {
        applicationId: application.id,
        encryptedPayload,
        band: scoringResult.band,
        scoreRaw: scoringResult.scoreRaw ?? null,
        hardFailReason: scoringResult.hardFailReason ?? null,
        requestId: callResult.vendorRequestId ?? null,
      },
    })

    // Determine next status
    let nextStatus: string
    if (scoringResult.band === "FAIL") {
      nextStatus = "IPREDICT_COMPLETED"
    } else if (scoringResult.band === "BORDERLINE") {
      nextStatus = "IBV_PENDING"
    } else {
      // PASS — go to IBV for income verification (configurable)
      nextStatus = "IBV_PENDING"
    }

    await prisma.prequalApplication.update({
      where: { id: application.id },
      data: {
        status: nextStatus as ApplicationStatus,
        ipredictBand: scoringResult.band,
        ipredictScoreRaw: scoringResult.scoreRaw ?? null,
        queueSegment: nextStatus === "IBV_PENDING" ? "ACTION_REQUIRED" : "IN_PROGRESS",
      },
    })

    await writePrequalAuditLog({
      applicationId: application.id,
      eventType: "IPREDICT_COMPLETED",
      actorType: "SYSTEM",
      description: `iPredict scored: band=${scoringResult.band}`,
      metadata: {
        band: scoringResult.band,
        hardFailReason: scoringResult.hardFailReason,
        nextStatus,
      },
    })

    // If FAIL, finalize immediately
    if (scoringResult.band === "FAIL") {
      await prisma.prequalApplication.update({
        where: { id: application.id },
        data: {
          status: "NOT_PREQUALIFIED",
          finalStatus: "NOT_PREQUALIFIED",
          queueSegment: "DECLINED",
          completedAt: new Date(),
        },
      })

      await writePrequalAuditLog({
        applicationId: application.id,
        eventType: "DECISION_MADE",
        actorType: "SYSTEM",
        description: `Auto-declined: ${scoringResult.hardFailReason ?? "score below threshold"}`,
        metadata: { newState: "NOT_PREQUALIFIED" },
      })
    }

    return NextResponse.json({
      success: true,
      band: scoringResult.band,
      nextStatus,
      requiresIbv: nextStatus === "IBV_PENDING",
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[Prequal] iPredict route error", { error: msg })
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

