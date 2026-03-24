import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Supabase mock – mirrors the query-chain pattern used across the codebase
// ---------------------------------------------------------------------------

const mockSingle = vi.fn()
const mockSelect = vi.fn()
const mockUpsert = vi.fn()
const mockEq = vi.fn()
const mockGte = vi.fn()
const mockLte = vi.fn()
const mockOrder = vi.fn()

function resetChain() {
  mockSelect.mockReturnThis()
  mockSingle.mockReturnValue({ data: null, error: null })
  mockUpsert.mockReturnValue({ error: null })
  mockEq.mockReturnThis()
  mockGte.mockReturnThis()
  mockLte.mockReturnThis()
  mockOrder.mockReturnValue({ data: [], error: null })
}

function chainObj() {
  return {
    select: mockSelect,
    single: mockSingle,
    upsert: mockUpsert,
    eq: mockEq,
    gte: mockGte,
    lte: mockLte,
    order: mockOrder,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom: any = vi.fn(chainObj)

vi.mock("@/lib/db", () => ({
  getSupabase: () => ({ from: mockFrom }),
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Import after mocks
import {
  getExecutiveDashboard,
  getInventorySourceBreakdown,
  writeDailySnapshot,
  getDailySnapshots,
} from "@/lib/services/analytics"

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Analytics Service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChain()
    mockFrom.mockImplementation(chainObj)
  })

  // -------------------------------------------------------------------------
  // getExecutiveDashboard
  // -------------------------------------------------------------------------
  describe("getExecutiveDashboard", () => {
    it("queries all seven analytics views", async () => {
      const fakeData = { total: 42 }
      mockSingle.mockResolvedValue({ data: fakeData, error: null })

      const result = await getExecutiveDashboard()

      // Must call .from() for each of the 7 views
      const viewNames = mockFrom.mock.calls.map((c: unknown[]) => c[0])
      expect(viewNames).toContain("analytics_inventory_overview")
      expect(viewNames).toContain("analytics_lead_funnel")
      expect(viewNames).toContain("analytics_sourcing_case_funnel")
      expect(viewNames).toContain("analytics_invite_performance")
      expect(viewNames).toContain("analytics_offer_performance")
      expect(viewNames).toContain("analytics_conversion_performance")
      expect(viewNames).toContain("analytics_ops_risk_overview")

      // All sections should contain the fake data
      expect(result.inventory).toEqual(fakeData)
      expect(result.leads).toEqual(fakeData)
      expect(result.cases).toEqual(fakeData)
      expect(result.invites).toEqual(fakeData)
      expect(result.offers).toEqual(fakeData)
      expect(result.conversions).toEqual(fakeData)
      expect(result.ops).toEqual(fakeData)
    })

    it("returns empty objects when views return null data", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null })

      const result = await getExecutiveDashboard()

      expect(result.inventory).toEqual({})
      expect(result.leads).toEqual({})
      expect(result.cases).toEqual({})
      expect(result.invites).toEqual({})
      expect(result.offers).toEqual({})
      expect(result.conversions).toEqual({})
      expect(result.ops).toEqual({})
    })

    it("logs warnings when some views return errors", async () => {
      const fakeError = { message: "view not found" }
      mockSingle.mockResolvedValue({ data: null, error: fakeError })

      const { logger } = await import("@/lib/logger")

      await getExecutiveDashboard()

      expect(logger.warn).toHaveBeenCalledWith(
        "Analytics view query errors",
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })
  })

  // -------------------------------------------------------------------------
  // getInventorySourceBreakdown
  // -------------------------------------------------------------------------
  describe("getInventorySourceBreakdown", () => {
    it("groups listings by source and status", async () => {
      const listingRows = [
        { source: "AUTOTRADER", status: "ACTIVE" },
        { source: "AUTOTRADER", status: "ACTIVE" },
        { source: "AUTOTRADER", status: "STALE" },
        { source: "CARGURUS", status: "ACTIVE" },
        { source: "CARGURUS", status: "SUPPRESSED" },
      ]

      mockFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: listingRows, error: null }),
      })

      const result = await getInventorySourceBreakdown()

      // Sorted descending by total
      expect(result[0].source).toBe("AUTOTRADER")
      expect(result[0].total).toBe(3)
      expect(result[0].byStatus.ACTIVE).toBe(2)
      expect(result[0].byStatus.STALE).toBe(1)

      expect(result[1].source).toBe("CARGURUS")
      expect(result[1].total).toBe(2)
      expect(result[1].byStatus.ACTIVE).toBe(1)
      expect(result[1].byStatus.SUPPRESSED).toBe(1)
    })

    it("uses UNKNOWN for rows missing source or status", async () => {
      const listingRows = [
        { source: null, status: null },
        { source: null, status: "ACTIVE" },
      ]

      mockFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: listingRows, error: null }),
      })

      const result = await getInventorySourceBreakdown()

      expect(result[0].source).toBe("UNKNOWN")
      expect(result[0].total).toBe(2)
      expect(result[0].byStatus.UNKNOWN).toBe(1)
      expect(result[0].byStatus.ACTIVE).toBe(1)
    })

    it("returns empty array when no listings exist", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      })

      const result = await getInventorySourceBreakdown()
      expect(result).toEqual([])
    })

    it("throws and logs on database error", async () => {
      const dbErr = { message: "table not found" }
      mockFrom.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: dbErr }),
      })

      const { logger } = await import("@/lib/logger")

      await expect(getInventorySourceBreakdown()).rejects.toEqual(dbErr)
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch inventory source breakdown",
        expect.objectContaining({ error: dbErr })
      )
    })
  })

  // -------------------------------------------------------------------------
  // writeDailySnapshot
  // -------------------------------------------------------------------------
  describe("writeDailySnapshot", () => {
    it("upserts a metric row into the daily snapshot table", async () => {
      mockFrom.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })

      await writeDailySnapshot({
        snapshotDate: "2026-03-20",
        metricGroup: "INVENTORY",
        metricKey: "active_listings",
        metricValue: 150,
        dimension1: "AUTOTRADER",
      })

      expect(mockFrom).toHaveBeenCalledWith("analytics_daily_snapshots")
    })

    it("throws and logs on upsert error", async () => {
      const upsertErr = { message: "conflict" }
      mockFrom.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: upsertErr }),
      })

      const { logger } = await import("@/lib/logger")

      await expect(
        writeDailySnapshot({
          snapshotDate: "2026-03-20",
          metricGroup: "INVENTORY",
          metricKey: "active_listings",
          metricValue: 150,
        })
      ).rejects.toEqual(upsertErr)

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to write daily snapshot",
        expect.objectContaining({ error: upsertErr })
      )
    })
  })

  // -------------------------------------------------------------------------
  // getDailySnapshots
  // -------------------------------------------------------------------------
  describe("getDailySnapshots", () => {
    it("queries snapshots by metric group and date range", async () => {
      const fakeRows = [{ metric_key: "active_listings", metric_value: 100 }]

      mockOrder.mockResolvedValue({ data: fakeRows, error: null })

      const result = await getDailySnapshots({
        metricGroup: "INVENTORY",
        startDate: "2026-03-01",
        endDate: "2026-03-20",
      })

      expect(mockFrom).toHaveBeenCalledWith("analytics_daily_snapshots")
      expect(result).toEqual(fakeRows)
    })

    it("returns empty array when no rows match", async () => {
      mockOrder.mockResolvedValue({ data: null, error: null })

      const result = await getDailySnapshots({
        metricGroup: "INVENTORY",
        startDate: "2026-03-01",
        endDate: "2026-03-20",
      })

      expect(result).toEqual([])
    })

    it("throws and logs on query error", async () => {
      const queryErr = { message: "query failed" }
      mockOrder.mockResolvedValue({ data: null, error: queryErr })

      const { logger } = await import("@/lib/logger")

      await expect(
        getDailySnapshots({
          metricGroup: "INVENTORY",
          startDate: "2026-03-01",
          endDate: "2026-03-20",
        })
      ).rejects.toEqual(queryErr)

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch daily snapshots",
        expect.objectContaining({ error: queryErr })
      )
    })
  })
})

// ---------------------------------------------------------------------------
// Migration artifact verification
// ---------------------------------------------------------------------------

describe("Phase 11 Analytics Migration Artifacts", () => {
  it("migration file exists with the analytics_daily_snapshots table", async () => {
    const fs = await import("fs")
    const migrationPath =
      "supabase/migrations/20240101000023_phase11_analytics_views.sql"
    const exists = fs.existsSync(migrationPath)
    expect(exists).toBe(true)

    const content = fs.readFileSync(migrationPath, "utf-8")
    expect(content).toContain("analytics_daily_snapshots")
    expect(content).toContain("analytics_inventory_overview")
    expect(content).toContain("analytics_lead_funnel")
    expect(content).toContain("analytics_sourcing_case_funnel")
    expect(content).toContain("analytics_invite_performance")
    expect(content).toContain("analytics_offer_performance")
    expect(content).toContain("analytics_conversion_performance")
    expect(content).toContain("analytics_ops_risk_overview")
  })
})
