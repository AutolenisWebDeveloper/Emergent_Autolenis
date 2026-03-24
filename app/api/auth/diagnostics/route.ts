import { NextResponse, type NextRequest } from "next/server"
import { withAuth, requireInternalRequest } from "@/lib/authz/guard"
import { ADMIN_ROLES } from "@/lib/authz/roles"

/**
 * Auth Diagnostics Endpoint
 * Protected by internal API key header or admin session — never publicly accessible.
 * Returns minimal pass/fail diagnostics only. No configuration details, cookie
 * inventories, secret-length metadata, or host analysis are exposed.
 */
export async function GET(request: NextRequest) {
  const correlationId = crypto.randomUUID()

  // Protect with internal API key or admin session
  const authHeader = request.headers.get("x-internal-key")
  const internalKey = process.env['INTERNAL_API_KEY']

  if (internalKey && authHeader === internalKey) {
    // Internal key auth — proceed
  } else {
    // Fall back to admin session check
    const { getSession, isAdminRole } = await import("@/lib/auth-server")
    const session = await getSession()
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required" }, correlationId },
        { status: 401 },
      )
    }
  }

  // Collect pass/fail checks only
  const checks: { name: string; pass: boolean }[] = []

  checks.push({ name: "jwt_configured", pass: !!process.env['JWT_SECRET'] && (process.env['JWT_SECRET']?.length ?? 0) >= 32 })
  checks.push({ name: "supabase_url", pass: !!process.env['NEXT_PUBLIC_SUPABASE_URL'] })
  checks.push({ name: "supabase_service_key", pass: !!process.env['SUPABASE_SERVICE_ROLE_KEY'] })
  checks.push({ name: "app_url", pass: !!process.env['NEXT_PUBLIC_APP_URL'] || process.env['NODE_ENV'] !== 'production' })

  const allPassed = checks.every((c) => c.pass)

  return NextResponse.json({
    status: allPassed ? "pass" : "fail",
    correlationId,
    timestamp: new Date().toISOString(),
    checks,
  })
}
