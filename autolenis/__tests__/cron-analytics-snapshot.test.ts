/**
 * Cron Route: /api/cron/analytics-snapshot — unit tests
 *
 * Tests security validation, lock acquisition, snapshot capture,
 * and error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Hoisted mocks ────────────────────────────────────────────────────────

const {
  mockValidateCronRequest,
  mockAcquireCronLock,
  mockWriteDailySnapshot,
  mockGetInventorySourceBreakdown,
  mockFrom,
} = vi.hoisted(() => {
  const mockValidateCronRequest = vi.fn().mockResolvedValue(null)
  const mockAcquireCronLock = vi.fn().mockResolvedValue(false)
  const mockWriteDailySnapshot = vi.fn().mockResolvedValue(undefined)
  const mockGetInventorySourceBreakdown = vi.fn().mockResolvedValue([])
  const mockFrom = vi.fn()
  return {
    mockValidateCronRequest,
    mockAcquireCronLock,
    mockWriteDailySnapshot,
    mockGetInventorySourceBreakdown,
    mockFrom,
  }
})

// ── Module mocks ─────────────────────────────────────────────────────────

vi.mock("@/lib/middleware/cron-security", () => ({
  validateCronRequest: mockValidateCronRequest,
  acquireCronLock: mockAcquireCronLock,
}))

vi.mock("@/lib/services/analytics/analytics.service", () => ({
  writeDailySnapshot: mockWriteDailySnapshot,
  getInventorySourceBreakdown: mockGetInventorySourceBreakdown,
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

import { GET } from "@/app/api/cron/analytics-snapshot/route"
import { NextRequest } from "next/server"

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/analytics-snapshot", {
    method: "GET",
    headers: { authorization: "Bearer test-cron-secret" },
  })
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("Analytics Snapshot Cron Route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockValidateCronRequest.mockResolvedValue(null)
    mockAcquireCronLock.mockResolvedValue(false)

    // Default: table counts return 0
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ count: 0, error: null }),
    })
  })

  it("captures daily snapshot and returns metrics count", async () => {
    mockGetInventorySourceBreakdown.mockResolvedValue([
      { source: "autotrader", total: 100, byStatus: { ACTIVE: 80, STALE: 20 } },
      { source: "cargurus", total: 50, byStatus: { ACTIVE: 50 } },
    ])

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.correlationId).toBeDefined()
    expect(body.snapshotDate).toBeDefined()
    expect(body.metricsWritten).toBeGreaterThanOrEqual(2)

    // Verify snapshots were written for each source
    expect(mockWriteDailySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        metricGroup: "inventory",
        metricKey: "source_total",
        metricValue: 100,
        dimension1: "autotrader",
      }),
    )
    expect(mockWriteDailySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        metricGroup: "inventory",
        metricKey: "source_total",
        metricValue: 50,
        dimension1: "cargurus",
      }),
    )
  })

  it("captures pipeline table counts", async () => {
    mockGetInventorySourceBreakdown.mockResolvedValue([])

    // Mock pipeline table counts
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ count: 42, error: null }),
    })

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    // 3 pipeline tables (leads, cases, conversions)
    expect(body.metricsWritten).toBe(3)

    expect(mockWriteDailySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        metricGroup: "pipeline",
        metricKey: "lead_count",
        metricValue: 42,
      }),
    )
  })

  it("skips when already ran in window", async () => {
    mockAcquireCronLock.mockResolvedValue(true)

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.skipped).toBe(true)
    expect(body.reason).toBe("already ran in this window")
    expect(mockWriteDailySnapshot).not.toHaveBeenCalled()
  })

  it("returns security check response when auth fails", async () => {
    const { NextResponse } = await import("next/server")
    mockValidateCronRequest.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    )

    const response = await GET(makeRequest())

    expect(response.status).toBe(401)
    expect(mockWriteDailySnapshot).not.toHaveBeenCalled()
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

  it("continues when inventory breakdown fails", async () => {
    mockGetInventorySourceBreakdown.mockRejectedValue(new Error("view not found"))

    // Pipeline counts still work
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ count: 10, error: null }),
    })

    const response = await GET(makeRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    // Should still capture pipeline counts (3 tables)
    expect(body.metricsWritten).toBe(3)
  })
})
