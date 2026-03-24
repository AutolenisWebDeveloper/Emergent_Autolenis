/**
 * API Route: /api/health/db — unit tests
 *
 * Tests auth gating (admin role / internal key), env-var validation,
 * canary table query success/failure paths, and error contract shape.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Hoisted mocks ────────────────────────────────────────────────────────

const { mockRequireInternalRequest, mockWithAuth, mockFetch } = vi.hoisted(() => {
  const mockRequireInternalRequest = vi.fn().mockReturnValue(false)
  const mockWithAuth = vi.fn()
  const mockFetch = vi.fn()
  return { mockRequireInternalRequest, mockWithAuth, mockFetch }
})

// ── Module mocks ─────────────────────────────────────────────────────────

vi.mock("@/lib/authz/guard", () => ({
  requireInternalRequest: mockRequireInternalRequest,
  withAuth: mockWithAuth,
}))

vi.mock("@/lib/authz/roles", () => ({
  ADMIN_ROLES: ["ADMIN", "SUPER_ADMIN", "COMPLIANCE_ADMIN"],
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

// ── Imports ──────────────────────────────────────────────────────────────

import { GET } from "@/app/api/health/db/route"
import { NextRequest, NextResponse } from "next/server"

// ── Helpers ──────────────────────────────────────────────────────────────

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/health/db", {
    method: "GET",
    headers,
  })
}

/** Stub a successful Supabase canary fetch. */
function mockCanarySuccess(): void {
  mockFetch.mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue([{ id: 1 }]),
  })
}

/** Stub a failed fetch (canary table missing). */
function mockCanaryMissing(): void {
  mockFetch.mockResolvedValue({
    ok: false,
    json: vi.fn().mockResolvedValue({ code: "42P01", message: "relation does not exist" }),
  })
}

