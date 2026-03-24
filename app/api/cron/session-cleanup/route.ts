import { type NextRequest, NextResponse } from "next/server"
import { cleanupExpiredAdminSessions } from "@/lib/admin-auth"
import { validateCronRequest, acquireCronLock } from "@/lib/middleware/cron-security"
import { logger } from "@/lib/logger"

export async function GET(req: NextRequest) {
  const correlationId = crypto.randomUUID()

  try {
    const securityCheck = await validateCronRequest(req)
    if (securityCheck) {
      return securityCheck
    }

    // Idempotency guard (FIX 14)
    const alreadyRunning = await acquireCronLock("session-cleanup", 360)
    if (alreadyRunning) {
      return NextResponse.json({ success: true, skipped: true, reason: "already ran in this window", correlationId })
    }

    logger.info("Starting admin session cleanup cron job", { correlationId })

    const deletedCount = await cleanupExpiredAdminSessions()

    logger.info("Admin session cleanup cron job completed", { correlationId, deletedCount })

    return NextResponse.json({
      success: true,
      deletedCount,
      correlationId,
    })
  } catch (error) {
    logger.error("Admin session cleanup cron job failed", {
      correlationId,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json(
      { success: false, error: { code: "CRON_JOB_FAILED", message: "Cron job failed" }, correlationId },
      { status: 500 },
    )
  }
}
