/**
 * External service health check endpoint.
 * Admin/internal only — returns minimal operational status.
 * Does NOT expose provider names, tokens, or dependency topology.
 */

import { NextResponse, type NextRequest } from "next/server"
import { withAuth, requireInternalRequest } from "@/lib/authz/guard"
import { ADMIN_ROLES } from "@/lib/authz/roles"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  // Allow admin auth OR internal header
  const internal = requireInternalRequest(request)
  if (!internal) {
    const ctx = await withAuth(request, { roles: ADMIN_ROLES, csrf: false })
    if (ctx instanceof NextResponse) return ctx
  }

  const correlationId = crypto.randomUUID()

  // Lightweight config-presence checks only — no active probing of Stripe/Resend
  const stripeConfigured = !!process.env["STRIPE_SECRET_KEY"]
  const resendConfigured = !!process.env["RESEND_API_KEY"]
  const dbConfigured = !!(process.env["NEXT_PUBLIC_SUPABASE_URL"] && process.env["SUPABASE_SERVICE_ROLE_KEY"])

  const allConfigured = stripeConfigured && resendConfigured && dbConfigured
  const status = allConfigured ? "ok" : "degraded"

  return NextResponse.json(
    { status, correlationId, timestamp: new Date().toISOString() },
    { status: allConfigured ? 200 : 503 },
  )
}
