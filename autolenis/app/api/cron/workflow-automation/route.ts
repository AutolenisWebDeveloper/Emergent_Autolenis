import { type NextRequest, NextResponse } from "next/server"
import { validateCronRequest, acquireCronLock } from "@/lib/middleware/cron-security"
import { logger } from "@/lib/logger"
import { runAutomationCycle } from "@/lib/services/workflow/automation-runner.service"

/**
 * Cron: Workflow Automation — SLA evaluation, notifications & expirations.
 *
 * Evaluates SLA rules for all workflow domains (leads, sourcing cases,
 * invites, offers, conversions) and enqueues/delivers notifications
 * for any violations.
 *
 * Schedule: every 15 minutes (see vercel.json)
 */
export async function GET(req: NextRequest) {
  const correlationId = crypto.randomUUID()

  try {
    const securityCheck = await validateCronRequest(req)
    if (securityCheck) {
      return securityCheck
    }

    // Idempotency guard — prevent overlapping runs
    const alreadyRunning = await acquireCronLock("workflow-automation", 15)
    if (alreadyRunning) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "already ran in this window",
        correlationId,
      })
    }

    logger.info("Starting workflow-automation cron job", { correlationId })

    const result = await runAutomationCycle()

    logger.info("Workflow-automation cron job completed", {
      correlationId,
      durationMs: result.durationMs,
    })

    return NextResponse.json({
      success: true,
      correlationId: result.correlationId,
      evaluations: result.evaluations,
      notifications: result.notifications,
      durationMs: result.durationMs,
    })
  } catch (error) {
    logger.error("workflow-automation cron job failed", {
      correlationId,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json(
      {
        success: false,
        error: { code: "CRON_JOB_FAILED", message: "Workflow automation cron job failed" },
        correlationId,
      },
      { status: 500 },
    )
  }
}
