/**
 * Centralized database availability guard for API routes.
 *
 * Replaces the scattered `if (!isDatabaseConfigured()) return 503` pattern
 * with a single helper that:
 *   – returns `null` when the DB is reachable (route may continue)
 *   – returns a generic 503 NextResponse when it is not
 *   – logs the exact missing env vars server-side without exposing secrets
 */

import { NextResponse } from "next/server"
import { isDatabaseConfigured, getMissingDbEnvVars } from "@/lib/db"
import { logger } from "@/lib/logger"

/**
 * Call at the start of any API route handler that requires the service-role
 * Supabase client.
 *
 * @returns `null` when the database is available, or a 503 `NextResponse`.
 *
 * Usage:
 * ```ts
 * const unavailable = requireDatabase()
 * if (unavailable) return unavailable
 * ```
 */
export function requireDatabase(): NextResponse | null {
  if (isDatabaseConfigured()) return null

  const correlationId = crypto.randomUUID()
  const missing = getMissingDbEnvVars()

  logger.error("Database unavailable — returning 503", {
    correlationId,
    missing,
  })

  return NextResponse.json(
    {
      error: { code: "SERVICE_UNAVAILABLE", message: "Service temporarily unavailable" },
      correlationId,
    },
    { status: 503 },
  )
}
