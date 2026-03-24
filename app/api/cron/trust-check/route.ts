import { type NextRequest, NextResponse } from "next/server"
import { validateCronRequest, acquireCronLock } from "@/lib/middleware/cron-security"
import { logger } from "@/lib/logger"
import { getOpenTrustFlags, getOpenComplianceCases } from "@/lib/services/trust/trust.service"

/**
 * Cron: Trust & Compliance Check — surfaces unresolved trust flags and
 * compliance cases that may need admin attention.
 *
 * Schedule: every 30 minutes (see vercel.json)
 */
export async function GET(req: NextRequest) {
  const correlationId = crypto.randomUUID()

  try {
    const securityCheck = await validateCronRequest(req)
    if (securityCheck) {
      return securityCheck
    }

    const alreadyRunning = await acquireCronLock("trust-check", 30)
    if (alreadyRunning) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "already ran in this window",
        correlationId,
      })
    }

    logger.info("Starting trust-check cron job", { correlationId })

    // 1. Fetch open trust flags with HIGH/CRITICAL severity
    const criticalFlags = await getOpenTrustFlags({ severity: "CRITICAL", limit: 50 })
    const highFlags = await getOpenTrustFlags({ severity: "HIGH", limit: 50 })

    // 2. Fetch open compliance cases
    const criticalCases = await getOpenComplianceCases({ priority: "CRITICAL", limit: 50 })
    const highCases = await getOpenComplianceCases({ priority: "HIGH", limit: 50 })

    const summary = {
      criticalFlagCount: criticalFlags.length,
      highFlagCount: highFlags.length,
      criticalCaseCount: criticalCases.length,
      highCaseCount: highCases.length,
    }

    logger.info("Trust-check cron job completed", { correlationId, summary })

    return NextResponse.json({
      success: true,
      correlationId,
      summary,
    })
  } catch (error) {
    logger.error("trust-check cron job failed", {
      correlationId,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json(
      {
        success: false,
        error: { code: "CRON_JOB_FAILED", message: "Trust check cron job failed" },
        correlationId,
      },
      { status: 500 },
    )
  }
}
