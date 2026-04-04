/**
 * Database connectivity health check endpoint.
 * Admin/internal only — returns minimal operational status.
 * Does NOT expose project ref, canary row detail, or service-role hints.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
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
  const startTime = Date.now()

  try {
    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
    const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, correlationId, timestamp: new Date().toISOString() },
        { status: 503 },
      )
    }

    // Lightweight REST check without importing Supabase client
    const res = await fetch(`${supabaseUrl}/rest/v1/_connection_canary?select=id&limit=1`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      signal: AbortSignal.timeout(5000),
    })

    const latencyMs = Date.now() - startTime

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const code = body?.code || ""
      const msg = body?.message || ""
      // Log details server-side only
      console.error("[Health/DB] Supabase error:", msg, code)
      // Check if table doesn't exist
      if (code === "42P01" || msg.includes("does not exist")) {
        return NextResponse.json(
          { ok: false, latencyMs, correlationId, timestamp: new Date().toISOString(), error: "Canary table not found" },
          { status: 503 },
        )
      }
      return NextResponse.json(
        { ok: false, latencyMs, correlationId, timestamp: new Date().toISOString(), error: "Database query failed" },
        { status: 503 },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        latencyMs,
        correlationId,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    )
  } catch {
    console.error("[Health/DB] Unexpected error")
    return NextResponse.json(
      {
        ok: false,
        latencyMs: Date.now() - startTime,
        correlationId,
        timestamp: new Date().toISOString(),
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
