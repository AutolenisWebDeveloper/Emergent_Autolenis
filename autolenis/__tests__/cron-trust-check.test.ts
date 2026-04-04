/**
 * Cron Route: /api/cron/trust-check — unit tests
 *
 * Tests security validation, lock acquisition, trust flag and compliance
 * case fetching, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Hoisted mocks ────────────────────────────────────────────────────────

const {
  mockValidateCronRequest,
  mockAcquireCronLock,
  mockGetOpenTrustFlags,
  mockGetOpenComplianceCases,
} = vi.hoisted(() => {
  const mockValidateCronRequest = vi.fn().mockResolvedValue(null)
  const mockAcquireCronLock = vi.fn().mockResolvedValue(false)
  const mockGetOpenTrustFlags = vi.fn().mockResolvedValue([])
  const mockGetOpenComplianceCases = vi.fn().mockResolvedValue([])
  return {
    mockValidateCronRequest,
    mockAcquireCronLock,
    mockGetOpenTrustFlags,
    mockGetOpenComplianceCases,
  }
})

// ── Module mocks ─────────────────────────────────────────────────────────

vi.mock("@/lib/middleware/cron-security", () => ({
  validateCronRequest: mockValidateCronRequest,
  acquireCronLock: mockAcquireCronLock,
}))

vi.mock("@/lib/services/trust/trust.service", () => ({
  getOpenTrustFlags: mockGetOpenTrustFlags,
  getOpenComplianceCases: mockGetOpenComplianceCases,
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

// ── Imports ──────────────────────────────────────────────────────────────

import { GET } from "@/app/api/cron/trust-check/route"
import { NextRequest } from "next/server"

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/trust-check", {
    method: "GET",
    headers: { authorization: "Bearer test-cron-secret" },
  })
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("Trust Check Cron Route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateCronRequest.mockResolvedValue(null)
    mockAcquireCronLock.mockResolvedValue(false)
  })

  it("fetches trust flags and compliance cases and returns summary", async () => {
    mockGetOpenTrustFlags
      .mockResolvedValueOnce([{ id: "tf-1", severity: "CRITICAL" }])  // critical flags
      .mockResolvedValueOnce([{ id: "tf-2", severity: "HIGH" }, { id: "tf-3", severity: "HIGH" }])  // high flags

    mockGetOpenComplianceCases
      .mockResolvedValueOnce([])  // critical cases
      .mockResolvedValueOnce([{ id: "cc-1", priority: "HIGH" }])  // high cases

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.correlationId).toBeDefined()
    expect(body.summary).toEqual({
      criticalFlagCount: 1,
      highFlagCount: 2,
      criticalCaseCount: 0,
      highCaseCount: 1,
    })
  })

  it("calls trust service with correct severity filters", async () => {
    await GET(makeRequest())

    expect(mockGetOpenTrustFlags).toHaveBeenCalledWith({ severity: "CRITICAL", limit: 50 })
    expect(mockGetOpenTrustFlags).toHaveBeenCalledWith({ severity: "HIGH", limit: 50 })
    expect(mockGetOpenComplianceCases).toHaveBeenCalledWith({ priority: "CRITICAL", limit: 50 })
    expect(mockGetOpenComplianceCases).toHaveBeenCalledWith({ priority: "HIGH", limit: 50 })
  })

  it("skips when already ran in window", async () => {
    mockAcquireCronLock.mockResolvedValue(true)

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.skipped).toBe(true)
    expect(body.reason).toBe("already ran in this window")
    expect(mockGetOpenTrustFlags).not.toHaveBeenCalled()
  })

  it("returns security check response when auth fails", async () => {
    const { NextResponse } = await import("next/server")
    mockValidateCronRequest.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    )

    const response = await GET(makeRequest())

    expect(response.status).toBe(401)
    expect(mockGetOpenTrustFlags).not.toHaveBeenCalled()
  })

  it("returns 500 on unexpected error", async () => {
    mockGetOpenTrustFlags.mockRejectedValue(new Error("database down"))

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe("CRON_JOB_FAILED")
    expect(body.correlationId).toBeDefined()
  })

  it("returns zero counts when no flags or cases exist", async () => {
    mockGetOpenTrustFlags.mockResolvedValue([])
    mockGetOpenComplianceCases.mockResolvedValue([])

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.summary).toEqual({
      criticalFlagCount: 0,
      highFlagCount: 0,
      criticalCaseCount: 0,
      highCaseCount: 0,
    })
  })
})
