import { type NextRequest, NextResponse } from "next/server"
import { affiliateService } from "@/lib/services/affiliate.service"
import { validateCronRequest, acquireCronLock } from "@/lib/middleware/cron-security"
import { logger } from "@/lib/logger"
import { getCacheAdapter } from "@/lib/cache/redis-adapter"

const CRON_LOCK_KEY = "cron:affiliate-reconciliation:last-run"
const CRON_MIN_INTERVAL_SECONDS = 4 * 60 // 4 minutes — prevents double-fire

export async function GET(request: NextRequest) {
  try {
    const securityCheck = await validateCronRequest(request)
    if (securityCheck) {
      return securityCheck
    }

    // Idempotency guard via cache
    const cache = getCacheAdapter()
    const lastRun = await cache.get<string>(CRON_LOCK_KEY)

    if (lastRun) {
      const secondsAgo = (Date.now() - Number(lastRun)) / 1000
      if (secondsAgo < CRON_MIN_INTERVAL_SECONDS) {
        return NextResponse.json({
          skipped: true,
          reason: `Last run was ${Math.round(secondsAgo)}s ago`,
        })
      }
    }

    await cache.set(CRON_LOCK_KEY, Date.now().toString(), CRON_MIN_INTERVAL_SECONDS * 2 * 1000)

    const results = await affiliateService.runReconciliation()

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error("Affiliate reconciliation cron job failed", error instanceof Error ? error : undefined)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
