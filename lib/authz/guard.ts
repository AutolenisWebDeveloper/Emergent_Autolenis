/**
 * Standardized API Auth Guard for AutoLenis
 *
 * Usage in API route handlers:
 *   const ctx = await withAuth(request, { roles: ADMIN_ROLES })
 *   if (ctx instanceof NextResponse) return ctx  // error response
 *   // ctx.userId, ctx.role, etc. are now available
 *
 * For internal-only endpoints:
 *   if (!requireInternalRequest(request)) {
 *     return unauthorizedResponse()
 *   }
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getSession } from "@/lib/auth-server"
import { validateCsrf } from "@/lib/middleware/csrf"
import { isAdminRole } from "@/lib/authz/roles"
import { logger } from "@/lib/logger"
import { supabase } from "@/lib/db"

export interface AuthContext {
  userId: string
  email: string
  role: string
  workspaceId?: string
  sessionVersion?: number
  correlationId: string
  /** The route path this auth context was created for (when provided). */
  routePath?: string
}

export interface GuardOptions {
  /** Allowed roles. If omitted any authenticated user is allowed. */
  roles?: readonly string[]
  /** Require email-verified flag (default: false — enforced at sign-in) */
  requireVerifiedEmail?: boolean
  /** Require MFA verified (admin endpoints) */
  requireMfa?: boolean
  /** Validate CSRF token (default: true for state-changing methods) */
  csrf?: boolean
  /** Allow internal-secret mode as alternative to session auth */
  allowInternal?: boolean
  /** Require workspace context */
  requireWorkspace?: boolean
  /**
   * Verify session_version in the JWT against the DB value.
   * Use on security-sensitive endpoints (password change, MFA toggle, role
   * elevation) to reject stale sessions that were issued before the most
   * recent security event.  Adds one DB round-trip.
   */
  requireSessionVersion?: boolean
  /** Audit action name for logging */
  auditAction?: string
  /** Optional route path for correlation/audit metadata */
  routePath?: string
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/** Standard 401 Unauthenticated JSON response */
export function unauthorizedResponse(correlationId?: string): NextResponse {
  const cid = correlationId ?? crypto.randomUUID()
  return NextResponse.json(
    { error: { code: "UNAUTHENTICATED", message: "Authentication required" }, correlationId: cid },
    { status: 401 },
  )
}

/** Standard 403 Forbidden JSON response */
export function forbiddenResponse(correlationId?: string): NextResponse {
  const cid = correlationId ?? crypto.randomUUID()
  return NextResponse.json(
    { error: { code: "FORBIDDEN", message: "Insufficient permissions" }, correlationId: cid },
    { status: 403 },
  )
}

// ---------------------------------------------------------------------------
// Internal-request validation
// ---------------------------------------------------------------------------

/**
 * Validate that the request carries a valid internal API key header.
 * Returns true if the request is authenticated as internal, false otherwise.
 *
 * Usage:
 *   if (!requireInternalRequest(request)) {
 *     // fall back to normal auth or reject
 *   }
 */
export function requireInternalRequest(request: NextRequest, _config?: { headerName?: string }): boolean {
  const headerName = _config?.headerName ?? "x-internal-key"
  const internalKey = process.env['INTERNAL_API_KEY']
  if (!internalKey) return false

  const provided = request.headers.get(headerName)
  return !!provided && provided === internalKey
}

// ---------------------------------------------------------------------------
// Main guard
// ---------------------------------------------------------------------------

/**
 * Authenticate + authorize an API request.
 *
 * Returns an AuthContext on success, or a NextResponse error on failure.
 */
export async function withAuth(
  _request: NextRequest,
  options: GuardOptions = {},
): Promise<AuthContext | NextResponse> {
  const correlationId = crypto.randomUUID()

  // 0. Allow internal-secret fallback if configured
  if (options.allowInternal && requireInternalRequest(_request)) {
    return {
      userId: "internal",
      email: "internal@system",
      role: "SYSTEM_AGENT",
      correlationId,
    }
  }

  // 1. CSRF check (for state-changing cookie-auth requests)
  if (options.csrf !== false) {
    const csrfError = validateCsrf(_request)
    if (csrfError) {
      return NextResponse.json(
        { error: { code: "CSRF_INVALID", message: csrfError }, correlationId },
        { status: 403 },
      )
    }
  }

  // 2. Authenticate
  let session
  try {
    session = await getSession()
  } catch {
    session = null
  }

  if (!session) {
    return unauthorizedResponse(correlationId)
  }

  // 3. Role check
  if (options.roles && options.roles.length > 0) {
    if (!options.roles.includes(session.role)) {
      logger.warn("Forbidden: role mismatch", {
        userId: session.userId,
        role: session.role,
        required: options.roles,
        correlationId,
        routePath: options.routePath,
      })
      return forbiddenResponse(correlationId)
    }
  }

  // 4. MFA check for admin endpoints
  if (options.requireMfa && isAdminRole(session.role)) {
    if (!session.mfa_verified) {
      logger.warn("Forbidden: MFA not verified for admin endpoint", {
        userId: session.userId,
        role: session.role,
        correlationId,
        routePath: options.routePath,
      })
      return NextResponse.json(
        { error: { code: "MFA_REQUIRED", message: "MFA verification required" }, correlationId },
        { status: 403 },
      )
    }
  }

  // 4b. Session-version freshness check (opt-in, adds 1 DB round-trip)
  //     Uses the admin Supabase client intentionally — we need to read the
  //     User.session_version for any authenticated user regardless of RLS.
  if (options.requireSessionVersion) {
    try {
      const { data: user } = await supabase
        .from("User")
        .select("session_version")
        .eq("id", session.userId)
        .single()

      const dbVersion = user?.session_version ?? 0
      const tokenVersion = session.session_version ?? 0

      if (tokenVersion < dbVersion) {
        logger.warn("Session version stale — possible reuse after credential change", {
          userId: session.userId,
          tokenVersion,
          dbVersion,
          correlationId,
        })
        return NextResponse.json(
          { error: { code: "SESSION_STALE", message: "Session has been superseded. Please sign in again." }, correlationId },
          { status: 401 },
        )
      }
    } catch (err) {
      // If the DB check fails, log but don't block — degrade gracefully
      logger.error("Session-version DB check failed", { userId: session.userId, correlationId, error: err })
    }
  }

  // 5. Workspace check
  if (options.requireWorkspace && !session.workspace_id) {
    return NextResponse.json(
      { error: { code: "NO_WORKSPACE", message: "Workspace context required" }, correlationId },
      { status: 403 },
    )
  }

  // 6. Audit logging
  if (options.auditAction) {
    logger.info("Guard audit", {
      action: options.auditAction,
      userId: session.userId,
      role: session.role,
      correlationId,
    })
  }

  return {
    userId: session.userId,
    email: session.email,
    role: session.role,
    workspaceId: session.workspace_id,
    sessionVersion: session.session_version,
    correlationId,
    routePath: options.routePath,
  }
}

// ─── Convenience role constants ─────────────────────────────────────────────
//
// These constants intentionally include ADMIN / SUPER_ADMIN so that admin
// users can access dealer and buyer endpoints for oversight.  They are
// **different** from the pure-group constants in `lib/authz/roles.ts` which
// contain only the group's own roles.
//
// Import these from guard.ts when you need "role or admin" access control.
// Import from roles.ts when you need strict role-group membership.

/** Roles allowed to access admin-level endpoints */
export const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const

/**
 * Roles allowed to access dealer-level endpoints.
 * Includes ADMIN / SUPER_ADMIN for admin oversight access.
 */
export const DEALER_ROLES = ["DEALER", "DEALER_USER", "ADMIN", "SUPER_ADMIN"] as const

/**
 * Roles allowed to access buyer-level endpoints.
 * Includes ADMIN / SUPER_ADMIN for admin oversight access.
 */
export const BUYER_ROLES = ["BUYER", "ADMIN", "SUPER_ADMIN"] as const
