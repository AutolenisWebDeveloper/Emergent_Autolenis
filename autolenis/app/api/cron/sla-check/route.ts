import { type NextRequest, NextResponse } from "next/server"
import { validateCronRequest, acquireCronLock } from "@/lib/middleware/cron-security"
import { logger } from "@/lib/logger"
import { runAutomationCycle } from "@/lib/services/workflow/automation-runner.service"

/**
 * Cron: SLA Check — standalone SLA evaluation endpoint.
 *
 * Runs the same automation cycle as workflow-automation but on its own
 * schedule, allowing more frequent SLA checks without coupling to the
 * broader workflow automation cadence.
 *
 * Schedule: every 10 minutes (see vercel.json)
 */
export async function GET(req: NextRequest) {
  const correlationId = crypto.randomUUID()

  try {
    const securityCheck = await validateCronRequest(req)
    if (securityCheck) {
      return securityCheck
    }

    const alreadyRunning = await acquireCronLock("sla-check", 10)
    if (alreadyRunning) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "already ran in this window",
        correlationId,
      })
    }

    logger.info("Starting sla-check cron job", { correlationId })

    const result = await runAutomationCycle()

    logger.info("SLA-check cron job completed", {
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
    logger.error("sla-check cron job failed", {
      correlationId,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json(
      {
        success: false,
        error: { code: "CRON_JOB_FAILED", message: "SLA check cron job failed" },
        correlationId,
      },
      { status: 500 },
    )
  }
}
