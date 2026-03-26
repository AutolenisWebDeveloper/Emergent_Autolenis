import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getSessionUser } from "@/lib/auth-server"
import { writePrequalAuditLog } from "@/lib/prequal/audit"
import { calculateShoppingRange, getShoppingPassExpiry } from "@/lib/decision/shopping-power"
import type { IpredictBand, IbvOutcome } from "@/lib/types/prequal"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  action: z.enum(["approve", "decline", "escalate", "request-docs"]),
  reason: z.string().max(2000).optional(),
  overrideStatus: z.enum(["PREQUALIFIED", "PREQUALIFIED_CONDITIONAL", "MANUAL_REVIEW", "NOT_PREQUALIFIED"]).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await getSessionUser()
    if (!user || !["ADMIN", "SUPER_ADMIN", "COMPLIANCE_ADMIN"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = actionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { action, reason, overrideStatus } = parsed.data

    const application = await prisma.prequalApplication.findUnique({ where: { id } })
    if (!application) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 })
    }

    let newStatus: string
    let newQueueSegment: string
    let eventType: string

    switch (action) {
      case "approve": {
        const finalStatus = overrideStatus ?? "PREQUALIFIED"
        newStatus = finalStatus
        newQueueSegment = "COMPLETED"
        eventType = "ADMIN_APPROVED"

        const expiresAt = getShoppingPassExpiry()
        let shoppingMin: number | undefined
        let shoppingMax: number | undefined

        if (finalStatus !== "NOT_PREQUALIFIED" && application.ipredictBand) {
          const range = calculateShoppingRange({
            grossMonthlyIncomeCents: application.grossMonthlyIncome,
            monthlyHousingPaymentCents: application.monthlyHousingPayment,
            downPaymentCents: application.downPaymentCents,
            targetMonthlyPaymentCents: application.targetMonthlyPaymentCents,
            ipredictBand: application.ipredictBand as IpredictBand,
            ibvOutcome: (application.ibvOutcome ?? "NOT_TRIGGERED") as IbvOutcome,
          })
          shoppingMin = range.minCents
          shoppingMax = range.maxCents
        }

        await prisma.prequalDecision.upsert({
          where: { applicationId: id },
          create: {
            applicationId: id,
            finalStatus: finalStatus as any,
            ipredictBand: (application.ipredictBand ?? "PASS") as any,
            ibvOutcome: (application.ibvOutcome ?? "NOT_TRIGGERED") as any,
            shoppingRangeMinCents: shoppingMin ?? null,
            shoppingRangeMaxCents: shoppingMax ?? null,
            decisionReason: reason ?? "Manual admin approval",
            expiresAt,
            manualOverride: true,
            overrideActorId: user.userId,
            overrideReason: reason ?? null,
          },
          update: {
            finalStatus: finalStatus as any,
            shoppingRangeMinCents: shoppingMin ?? null,
            shoppingRangeMaxCents: shoppingMax ?? null,
            decisionReason: reason ?? "Manual admin approval",
            manualOverride: true,
            overrideActorId: user.userId,
            overrideReason: reason ?? null,
            expiresAt,
          },
        })

        await prisma.prequalApplication.update({
          where: { id },
          data: {
            status: finalStatus as any,
            finalStatus: finalStatus as any,
            shoppingRangeMinCents: shoppingMin ?? null,
            shoppingRangeMaxCents: shoppingMax ?? null,
            queueSegment: "COMPLETED",
            completedAt: new Date(),
          },
        })
        break
      }

      case "decline":
        newStatus = "NOT_PREQUALIFIED"
        newQueueSegment = "DECLINED"
        eventType = "ADMIN_DECLINED"
        await prisma.prequalApplication.update({
          where: { id },
          data: { status: "NOT_PREQUALIFIED", finalStatus: "NOT_PREQUALIFIED", queueSegment: "DECLINED", completedAt: new Date() },
        })
        break

      case "escalate":
        newStatus = application.status
        newQueueSegment = "ACTION_REQUIRED"
        eventType = "ADMIN_ESCALATED"
        await prisma.prequalApplication.update({
          where: { id },
          data: { queueSegment: "ACTION_REQUIRED", slaEscalatedAt: new Date(), slaEscalationReason: reason ?? null },
        })
        break

      case "request-docs":
        newStatus = application.status
        newQueueSegment = "ACTION_REQUIRED"
        eventType = "DOCS_REQUESTED"
        await prisma.prequalApplication.update({
          where: { id },
          data: { queueSegment: "ACTION_REQUIRED" },
        })
        break

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    await writePrequalAuditLog({
      applicationId: id,
      eventType,
      actorId: user.userId,
      actorType: "ADMIN",
      description: reason ?? `Admin action: ${action}`,
      metadata: { action, overrideStatus },
    })

    return NextResponse.json({ success: true, action, applicationId: id })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[Admin Prequal] Action route error", { error: msg })
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
