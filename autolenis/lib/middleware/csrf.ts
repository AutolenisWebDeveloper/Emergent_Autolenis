/**
 * CSRF Protection — Double-Submit Cookie Pattern
 *
 * How it works:
 * 1. A csrf_token cookie (non-HttpOnly, SameSite=Strict) is set on every response.
 * 2. Clients must read the cookie and send its value as the x-csrf-token header on
 *    state-changing requests (POST, PUT, PATCH, DELETE).
 * 3. The server validates that the header matches the cookie.
 *
 * Exemptions:
 * - Webhook endpoints (verified via signature instead)
 * - Cron endpoints (verified via secret)
 * - Bearer-token-only requests (no cookie auth)
 */

import { NextRequest, NextResponse } from "next/server"

const CSRF_COOKIE_NAME = "csrf_token"
const CSRF_HEADER_NAME = "x-csrf-token"
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

// Paths exempt from CSRF (server-to-server with signature verification,
// or unauthenticated auth endpoints where a stale session cookie may exist)
const CSRF_EXEMPT_PREFIXES = [
  "/api/webhooks/",
  "/api/cron/",
  "/api/auth/signin",
  "/api/auth/signup",
  "/api/auth/signout",
  "/api/admin/auth/",
]

/**
 * Generate a cryptographically secure CSRF token (edge-compatible)
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Validate CSRF token on a request.
 * Returns null if valid, or an error message if invalid.
 */
export function validateCsrf(request: NextRequest): string | null {
  // Only validate state-changing methods
  if (!STATE_CHANGING_METHODS.has(request.method)) {
    return null
  }

  // Exempt webhook and cron paths
  const pathname = request.nextUrl.pathname
  if (CSRF_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null
  }

  // Exempt requests that don't use cookie auth (e.g. pure Bearer token)
  const hasSessionCookie = request.cookies.has("session") || request.cookies.has("admin_session")
  if (!hasSessionCookie) {
    return null
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  if (!cookieToken || !headerToken) {
    return "Missing CSRF token"
  }

  // Constant-time comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length) {
    return "Invalid CSRF token"
  }

  // Edge-compatible constant-time comparison
  let mismatch = 0
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i)
  }
  if (mismatch !== 0) {
    return "Invalid CSRF token"
  }

  return null
}

/**
 * Ensure the CSRF cookie is present on a response. If not, set one.
 * Call this from middleware to guarantee the cookie exists for the client to read.
 */
export function ensureCsrfCookie(request: NextRequest, response: NextResponse): NextResponse {
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value
  if (!existing) {
    const token = generateCsrfToken()
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Client JS must be able to read this
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    })
  }
  return response
}
