import { NextResponse } from "next/server"

/**
 * Handles errors thrown in API route handlers.
 * 
 * When `requireAuth` rejects with statusCode 401 or 403,
 * this helper surfaces the correct HTTP status instead of
 * a blanket 500.
 *
 * Usage (inside a catch block):
 *   return handleRouteError(error, "Failed to load dashboard")
 */
export function handleRouteError(
  error: unknown,
  fallbackMessage = "Internal server error",
  fallbackStatus = 500,
): NextResponse {
  const err = error as { statusCode?: number; message?: string }

  const status =
    typeof err?.statusCode === "number" && [401, 403, 404, 409].includes(err.statusCode)
      ? err.statusCode
      : fallbackStatus

  const code =
    status === 401
      ? "UNAUTHORIZED"
      : status === 403
        ? "FORBIDDEN"
        : status === 404
          ? "NOT_FOUND"
          : status === 409
            ? "CONFLICT"
            : "INTERNAL_ERROR"

  const message =
    status === 401
      ? "Not authenticated"
      : status === 403
        ? "Forbidden"
        : err?.message && status !== 500
          ? err.message
          : fallbackMessage

  return NextResponse.json(
    { error: { code, message } },
    { status },
  )
}
