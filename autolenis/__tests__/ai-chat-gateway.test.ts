import { describe, expect, it } from "vitest"
import {
  classifyError,
  generateDebugId,
  buildErrorResponse,
  buildStreamErrorEvent,
  type AiErrorCode,
} from "@/lib/ai/error-classifier"

// =========================================================================
// Debug ID Generation
// =========================================================================

describe("generateDebugId", () => {
  it("generates an ID without client trace", () => {
    const id = generateDebugId()
    expect(id).toMatch(/^ai_[a-f0-9-]+/)
  })

  it("prefixes with client trace when provided", () => {
    const id = generateDebugId("my-trace-123")
    expect(id).toMatch(/^my-trace-123_[a-f0-9-]+/)
  })

  it("truncates long client trace IDs", () => {
    const longTrace = "a".repeat(50)
    const id = generateDebugId(longTrace)
    // Client trace portion should be at most 20 chars
    const prefix = id.split("_")[0]
    expect(prefix.length).toBeLessThanOrEqual(20)
  })

  it("strips newlines and control characters to prevent log injection", () => {
    const malicious = "trace\nFAKE_LOG_ENTRY\r\n[INJECTED]"
    const id = generateDebugId(malicious)
    expect(id).not.toContain("\n")
    expect(id).not.toContain("\r")
    // Brackets and spaces are stripped; underscores and alphanumerics are preserved
    expect(id).toMatch(/^traceFAKE_LOG_ENTRYI_[a-f0-9-]+/)
  })

  it("strips special characters to prevent format string attacks", () => {
    const malicious = "trace%s%d%x$(cmd)"
    const id = generateDebugId(malicious)
    expect(id).not.toContain("%")
    expect(id).not.toContain("$")
    expect(id).not.toContain("(")
    expect(id).toMatch(/^tracesdxcmd_[a-f0-9-]+/)
  })

  it("falls back to ai_ prefix when trace ID is only special characters", () => {
    const id = generateDebugId("\n\r\t%$")
    expect(id).toMatch(/^ai_[a-f0-9-]+/)
  })
})

// =========================================================================
// Error Classification
// =========================================================================

describe("classifyError", () => {
  it("classifies timeout errors", () => {
    expect(classifyError(new Error("Request timed out"))).toBe("TIMEOUT")
    expect(classifyError(new Error("Operation timeout exceeded"))).toBe("TIMEOUT")
    expect(classifyError(new Error("The request was aborted"))).toBe("TIMEOUT")
    expect(classifyError(new Error("Deadline exceeded for API call"))).toBe("TIMEOUT")
  })

  it("classifies rate limit errors", () => {
    expect(classifyError(new Error("Rate limit exceeded"))).toBe("RATE_LIMITED")
    expect(classifyError(new Error("HTTP 429: Too Many Requests"))).toBe("RATE_LIMITED")
    expect(classifyError(new Error("API quota exhausted"))).toBe("RATE_LIMITED")
  })

  it("classifies provider errors", () => {
    expect(classifyError(new Error("Invalid API key"))).toBe("PROVIDER_UNAVAILABLE")
    expect(classifyError(new Error("Google Generative AI error"))).toBe("PROVIDER_UNAVAILABLE")
    expect(classifyError(new Error("Model not found: gemini-pro"))).toBe("PROVIDER_UNAVAILABLE")
    expect(classifyError(new Error("api_key is invalid"))).toBe("PROVIDER_UNAVAILABLE")
  })

  it("classifies auth errors", () => {
    expect(classifyError(new Error("Unauthorized access"))).toBe("AUTH_REQUIRED")
    expect(classifyError(new Error("HTTP 401"))).toBe("AUTH_REQUIRED")
  })

  it("classifies forbidden errors", () => {
    expect(classifyError(new Error("Forbidden resource"))).toBe("FORBIDDEN")
    expect(classifyError(new Error("HTTP 403"))).toBe("FORBIDDEN")
  })

  it("defaults to INTERNAL_ERROR for unknown errors", () => {
    expect(classifyError(new Error("Something weird happened"))).toBe("INTERNAL_ERROR")
    expect(classifyError("string error")).toBe("INTERNAL_ERROR")
    expect(classifyError(null)).toBe("INTERNAL_ERROR")
    expect(classifyError(undefined)).toBe("INTERNAL_ERROR")
    expect(classifyError(42)).toBe("INTERNAL_ERROR")
  })
})