/** Stub a generic DB error. */
function mockCanaryDbError(): void {
  mockFetch.mockResolvedValue({
    ok: false,
    json: vi.fn().mockResolvedValue({ code: "500", message: "Internal server error" }),
  })
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("GET /api/health/db", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: internal key auth fails, withAuth returns a valid admin context
    mockRequireInternalRequest.mockReturnValue(false)
    mockWithAuth.mockResolvedValue({
      userId: "admin-1",
      email: "admin@autolenis.com",
      role: "ADMIN",
      correlationId: "test-correlation-id",
    })

    // Default env vars present
    process.env["NEXT_PUBLIC_SUPABASE_URL"] = "https://test-project.supabase.co"
    process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key"

    // Inject global fetch mock
    global.fetch = mockFetch as unknown as typeof fetch
  })

  // ── Auth gating ──────────────────────────────────────────────────────

  it("allows requests with a valid internal key (bypasses session auth)", async () => {
    mockRequireInternalRequest.mockReturnValue(true)
    mockCanarySuccess()

    const response = await GET(makeRequest({ "x-internal-key": "internal-key" }))

    expect(response.status).toBe(200)
    // withAuth should NOT be called when internal key is accepted
    expect(mockWithAuth).not.toHaveBeenCalled()
  })

  it("allows requests with a valid admin session", async () => {
    mockRequireInternalRequest.mockReturnValue(false)
    mockCanarySuccess()

    const response = await GET(makeRequest())

    expect(response.status).toBe(200)
    expect(mockWithAuth).toHaveBeenCalledOnce()
  })

  it("returns 401 when not internal and auth fails", async () => {
    mockRequireInternalRequest.mockReturnValue(false)
    mockWithAuth.mockResolvedValue(
      NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required" }, correlationId: "cid" },
        { status: 401 },
      ),
    )

    const response = await GET(makeRequest())

    expect(response.status).toBe(401)
  })

  it("returns 403 when session role is insufficient", async () => {
    mockRequireInternalRequest.mockReturnValue(false)
    mockWithAuth.mockResolvedValue(
      NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient role" }, correlationId: "cid" },
        { status: 403 },
      ),
    )

    const response = await GET(makeRequest())

    expect(response.status).toBe(403)
  })

  // ── Env-var validation ───────────────────────────────────────────────

  it("returns 503 when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    mockRequireInternalRequest.mockReturnValue(true)
    delete process.env["NEXT_PUBLIC_SUPABASE_URL"]

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.ok).toBe(false)
    expect(body.correlationId).toBeDefined()
    expect(body.timestamp).toBeDefined()
  })

  it("returns 503 when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    mockRequireInternalRequest.mockReturnValue(true)
    delete process.env["SUPABASE_SERVICE_ROLE_KEY"]

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.ok).toBe(false)
  })

  // ── Canary query — success path ──────────────────────────────────────

  it("returns 200 with ok:true and standard fields when canary query succeeds", async () => {
    mockRequireInternalRequest.mockReturnValue(true)
    mockCanarySuccess()

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(typeof body.latencyMs).toBe("number")
    expect(body.latencyMs).toBeGreaterThanOrEqual(0)
    expect(body.correlationId).toBeDefined()
    expect(body.timestamp).toBeDefined()
    // Must NOT expose service role key or project ref
    expect(body.serviceRoleKey).toBeUndefined()
    expect(body.projectRef).toBeUndefined()
  })

  it("calls Supabase REST endpoint with service-role credentials", async () => {
    mockRequireInternalRequest.mockReturnValue(true)
    mockCanarySuccess()

    await GET(makeRequest())

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }]
    expect(url).toContain("https://test-project.supabase.co/rest/v1/_connection_canary")
    expect(url).toContain("select=id")
    expect(options.headers["apikey"]).toBe("test-service-role-key")
    expect(options.headers["Authorization"]).toBe("Bearer test-service-role-key")
  })

  // ── Canary query — failure paths ─────────────────────────────────────

  it("returns 503 with 'Canary table not found' when table does not exist (pg error 42P01)", async () => {
    mockRequireInternalRequest.mockReturnValue(true)
    mockCanaryMissing()

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.ok).toBe(false)
    expect(body.error).toBe("Canary table not found")
    expect(body.latencyMs).toBeDefined()
    expect(body.correlationId).toBeDefined()
  })

  it("returns 503 with 'Canary table not found' when message contains 'does not exist'", async () => {
    mockRequireInternalRequest.mockReturnValue(true)
    mockFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ code: "PGRST116", message: "table does not exist" }),
    })

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toBe("Canary table not found")
  })

  it("returns 503 with 'Database query failed' on generic DB error", async () => {
    mockRequireInternalRequest.mockReturnValue(true)
    mockCanaryDbError()

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.ok).toBe(false)
    expect(body.error).toBe("Database query failed")
    expect(body.latencyMs).toBeDefined()
  })

  // ── Error contract ───────────────────────────────────────────────────

  it("returns 500 with standard error shape when fetch throws unexpectedly", async () => {
    mockRequireInternalRequest.mockReturnValue(true)
    mockFetch.mockRejectedValue(new Error("network failure"))

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.ok).toBe(false)
    expect(body.error).toBe("Internal server error")
    expect(body.correlationId).toBeDefined()
    expect(body.timestamp).toBeDefined()
  })

  it("never exposes sensitive fields in any response path", async () => {
    mockRequireInternalRequest.mockReturnValue(true)

    // Test all failure paths for information leakage
    const scenarios = [
      () => { delete process.env["NEXT_PUBLIC_SUPABASE_URL"]; },
      () => { mockFetch.mockResolvedValue({ ok: false, json: vi.fn().mockResolvedValue({ code: "42P01", message: "" }) }) },
      () => { mockFetch.mockRejectedValue(new Error("timeout")) },
    ]

    for (const setup of scenarios) {
      vi.clearAllMocks()
      process.env["NEXT_PUBLIC_SUPABASE_URL"] = "https://test-project.supabase.co"
      process.env["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-role-key"
      mockRequireInternalRequest.mockReturnValue(true)
      global.fetch = mockFetch as unknown as typeof fetch
      setup()

      const response = await GET(makeRequest())
      const body = await response.json()

      expect(body.serviceRoleKey).toBeUndefined()
      expect(body.projectRef).toBeUndefined()
      expect(JSON.stringify(body)).not.toContain("test-service-role-key")
    }
  })
})
