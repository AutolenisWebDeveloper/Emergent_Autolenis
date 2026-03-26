import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { decryptSsn, encrypt } from "@/lib/prequal/encryption"
import { getPrequalSessionToken } from "@/lib/prequal/session"
import { writePrequalAuditLog } from "@/lib/prequal/audit"
import { callIpredict } from "@/lib/microbilt/ipredict-client"
import { mapIpredictResponse } from "@/lib/microbilt/mappers"
import { scoreIpredict } from "@/lib/decision/ipredict-scorer"
import { MicroBiltNoScoreError } from "@/lib/microbilt/errors"

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
        { status: 409 }
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

    // Decrypt SSN just-in-time for the API call — never log or persist in plain text
    const ssnPlain = decryptSsn(application.ssnEncrypted)

    let rawResponse
    let scoringResult
    let isHardFail = false

    try {
      rawResponse = await callIpredict({
        ssn: ssnPlain,
        firstName: application.firstName,
        lastName: application.lastName,
        dateOfBirth: application.dateOfBirth.toISOString().split("T")[0],
        address: {
          street1: application.addressLine1,
          street2: application.addressLine2 ?? undefined,
          city: application.city,
          state: application.state,
          zip: application.zipCode,
        },
        phone: application.phone,
        email: application.email,
      })

      const parsed = mapIpredictResponse(rawResponse)
      scoringResult = scoreIpredict(parsed)
    } catch (error: unknown) {
      if (error instanceof MicroBiltNoScoreError) {
        scoringResult = { band: "FAIL" as const, hardFailReason: "NO_SCORE" }
        rawResponse = { requestId: "NO_SCORE", status: "NO_SCORE" as const }
        isHardFail = true
      } else {
        // System error — mark application accordingly
        await prisma.prequalApplication.update({
          where: { id: application.id },
          data: { status: "SYSTEM_ERROR" },
        })
        await writePrequalAuditLog({
          applicationId: application.id,
          eventType: "IPREDICT_ERROR",
          actorType: "SYSTEM",
          description: error instanceof Error ? error.message : "iPredict API error",
        })
        return NextResponse.json(
          { success: false, error: "Credit assessment service temporarily unavailable" },
          { status: 503 }
        )
      }
    }

    // Encrypt and store the raw vendor response
    const encryptedPayload = encrypt(JSON.stringify(rawResponse))
    await prisma.prequalIpredictReport.create({
      data: {
        applicationId: application.id,
        encryptedPayload,
        band: scoringResult.band,
        scoreRaw: scoringResult.scoreRaw ?? null,
        hardFailReason: scoringResult.hardFailReason ?? null,
        requestId: (rawResponse as any).requestId ?? null,
      },
    })

    // Determine next status
    let nextStatus: string
    if (scoringResult.band === "FAIL") {
      nextStatus = "IPREDICT_COMPLETED"
    } else if (scoringResult.band === "BORDERLINE") {
      nextStatus = "IBV_PENDING"
    } else {
      // PASS — go straight to decision
      nextStatus = "IPREDICT_COMPLETED"
    }

    await prisma.prequalApplication.update({
      where: { id: application.id },
      data: {
        status: nextStatus as any,
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
