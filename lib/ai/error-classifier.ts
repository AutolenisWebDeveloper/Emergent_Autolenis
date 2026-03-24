/**
 * AI Error Classifier — maps raw errors to structured, user-facing error
 * responses with classification codes and debug trace IDs.
 *
 * Used by the AI chat gateway to return actionable error messages instead
 * of generic "connectivity issues" text.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a short random hex string (no Node `crypto` import needed). */
function shortId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().slice(0, 12)
  }
  return Math.random().toString(16).slice(2, 14)
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export type AiErrorCode =
  | "AI_DISABLED"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "PROVIDER_UNAVAILABLE"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"

// ---------------------------------------------------------------------------
// Structured error envelope
// ---------------------------------------------------------------------------

export interface AiErrorEnvelope {
  ok: false
  error: {
    code: AiErrorCode
    userMessage: string
    debugId: string
  }
}

// ---------------------------------------------------------------------------
// User-facing messages (never expose internals)
// ---------------------------------------------------------------------------

const USER_MESSAGES: Record<AiErrorCode, string> = {
  AI_DISABLED:
    "The AI assistant is temporarily disabled by an administrator. Please try again later.",
  AUTH_REQUIRED:
    "Your session has expired. Please sign in again to use the AI assistant.",
  FORBIDDEN:
    "You don't have permission to use the AI assistant in this context.",
  VALIDATION_ERROR:
    "Your message couldn't be processed. Please check the input and try again.",
  PROVIDER_UNAVAILABLE:
    "The AI service is temporarily unavailable. Please try again in a moment.",
  TIMEOUT:
    "The AI service took too long to respond. Please try again with a shorter message.",
  RATE_LIMITED:
    "You've sent too many messages. Please wait a moment before trying again.",
  INTERNAL_ERROR:
    "Something went wrong on our end. Please try again or contact support if the issue persists.",
}

// ---------------------------------------------------------------------------
// HTTP status mapping
// ---------------------------------------------------------------------------

const HTTP_STATUS: Record<AiErrorCode, number> = {
  AI_DISABLED: 503,
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  PROVIDER_UNAVAILABLE: 503,
  TIMEOUT: 504,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
}

// ---------------------------------------------------------------------------
// Debug ID generation
// ---------------------------------------------------------------------------

export function generateDebugId(clientTraceId?: string): string {
  const id = shortId()
  if (clientTraceId) {
    // Sanitize user-provided trace ID: allow only alphanumeric, hyphens, underscores
    // to prevent log injection and format string attacks.
    const sanitized = clientTraceId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20)
    return sanitized ? `${sanitized}_${id}` : `ai_${id}`
  }
  return `ai_${id}`
}

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

/**
 * Classify a raw error into a structured error code.
 */
export function classifyError(error: unknown): AiErrorCode {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()

    // Timeout patterns
    if (
      msg.includes("timeout") ||
      msg.includes("timed out") ||
      msg.includes("aborted") ||
      msg.includes("deadline")
    ) {
      return "TIMEOUT"
    }

    // Rate limiting
    if (msg.includes("rate limit") || msg.includes("429") || msg.includes("quota")) {
      return "RATE_LIMITED"
    }

    // Provider errors (Gemini / API key issues)
    if (
      msg.includes("api key") ||
      msg.includes("api_key") ||
      msg.includes("authentication") ||
      msg.includes("invalid key") ||
      msg.includes("generative") ||
      msg.includes("google") ||
      msg.includes("model not found")
    ) {
      return "PROVIDER_UNAVAILABLE"
    }

    // Auth/RBAC
    if (msg.includes("unauthorized") || msg.includes("401")) {
      return "AUTH_REQUIRED"
    }
    if (msg.includes("forbidden") || msg.includes("403")) {
      return "FORBIDDEN"
    }
  }

  return "INTERNAL_ERROR"
}

// ---------------------------------------------------------------------------
// Build error response
// ---------------------------------------------------------------------------

/**
 * Build a structured JSON error response.
 */
export function buildErrorResponse(
  code: AiErrorCode,
  debugId: string,
  overrideMessage?: string,
): Response {
  const body: AiErrorEnvelope = {
    ok: false,
    error: {
      code,
      userMessage: overrideMessage ?? USER_MESSAGES[code],
      debugId,
    },
  }
  return new Response(JSON.stringify(body), {
    status: HTTP_STATUS[code],
    headers: { "Content-Type": "application/json" },
  })
}

/**
 * Build a streaming SSE error event string.
 */
export function buildStreamErrorEvent(
  code: AiErrorCode,
  debugId: string,
  overrideMessage?: string,
): string {
  const payload = {
    type: "error" as const,
    error: {
      code,
      userMessage: overrideMessage ?? USER_MESSAGES[code],
      debugId,
    },
  }
  return `data: ${JSON.stringify(payload)}\n\n`
}
