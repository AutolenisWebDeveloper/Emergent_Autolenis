import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { writePrequalAuditLog } from "@/lib/prequal/audit"
import { isManualReviewSlaBreached } from "@/lib/prequal/sla"

export const dynamic = "force-dynamic"

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env["CRON_SECRET"]
  if (!cronSecret) return false
  return (
    request.headers.get("authorization") === `Bearer ${cronSecret}` ||
    request.headers.get("x-cron-secret") === cronSecret
  )
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Find MANUAL_REVIEW applications that have been waiting too long
    const manualReviews = await prisma.prequalApplication.findMany({
      where: {
        status: "MANUAL_REVIEW",
        slaEscalatedAt: null,
      },
    })

    let escalatedCount = 0

    for (const app of manualReviews) {
      if (isManualReviewSlaBreached(app.createdAt)) {
        await prisma.prequalApplication.update({
          where: { id: app.id },
          data: {
            slaEscalatedAt: new Date(),
            slaEscalationReason: "SLA_BREACH_AUTO_ESCALATION",
            queueSegment: "ACTION_REQUIRED",
          },
        })

        await writePrequalAuditLog({
          applicationId: app.id,
          eventType: "SLA_ESCALATED",
          actorType: "SYSTEM",
          description: "Application auto-escalated due to manual review SLA breach",
        })

        escalatedCount++
      }
    }

    logger.info("[Prequal Cron] SLA escalation completed", { escalatedCount })
    return NextResponse.json({ success: true, escalatedCount })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[Prequal Cron] SLA escalation error", { error: msg })
    return NextResponse.json({ success: false, error: "SLA escalation failed" }, { status: 500 })
  }
}
