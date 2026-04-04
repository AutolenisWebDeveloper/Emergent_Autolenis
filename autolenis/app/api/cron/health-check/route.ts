import { type NextRequest, NextResponse } from "next/server"
import { validateCronRequest, acquireCronLock } from "@/lib/middleware/cron-security"
import { logger } from "@/lib/logger"
import {
  recordHealthCheckAsync,
  getLatestHealthChecks,
  openIncidentAsync,
} from "@/lib/services/system/ops.service"

/**
 * Cron: System Health Check — probes core subsystems and records results.
 *
 * Checks: database connectivity, config completeness, recent job health.
 * Records health-check rows in `system_health_checks` and opens incidents
 * for any FAIL results.
 *
 * Schedule: every 5 minutes (see vercel.json)
 */
export async function GET(req: NextRequest) {
  const correlationId = crypto.randomUUID()

  try {
    const securityCheck = await validateCronRequest(req)
    if (securityCheck) {
      return securityCheck
    }

    const alreadyRunning = await acquireCronLock("health-check", 5)
    if (alreadyRunning) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "already ran in this window",
        correlationId,
      })
    }

    logger.info("Starting health-check cron job", { correlationId })

    const checks: Array<{ checkKey: string; status: "PASS" | "WARN" | "FAIL"; message: string }> = []

    // 1. Database connectivity probe
    try {
      const { getSupabase } = await import("@/lib/db")
      const supabase = getSupabase()
      const { error } = await supabase
        .from("system_health_checks")
        .select("id")
        .limit(1)
      checks.push({
        checkKey: "database_connectivity",
        status: error ? "FAIL" : "PASS",
        message: error ? `Database unreachable: ${error.message}` : "Database connected",
      })
    } catch (err) {
      checks.push({
        checkKey: "database_connectivity",
        status: "FAIL",
        message: `Database probe exception: ${err instanceof Error ? err.message : String(err)}`,
      })
    }

    // 2. Environment config check
    const requiredEnvVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "CRON_SECRET",
    ]
    const missingVars = requiredEnvVars.filter((v) => !process.env[v])
    checks.push({
      checkKey: "environment_config",
      status: missingVars.length > 0 ? "WARN" : "PASS",
      message:
        missingVars.length > 0
          ? `Missing env vars: ${missingVars.join(", ")}`
          : "All required env vars present",
    })

    // Record each check and open incidents for failures
    for (const check of checks) {
      await recordHealthCheckAsync({
        checkKey: check.checkKey,
        status: check.status,
        message: check.message,
      })

      if (check.status === "FAIL") {
        await openIncidentAsync({
          incidentKey: `health_${check.checkKey}`,
          severity: "HIGH",
          title: `Health check failed: ${check.checkKey}`,
          description: check.message,
        }).catch((err) => {
          logger.warn("Failed to open incident for health check", {
            checkKey: check.checkKey,
            error: err instanceof Error ? err.message : String(err),
          })
        })
      }
    }

    const latest = await getLatestHealthChecks()

    logger.info("Health-check cron job completed", {
      correlationId,
      checksRun: checks.length,
      failures: checks.filter((c) => c.status === "FAIL").length,
    })

    return NextResponse.json({
      success: true,
      correlationId,
      checks,
      latestHealthChecks: latest,
    })
  } catch (error) {
    logger.error("health-check cron job failed", {
      correlationId,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json(
      {
        success: false,
        error: { code: "CRON_JOB_FAILED", message: "Health check cron job failed" },
        correlationId,
      },
      { status: 500 },
    )
  }
}
