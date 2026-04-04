/**
 * Client-side CSRF utilities
 *
 * Reads the csrf_token cookie (set by the server middleware) and returns
 * the value so callers can include it as the `x-csrf-token` header on
 * state-changing requests (POST, PUT, PATCH, DELETE).
 */

const CSRF_COOKIE_NAME = "csrf_token"
const CSRF_HEADER_NAME = "x-csrf-token"

/**
 * Read the CSRF token from the browser cookie jar.
 * Returns undefined when running server-side or when the cookie is absent.
 */
export function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined

  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))

  return match ? match.split("=")[1] : undefined
}

/**
 * Build a headers object that includes the CSRF token (if available).
 * Merges with any additional headers the caller supplies.
 *
 * Usage:
 *   fetch("/api/contact", { method: "POST", headers: csrfHeaders(), body })
 *   fetch("/api/foo", { method: "PUT", headers: csrfHeaders({ Authorization: "Bearer …" }), body })
 */
export function csrfHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getCsrfToken()
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extra }
  if (token) {
    headers[CSRF_HEADER_NAME] = token
  }
  return headers
}
