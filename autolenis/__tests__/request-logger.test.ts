import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { requestLogger } from "@/lib/middleware/request-logger"

function makeRequest(path: string, options?: { method?: string; headers?: Record<string, string> }): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method: options?.method ?? "GET",
    headers: options?.headers,
  })
}

describe("requestLogger", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it("logs structured JSON for a successful request", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }, { status: 200 }))
    const wrapped = requestLogger(handler)

    const request = makeRequest("/api/test")
    const response = await wrapped(request)

    expect(response.status).toBe(200)
    expect(consoleSpy).toHaveBeenCalledOnce()

    const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(logged).toMatchObject({
      level: "info",
      method: "GET",
      path: "/api/test",
      statusCode: 200,
    })
    expect(logged.correlationId).toBeDefined()
    expect(logged.durationMs).toBeGreaterThanOrEqual(0)
    expect(logged.timestamp).toBeDefined()
  })

  it("attaches correlationId to response header", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const wrapped = requestLogger(handler)

    const response = await wrapped(makeRequest("/api/test"))
    expect(response.headers.get("x-correlation-id")).toBeTruthy()
  })

  it("reuses correlationId from request header if present", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const wrapped = requestLogger(handler)

    const request = makeRequest("/api/test", {
      headers: { "x-correlation-id": "custom-id-123" },
    })
    const response = await wrapped(request)

    expect(response.headers.get("x-correlation-id")).toBe("custom-id-123")

    const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(logged.correlationId).toBe("custom-id-123")
  })

  it("logs userId when x-user-id header is present", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const wrapped = requestLogger(handler)

    const request = makeRequest("/api/test", {
      headers: { "x-user-id": "user-abc" },
    })
    await wrapped(request)

    const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(logged.userId).toBe("user-abc")
  })

  it("logs warn level for 4xx responses", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ error: "bad" }, { status: 400 }))
    const wrapped = requestLogger(handler)

    await wrapped(makeRequest("/api/test"))

    const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(logged.level).toBe("warn")
    expect(logged.statusCode).toBe(400)
  })

  it("logs error level for 5xx responses", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ error: "fail" }, { status: 500 }))
    const wrapped = requestLogger(handler)

    await wrapped(makeRequest("/api/test"))

    const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(logged.level).toBe("error")
    expect(logged.statusCode).toBe(500)
  })

  it("catches handler exceptions and returns 500 with correlationId", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("boom"))
    const wrapped = requestLogger(handler)

    const response = await wrapped(makeRequest("/api/test"))

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.correlationId).toBeDefined()
    expect(body.error.code).toBe("INTERNAL_ERROR")

    const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(logged.level).toBe("error")
    expect(logged.error).toMatchObject({ name: "Error", message: "boom" })
  })

  it("skips logging for configured skipPaths", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const wrapped = requestLogger(handler, { skipPaths: ["/api/health"] })

    await wrapped(makeRequest("/api/health"))

    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it("respects log level configuration", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }, { status: 200 }))
    const wrapped = requestLogger(handler, { level: "warn" })

    await wrapped(makeRequest("/api/test"))

    // info-level log should be suppressed when level is "warn"
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it("redacts sensitive headers in debug mode", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }))
    const wrapped = requestLogger(handler, { level: "debug" })

    const request = makeRequest("/api/test", {
      headers: {
        authorization: "Bearer secret-token",
        "content-type": "application/json",
      },
    })
    await wrapped(request)

    const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(logged.headers).toBeDefined()
    expect(logged.headers.authorization).toBe("[REDACTED]")
    expect(logged.headers["content-type"]).toBe("application/json")
  })
})
