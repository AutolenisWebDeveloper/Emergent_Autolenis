// Cron route security middleware
// Validates requests are from Vercel Cron service

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { getCacheAdapter } from "@/lib/cache/redis-adapter"
import { logger } from "@/lib/logger"

// Vercel Cron IP ranges (as of 2024)
const VERCEL_CRON_IPS = [
  "76.76.21.0/24", // Vercel Cron service
  "76.76.21.21", // Specific Vercel Cron IP
  "76.76.21.142", // Specific Vercel Cron IP
]

function isIpInRange(ip: string, range: string): boolean {
  if (!range.includes("/")) {
    return ip === range
  }

  const [rangeIp, prefixLength] = range.split("/")
  if (!rangeIp || !prefixLength) {
    return false
  }
  
  const mask = -1 << (32 - Number.parseInt(prefixLength))

  const ipNum = ipToNumber(ip)
  const rangeNum = ipToNumber(rangeIp)

  return (ipNum & mask) === (rangeNum & mask)
}

function ipToNumber(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number.parseInt(octet), 0)
}

export async function validateCronRequest(request: NextRequest): Promise<NextResponse | null> {
  // Check cron secret
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env['CRON_SECRET']

  if (!cronSecret) {
    logger.error("[CronSecurity] CRON_SECRET not configured")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const expected = `Bearer ${cronSecret}`
  if (
    !authHeader ||
    authHeader.length !== expected.length ||
    !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
  ) {
    logger.warn("[CronSecurity] Invalid cron secret")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify IP address in production environments
  if (process.env.NODE_ENV === "production") {
    const ip = ("ip" in request ? (request as { ip?: string }).ip : undefined) || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")

    if (!ip) {
      logger.warn("[CronSecurity] No IP address found in request")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const isValidIp = VERCEL_CRON_IPS.some((range) => isIpInRange(ip, range))

    if (!isValidIp) {
      logger.warn("[CronSecurity] Request from unauthorized IP", { ip })
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  return null
}

/**
 * Idempotency guard for cron jobs (FIX 14).
 *
 * Uses a cache-based lock keyed by `cron:<jobName>:<windowKey>`.
 * The window key is derived from the current UTC minute (for minute-level
 * schedules) or hour (for hourly schedules), preventing duplicate execution
 * within the same window even if the cron fires twice.
 *
 * Returns `true` if the job is already running (caller should skip execution).
 * Returns `false` if this is the first invocation in the window (caller proceeds).
 */
export async function acquireCronLock(jobName: string, windowMinutes = 5): Promise<boolean> {
  try {
    const cache = getCacheAdapter()
    const now = new Date()
    // Round down to the nearest window boundary
    const windowMs = windowMinutes * 60 * 1000
    const windowKey = Math.floor(now.getTime() / windowMs).toString()
    const lockKey = `cron:${jobName}:${windowKey}`

    const existing = await cache.get(lockKey)
    if (existing) {
      // Already ran in this window — skip
      return true
    }

    // Acquire lock: set with TTL of 2× the window to cover edge cases
    await cache.set(lockKey, "1", windowMs * 2)
    return false
  } catch {
    // On cache failure, allow execution (fail open — cron work is idempotent by design)
    return false
  }
}
