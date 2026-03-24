import { type NextRequest, NextResponse } from "next/server"
import { validateCronRequest, acquireCronLock } from "@/lib/middleware/cron-security"
import { logger } from "@/lib/logger"
import {
  writeDailySnapshot,
  getInventorySourceBreakdown,
} from "@/lib/services/analytics/analytics.service"

/**
 * Cron: Analytics Daily Snapshot — captures point-in-time metrics.
 *
 * Persists key inventory, lead, and sourcing metrics into the
 * `analytics_daily_snapshots` table for historical trend analysis.
 *
 * Schedule: once daily at 02:00 UTC (see vercel.json)
 */
export async function GET(req: NextRequest) {
  const correlationId = crypto.randomUUID()

  try {
    const securityCheck = await validateCronRequest(req)
    if (securityCheck) {
      return securityCheck
    }

    const alreadyRunning = await acquireCronLock("analytics-snapshot", 60)
    if (alreadyRunning) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "already ran in this window",
        correlationId,
      })
    }

    logger.info("Starting analytics-snapshot cron job", { correlationId })

    const snapshotDate = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    let metricsWritten = 0

    // 1. Inventory source breakdown
    try {
      const breakdown = await getInventorySourceBreakdown()
      for (const entry of breakdown) {
        await writeDailySnapshot({
          snapshotDate,
          metricGroup: "inventory",
          metricKey: "source_total",
          metricValue: entry.total,
          dimension1: entry.source,
          payload: { byStatus: entry.byStatus },
        })
        metricsWritten++
      }
    } catch (err) {
      logger.warn("Failed to snapshot inventory breakdown", {
        correlationId,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    // 2. Aggregate counts from key tables
    try {
      const { getSupabase } = await import("@/lib/db")
      const supabase = getSupabase()

      const tables = [
        { table: "inventory_leads", metricKey: "lead_count" },
        { table: "sourcing_cases", metricKey: "sourcing_case_count" },
        { table: "inventory_case_conversions", metricKey: "conversion_count" },
      ]

      for (const { table, metricKey } of tables) {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true })

        if (!error && count !== null) {
          await writeDailySnapshot({
            snapshotDate,
            metricGroup: "pipeline",
            metricKey,
            metricValue: count,
          })
          metricsWritten++
        }
      }
    } catch (err) {
      logger.warn("Failed to snapshot pipeline counts", {
        correlationId,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    logger.info("Analytics-snapshot cron job completed", {
      correlationId,
      metricsWritten,
    })

    return NextResponse.json({
      success: true,
      correlationId,
      snapshotDate,
      metricsWritten,
    })
  } catch (error) {
    logger.error("analytics-snapshot cron job failed", {
      correlationId,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json(
      {
        success: false,
        error: { code: "CRON_JOB_FAILED", message: "Analytics snapshot cron job failed" },
        correlationId,
      },
      { status: 500 },
    )
  }
}
