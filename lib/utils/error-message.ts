/**
 * Safely extracts a displayable error message from an API response `error` field.
 *
 * Handles:
 *  - `string` values (`{ error: "Bad request" }`)
 *  - Object values with a `message` property (`{ error: { code: "X", message: "Y" } }`)
 *  - Nullish / unexpected shapes → returns the provided fallback.
 */
export function extractApiError(error: unknown, fallback: string): string {
  if (typeof error === "string") return error
  if (
    error !== null &&
    error !== undefined &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  ) {
    return (error as Record<string, unknown>).message as string
  }
  return fallback
}
