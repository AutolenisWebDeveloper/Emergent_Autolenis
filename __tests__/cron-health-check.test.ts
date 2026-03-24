/**
 * Cron Route: /api/cron/health-check — unit tests
 *
 * Tests security validation, lock acquisition, health check execution,
 * incident creation on failure, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Hoisted mocks ────────────────────────────────────────────────────────

const {
  mockValidateCronRequest,
  mockAcquireCronLock,
  mockRecordHealthCheckAsync,
  mockGetLatestHealthChecks,
  mockOpenIncidentAsync,
  mockFrom,
} = vi.hoisted(() => {
  const mockValidateCronRequest = vi.fn().mockResolvedValue(null)
  const mockAcquireCronLock = vi.fn().mockResolvedValue(false)
  const mockRecordHealthCheckAsync = vi.fn().mockResolvedValue({
    id: "hc-1",
    checkKey: "database_connectivity",
    status: "PASS",
  })
  const mockGetLatestHealthChecks = vi.fn().mockResolvedValue([])
  const mockOpenIncidentAsync = vi.fn().mockResolvedValue({ id: "inc-1" })
  const mockFrom = vi.fn()
  return {
    mockValidateCronRequest,
    mockAcquireCronLock,
    mockRecordHealthCheckAsync,
    mockGetLatestHealthChecks,
    mockOpenIncidentAsync,
    mockFrom,
  }
})

// ── Module mocks ─────────────────────────────────────────────────────────

vi.mock("@/lib/middleware/cron-security", () => ({
  validateCronRequest: mockValidateCronRequest,
  acquireCronLock: mockAcquireCronLock,
}))

vi.mock("@/lib/services/system/ops.service", () => ({
  recordHealthCheckAsync: mockRecordHealthCheckAsync,
  getLatestHealthChecks: mockGetLatestHealthChecks,
  openIncidentAsync: mockOpenIncidentAsync,
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock("@/lib/db", () => ({
  getSupabase: vi.fn().mockReturnValue({
    from: mockFrom,
  }),
}))

// ── Imports ──────────────────────────────────────────────────────────────

import { GET } from "@/app/api/cron/health-check/route"
import { NextRequest } from "next/server"

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/health-check", {
    method: "GET",
    headers: { authorization: "Bearer test-cron-secret" },
  })
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("Health Check Cron Route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateCronRequest.mockResolvedValue(null)
    mockAcquireCronLock.mockResolvedValue(false)

    // Default: DB probe succeeds
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [{ id: "1" }], error: null }),
      }),
    })
  })

  it("runs health checks and returns results", async () => {
    mockGetLatestHealthChecks.mockResolvedValue([
      { checkKey: "database_connectivity", status: "PASS" },
    ])

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.correlationId).toBeDefined()
    expect(body.checks).toBeDefined()
    expect(body.checks.length).toBeGreaterThanOrEqual(2)
    expect(body.checks[0].checkKey).toBe("database_connectivity")
    expect(body.checks[0].status).toBe("PASS")
  })

  it("records health checks via ops service", async () => {
    await GET(makeRequest())

    expect(mockRecordHealthCheckAsync).toHaveBeenCalled()
    const firstCall = mockRecordHealthCheckAsync.mock.calls[0][0]
    expect(firstCall.checkKey).toBe("database_connectivity")
    expect(firstCall.status).toBe("PASS")
  })

  it("skips when already ran in window", async () => {
    mockAcquireCronLock.mockResolvedValue(true)

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.skipped).toBe(true)
    expect(body.reason).toBe("already ran in this window")
    expect(mockRecordHealthCheckAsync).not.toHaveBeenCalled()
  })

  it("returns security check response when auth fails", async () => {
    const { NextResponse } = await import("next/server")
    mockValidateCronRequest.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    )

    const response = await GET(makeRequest())

    expect(response.status).toBe(401)
    expect(mockRecordHealthCheckAsync).not.toHaveBeenCalled()
  })

  it("returns 500 on unexpected error", async () => {
    mockValidateCronRequest.mockRejectedValue(new Error("boom"))

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe("CRON_JOB_FAILED")
    expect(body.correlationId).toBeDefined()
  })

  it("opens incident when database probe fails", async () => {
    // Simulate DB probe failure
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: null, error: { message: "connection refused" } }),
      }),
    })

    await GET(makeRequest())

    // Should record a FAIL health check
    const failCall = mockRecordHealthCheckAsync.mock.calls.find(
      (c: any[]) => c[0].checkKey === "database_connectivity" && c[0].status === "FAIL",
    )
    expect(failCall).toBeDefined()

    // Should open an incident for the failure
    expect(mockOpenIncidentAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentKey: "health_database_connectivity",
        severity: "HIGH",
      }),
    )
  })
})
