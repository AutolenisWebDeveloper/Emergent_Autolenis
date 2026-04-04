import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { writePrequalAuditLog } from "@/lib/prequal/audit"
import { isApplicationStale } from "@/lib/prequal/sla"

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
    const now = new Date()

    // Expire applications past their expiresAt date
    const toExpire = await prisma.prequalApplication.findMany({
      where: {
        expiresAt: { lt: now },
        status: {
          notIn: ["EXPIRED", "NOT_PREQUALIFIED", "PREQUALIFIED", "PREQUALIFIED_CONDITIONAL"],
        },
      },
      select: { id: true },
    })

    let expiredCount = 0
    for (const app of toExpire) {
      await prisma.prequalApplication.update({
        where: { id: app.id },
        data: { status: "EXPIRED", queueSegment: "EXPIRED" },
      })
      await writePrequalAuditLog({
        applicationId: app.id,
        eventType: "APPLICATION_EXPIRED",
        actorType: "SYSTEM",
        description: "Application expired by scheduled cleanup",
      })
      expiredCount++
    }

    // Mark stale in-progress applications
    const inProgress = await prisma.prequalApplication.findMany({
      where: {
        status: { in: ["INTAKE_IN_PROGRESS", "CONSENT_CAPTURED", "IBV_PENDING"] },
        stalledAt: null,
      },
    })

    let staleCount = 0
    for (const app of inProgress) {
      if (isApplicationStale(app.updatedAt)) {
        await prisma.prequalApplication.update({
          where: { id: app.id },
          data: { status: "STALE", queueSegment: "STALE", stalledAt: now },
        })
        await writePrequalAuditLog({
          applicationId: app.id,
          eventType: "APPLICATION_STALE",
          actorType: "SYSTEM",
          description: "Application marked stale due to inactivity",
        })
        staleCount++
      }
    }

    logger.info("[Prequal Cron] Stale cleanup completed", { expiredCount, staleCount })
    return NextResponse.json({ success: true, expiredCount, staleCount })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[Prequal Cron] Stale cleanup error", { error: msg })
    return NextResponse.json({ success: false, error: "Stale cleanup failed" }, { status: 500 })
  }
}
