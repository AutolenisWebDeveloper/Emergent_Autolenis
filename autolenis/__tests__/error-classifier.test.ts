import { describe, it, expect } from "vitest"
import {
  classifyError,
  generateDebugId,
  buildErrorResponse,
  buildStreamErrorEvent,
} from "@/lib/ai/error-classifier"

describe("classifyError", () => {
  it("classifies timeout errors", () => {
    expect(classifyError(new Error("Request timed out"))).toBe("TIMEOUT")
    expect(classifyError(new Error("Orchestration timed out"))).toBe("TIMEOUT")
    expect(classifyError(new Error("Operation aborted"))).toBe("TIMEOUT")
    expect(classifyError(new Error("deadline exceeded"))).toBe("TIMEOUT")
  })

  it("classifies rate limit errors", () => {
    expect(classifyError(new Error("rate limit exceeded"))).toBe("RATE_LIMITED")
    expect(classifyError(new Error("429 Too Many Requests"))).toBe("RATE_LIMITED")
    expect(classifyError(new Error("quota exceeded"))).toBe("RATE_LIMITED")
  })

  it("classifies provider errors", () => {
    expect(classifyError(new Error("invalid api key"))).toBe("PROVIDER_UNAVAILABLE")
    expect(classifyError(new Error("Invalid API_KEY"))).toBe("PROVIDER_UNAVAILABLE")
    expect(classifyError(new Error("google generative error"))).toBe("PROVIDER_UNAVAILABLE")
    expect(classifyError(new Error("model not found"))).toBe("PROVIDER_UNAVAILABLE")
  })

  it("classifies auth errors", () => {
    expect(classifyError(new Error("unauthorized"))).toBe("AUTH_REQUIRED")
    expect(classifyError(new Error("401 Unauthorized"))).toBe("AUTH_REQUIRED")
  })

  it("classifies forbidden errors", () => {
    expect(classifyError(new Error("forbidden"))).toBe("FORBIDDEN")
    expect(classifyError(new Error("403 Forbidden"))).toBe("FORBIDDEN")
  })

  it("classifies unknown errors as INTERNAL_ERROR", () => {
    expect(classifyError(new Error("something broke"))).toBe("INTERNAL_ERROR")
    expect(classifyError("string error")).toBe("INTERNAL_ERROR")
    expect(classifyError(null)).toBe("INTERNAL_ERROR")
    expect(classifyError(undefined)).toBe("INTERNAL_ERROR")
  })
})

describe("generateDebugId", () => {
  it("generates a debug ID without client trace ID", () => {
    const id = generateDebugId()
    expect(id).toMatch(/^ai_/)
  })

  it("incorporates client trace ID", () => {
    const id = generateDebugId("ct_12345")
    expect(id).toMatch(/^ct_12345_/)
  })

  it("sanitizes unsafe characters in client trace ID", () => {
    const id = generateDebugId("ct<script>alert(1)</script>")
    expect(id).not.toContain("<")
    expect(id).not.toContain(">")
  })

  it("falls back to ai_ prefix for empty sanitized trace ID", () => {
    const id = generateDebugId("!!!!")
    expect(id).toMatch(/^ai_/)
  })
})

describe("buildErrorResponse", () => {
  it("returns a 403 response for FORBIDDEN errors", async () => {
    const res = buildErrorResponse("FORBIDDEN", "test-debug-id")
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe("FORBIDDEN")
    expect(body.error.userMessage).toBeTruthy()
    expect(body.error.debugId).toBe("test-debug-id")
  })

  it("allows overriding the user message", async () => {
    const res = buildErrorResponse("FORBIDDEN", "dbg", "Custom message")
    const body = await res.json()
    expect(body.error.userMessage).toBe("Custom message")
  })

  it("returns a 401 response for AUTH_REQUIRED errors", async () => {
    const res = buildErrorResponse("AUTH_REQUIRED", "dbg")
    expect(res.status).toBe(401)
  })
})

describe("buildStreamErrorEvent", () => {
  it("produces a valid SSE event string", () => {
    const event = buildStreamErrorEvent("FORBIDDEN", "test-id")
    expect(event).toMatch(/^data: /)
    const parsed = JSON.parse(event.replace("data: ", "").trim())
    expect(parsed.type).toBe("error")
    expect(parsed.error.code).toBe("FORBIDDEN")
    expect(parsed.error.userMessage).toBeTruthy()
    expect(parsed.error.debugId).toBe("test-id")
  })
})
