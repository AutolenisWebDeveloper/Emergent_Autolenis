import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getPrequalSessionToken } from "@/lib/prequal/session"
import { writePrequalAuditLog } from "@/lib/prequal/audit"
import { makeFinalDecision } from "@/lib/decision/final-decision"
import { calculateShoppingRange, getShoppingPassExpiry } from "@/lib/decision/shopping-power"
import type { IpredictBand, IbvOutcome } from "@/lib/types/prequal"

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
      include: { ipredictReport: true, ibvReport: true },
    })

    if (!application) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 })
    }

    const validStatuses = ["IPREDICT_COMPLETED", "IBV_COMPLETED", "DECISION_PENDING"]
    if (!validStatuses.includes(application.status)) {
      return NextResponse.json(
        { success: false, error: `Application is not ready for finalization: ${application.status}` },
        { status: 409 }
      )
    }

    if (!application.ipredictBand) {
      return NextResponse.json(
        { success: false, error: "iPredict result not available" },
        { status: 409 }
      )
    }

    // Update status to DECISION_PENDING
    await prisma.prequalApplication.update({
      where: { id: application.id },
      data: { status: "DECISION_PENDING" },
    })

    const ipredictBand = application.ipredictBand as IpredictBand
    const ibvOutcome = (application.ibvOutcome ?? "NOT_TRIGGERED") as IbvOutcome
    const hardFailReason = application.ipredictReport?.hardFailReason ?? undefined

    // Make the final decision
    const decisionResult = makeFinalDecision({ ipredictBand, ibvOutcome, hardFailReason })

    // Calculate shopping range (only for non-fail outcomes)
    let shoppingMin: number | undefined
    let shoppingMax: number | undefined

    if (decisionResult.finalStatus !== "NOT_PREQUALIFIED") {
      const rangeInput = {
        grossMonthlyIncomeCents: application.grossMonthlyIncome,
        monthlyHousingPaymentCents: application.monthlyHousingPayment,
        downPaymentCents: application.downPaymentCents,
        targetMonthlyPaymentCents: application.targetMonthlyPaymentCents,
        ipredictBand,
        ibvOutcome,
        verifiedMonthlyIncomeCents: application.ibvReport?.monthlyIncomeCents ?? undefined,
      }
      const range = calculateShoppingRange(rangeInput)
      shoppingMin = range.minCents
      shoppingMax = range.maxCents
    }

    const expiresAt = getShoppingPassExpiry()

    // Determine ApplicationStatus from FinalStatus
    const appStatusMap: Record<string, string> = {
      PREQUALIFIED: "PREQUALIFIED",
      PREQUALIFIED_CONDITIONAL: "PREQUALIFIED_CONDITIONAL",
      MANUAL_REVIEW: "MANUAL_REVIEW",
      NOT_PREQUALIFIED: "NOT_PREQUALIFIED",
    }
    const newAppStatus = appStatusMap[decisionResult.finalStatus] ?? "SYSTEM_ERROR"

    const queueSegmentMap: Record<string, string> = {
      PREQUALIFIED: "COMPLETED",
      PREQUALIFIED_CONDITIONAL: "COMPLETED",
      MANUAL_REVIEW: "READY_FOR_REVIEW",
      NOT_PREQUALIFIED: "DECLINED",
    }

    // Persist decision
    await prisma.prequalDecision.create({
      data: {
        applicationId: application.id,
        finalStatus: decisionResult.finalStatus,
        ipredictBand,
        ibvOutcome,
        shoppingRangeMinCents: shoppingMin ?? null,
        shoppingRangeMaxCents: shoppingMax ?? null,
        decisionReason: decisionResult.decisionReason,
        expiresAt,
      },
    })

    // Update application
    await prisma.prequalApplication.update({
      where: { id: application.id },
      data: {
        status: newAppStatus as any,
        finalStatus: decisionResult.finalStatus,
        shoppingRangeMinCents: shoppingMin ?? null,
        shoppingRangeMaxCents: shoppingMax ?? null,
        completedAt: new Date(),
        expiresAt,
        queueSegment: (queueSegmentMap[decisionResult.finalStatus] ?? "COMPLETED") as any,
      },
    })

    await writePrequalAuditLog({
      applicationId: application.id,
      eventType: "DECISION_MADE",
      actorType: "SYSTEM",
      description: `Final decision: ${decisionResult.finalStatus}`,
      metadata: {
        finalStatus: decisionResult.finalStatus,
        decisionReason: decisionResult.decisionReason,
        shoppingMin,
        shoppingMax,
      },
    })

    logger.info("[Prequal] Decision finalized", {
      applicationId: application.id,
      finalStatus: decisionResult.finalStatus,
    })

    return NextResponse.json({
      success: true,
      finalStatus: decisionResult.finalStatus,
      shoppingRangeMinCents: shoppingMin,
      shoppingRangeMaxCents: shoppingMax,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[Prequal] Finalize route error", { error: msg })
    return NextResponse.json({ success: false, error: "Failed to finalize prequal decision" }, { status: 500 })
  }
}