// =========================================================================
// Error Response Builder
// =========================================================================

describe("buildErrorResponse", () => {
  it("returns correct HTTP status for each error code", async () => {
    const codeToStatus: Record<AiErrorCode, number> = {
      AI_DISABLED: 503,
      AUTH_REQUIRED: 401,
      FORBIDDEN: 403,
      VALIDATION_ERROR: 400,
      PROVIDER_UNAVAILABLE: 503,
      TIMEOUT: 504,
      RATE_LIMITED: 429,
      INTERNAL_ERROR: 500,
    }

    for (const [code, expectedStatus] of Object.entries(codeToStatus)) {
      const res = buildErrorResponse(code as AiErrorCode, "test-debug-id")
      expect(res.status).toBe(expectedStatus)
    }
  })

  it("returns structured error envelope", async () => {
    const res = buildErrorResponse("TIMEOUT", "dbg-123")
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe("TIMEOUT")
    expect(body.error.debugId).toBe("dbg-123")
    expect(body.error.userMessage).toBeTruthy()
    expect(body.error.userMessage).not.toContain("connectivity issues")
  })

  it("uses override message when provided", async () => {
    const res = buildErrorResponse("INTERNAL_ERROR", "dbg-456", "Custom error message")
    const body = await res.json()
    expect(body.error.userMessage).toBe("Custom error message")
  })

  it("sets Content-Type to application/json", () => {
    const res = buildErrorResponse("INTERNAL_ERROR", "dbg-789")
    expect(res.headers.get("Content-Type")).toBe("application/json")
  })
})

// =========================================================================
// Stream Error Event Builder
// =========================================================================

describe("buildStreamErrorEvent", () => {
  it("returns a valid SSE event string", () => {
    const event = buildStreamErrorEvent("PROVIDER_UNAVAILABLE", "dbg-stream")
    expect(event).toMatch(/^data: /)
    expect(event).toMatch(/\n\n$/)
  })

  it("contains structured error in the payload", () => {
    const event = buildStreamErrorEvent("TIMEOUT", "dbg-stream-2")
    const jsonStr = event.replace("data: ", "").trim()
    const parsed = JSON.parse(jsonStr)
    expect(parsed.type).toBe("error")
    expect(parsed.error.code).toBe("TIMEOUT")
    expect(parsed.error.debugId).toBe("dbg-stream-2")
    expect(parsed.error.userMessage).toBeTruthy()
  })

  it("never contains generic connectivity message", () => {
    const codes: AiErrorCode[] = [
      "AI_DISABLED", "AUTH_REQUIRED", "FORBIDDEN", "VALIDATION_ERROR",
      "PROVIDER_UNAVAILABLE", "TIMEOUT", "RATE_LIMITED", "INTERNAL_ERROR",
    ]
    for (const code of codes) {
      const event = buildStreamErrorEvent(code, "test")
      expect(event).not.toContain("connectivity issues")
    }
  })
})

// =========================================================================
// RBAC: Role-based error handling validation
// =========================================================================

describe("RBAC error classification", () => {
  it("all error codes have non-generic user messages", async () => {
    const codes: AiErrorCode[] = [
      "AI_DISABLED", "AUTH_REQUIRED", "FORBIDDEN", "VALIDATION_ERROR",
      "PROVIDER_UNAVAILABLE", "TIMEOUT", "RATE_LIMITED", "INTERNAL_ERROR",
    ]
    for (const code of codes) {
      const res = buildErrorResponse(code, "rbac-test")
      const body = await res.json()
      expect(body.error.userMessage).toBeTruthy()
      expect(body.error.userMessage).not.toBe("I'm experiencing connectivity issues. Please try again.")
      expect(body.error.userMessage.length).toBeGreaterThan(10)
    }
  })
})
