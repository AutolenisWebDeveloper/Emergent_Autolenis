/**
 * Buyer Inventory Search API – unit tests
 *
 * Tests the GET /api/inventory/search route handler for:
 * - Buyer-visible filtering (only BUYER_VISIBLE status)
 * - Query parameter handling (filters, pagination)
 * - No raw payload exposure
 * - Error handling
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// --------------- Mocks ---------------

vi.mock("@/lib/middleware/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue(null),
  rateLimits: { api: {} },
}))

let queryResult: { data: any; error: any; count: number | null } = { data: [], error: null, count: 0 }
let capturedCalls: { method: string; args: any[] }[] = []
let mockFromTable = ""

function createQueryChain() {
  const chain: any = {
    select: (...args: any[]) => { capturedCalls.push({ method: "select", args }); return chain },
    order: (...args: any[]) => { capturedCalls.push({ method: "order", args }); return chain },
    range: (...args: any[]) => { capturedCalls.push({ method: "range", args }); return chain },
    eq: (...args: any[]) => { capturedCalls.push({ method: "eq", args }); return chain },
    ilike: (...args: any[]) => { capturedCalls.push({ method: "ilike", args }); return chain },
    gte: (...args: any[]) => { capturedCalls.push({ method: "gte", args }); return chain },
    lte: (...args: any[]) => { capturedCalls.push({ method: "lte", args }); return chain },
    or: (...args: any[]) => { capturedCalls.push({ method: "or", args }); return chain },
  }
  Object.defineProperty(chain, "then", {
    value: (resolve: (v: any) => any, reject?: (e: any) => any) =>
      Promise.resolve(queryResult).then(resolve, reject),
    writable: true,
    configurable: true,
  })
  return chain
}

vi.mock("@/lib/db", () => ({
  getSupabase: () => ({
    from: (table: string) => {
      mockFromTable = table
      return createQueryChain()
    },
  }),
}))

// --------------- Helpers ---------------

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/inventory/search")
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url)
}

// --------------- Import route handler ---------------

import { GET } from "@/app/api/inventory/search/route"

// --------------- Tests ---------------

describe("GET /api/inventory/search (buyer-facing)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedCalls = []
    mockFromTable = ""
    queryResult = { data: [], error: null, count: 0 }
  })

  // ── Core behavior ─────────────────────────────────────────────────

  it("queries inventory_listings_canonical table", async () => {
    await GET(makeRequest())
    expect(mockFromTable).toBe("inventory_listings_canonical")
  })

  it("filters only BUYER_VISIBLE listings", async () => {
    await GET(makeRequest())

    const eqCall = capturedCalls.find(
      (c) => c.method === "eq" && c.args[0] === "status" && c.args[1] === "BUYER_VISIBLE",
    )
    expect(eqCall).toBeDefined()
  })

  it("selects only buyer-safe fields (no raw payload, no admin fields)", async () => {
    await GET(makeRequest())

    const selectCall = capturedCalls.find((c) => c.method === "select")
    expect(selectCall).toBeDefined()

    const selectStr = selectCall!.args[0] as string
    // Should include buyer-facing fields
    expect(selectStr).toContain("id")
    expect(selectStr).toContain("price")
    expect(selectStr).toContain("make")
    expect(selectStr).toContain("model")
    expect(selectStr).toContain("dealer_name")
    expect(selectStr).toContain("listing_url")
    // Should NOT include admin/internal fields
    expect(selectStr).not.toContain("source_payload")
    expect(selectStr).not.toContain("data_quality_flags")
    expect(selectStr).not.toContain("raw_listing_id")
    expect(selectStr).not.toContain("canonical_vehicle_id")
  })

  it("returns items and pagination info", async () => {
    const mockItems = [
      { id: "1", make: "Toyota", model: "Camry", price: 25000 },
    ]
    queryResult = { data: mockItems, error: null, count: 1 }

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.items).toEqual(mockItems)
    expect(body.total).toBe(1)
    expect(body.limit).toBe(24)
    expect(body.offset).toBe(0)
  })

  // ── Filter handling ───────────────────────────────────────────────

  it("applies zip filter", async () => {
    await GET(makeRequest({ zip: "90210" }))

    const eqCall = capturedCalls.find((c) => c.method === "eq" && c.args[0] === "zip")
    expect(eqCall).toBeDefined()
    expect(eqCall!.args[1]).toBe("90210")
  })

  it("applies make filter (ilike)", async () => {
    await GET(makeRequest({ make: "Toyota" }))

    const ilikeCall = capturedCalls.find((c) => c.method === "ilike" && c.args[0] === "make")
    expect(ilikeCall).toBeDefined()
    expect(ilikeCall!.args[1]).toBe("Toyota")
  })

  it("applies model filter (ilike)", async () => {
    await GET(makeRequest({ model: "Camry" }))

    const ilikeCall = capturedCalls.find((c) => c.method === "ilike" && c.args[0] === "model")
    expect(ilikeCall).toBeDefined()
    expect(ilikeCall!.args[1]).toBe("Camry")
  })

  it("applies minPrice filter", async () => {
    await GET(makeRequest({ minPrice: "10000" }))

    const gteCall = capturedCalls.find((c) => c.method === "gte" && c.args[0] === "price")
    expect(gteCall).toBeDefined()
    expect(gteCall!.args[1]).toBe(10000)
  })

  it("applies maxPrice filter", async () => {
    await GET(makeRequest({ maxPrice: "50000" }))

    const lteCall = capturedCalls.find((c) => c.method === "lte" && c.args[0] === "price")
    expect(lteCall).toBeDefined()
    expect(lteCall!.args[1]).toBe(50000)
  })

  it("applies free-text search (q param)", async () => {
    await GET(makeRequest({ q: "Camry" }))

    const orCall = capturedCalls.find((c) => c.method === "or")
    expect(orCall).toBeDefined()
    expect(orCall!.args[0]).toContain("make.ilike.%Camry%")
    expect(orCall!.args[0]).toContain("model.ilike.%Camry%")
    expect(orCall!.args[0]).toContain("vin.ilike.%Camry%")
  })

  // ── Pagination ────────────────────────────────────────────────────

  it("defaults to limit=24, offset=0", async () => {
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.limit).toBe(24)
    expect(body.offset).toBe(0)
  })

  it("caps limit at 100", async () => {
    const res = await GET(makeRequest({ limit: "500" }))
    const body = await res.json()
    expect(body.limit).toBe(100)
  })

  it("floors offset at 0", async () => {
    const res = await GET(makeRequest({ offset: "-10" }))
    const body = await res.json()
    expect(body.offset).toBe(0)
  })

  // ── Error handling ────────────────────────────────────────────────

  it("returns 500 on Supabase error", async () => {
    queryResult = { data: null, error: { message: "relation does not exist" }, count: null }

    const res = await GET(makeRequest())
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toBe("Failed to search inventory")
  })
})
