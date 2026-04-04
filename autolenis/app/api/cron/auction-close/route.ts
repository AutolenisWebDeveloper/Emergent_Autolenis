import { type NextRequest, NextResponse } from "next/server"
import { AuctionService } from "@/lib/services/auction.service"
import { validateCronRequest, acquireCronLock } from "@/lib/middleware/cron-security"
import { logger } from "@/lib/logger"
import { getCacheAdapter } from "@/lib/cache/redis-adapter"

const CRON_LOCK_KEY = "cron:auction-close:last-run"
// 4 minutes — prevents double-fire when cron is scheduled at 5-minute intervals.
// Must be less than the cron schedule interval to allow normal execution.
const CRON_MIN_INTERVAL_SECONDS = 4 * 60

export async function GET(req: NextRequest) {
  try {
    const securityCheck = await validateCronRequest(req)
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

    logger.info("Starting auction auto-close cron job")

    const closedCount = await AuctionService.closeExpiredAuctions()

    logger.info("Auction auto-close cron job completed", { closedCount })

    return NextResponse.json({
      success: true,
      closedCount,
    })
  } catch (error) {
    logger.error("Auction auto-close cron job failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json(
      { success: false, error: "Cron job failed" },
      { status: 500 },
    )
  }
}
