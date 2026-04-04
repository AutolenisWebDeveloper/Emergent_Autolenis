/**
 * Admin Inventory Search API – unit tests
 *
 * Tests the GET /api/admin/inventory/search route handler for:
 * - Auth / RBAC enforcement
 * - Query parameter handling (filters, pagination)
 * - Error handling
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// --------------- Mocks ---------------

const mockGetSessionUser = vi.fn()
const mockIsAdminRole = vi.fn()

vi.mock("@/lib/auth-server", () => ({
  getSessionUser: (...args: any[]) => mockGetSessionUser(...args),
  isAdminRole: (...args: any[]) => mockIsAdminRole(...args),
}))

// Chainable Supabase query builder mock
let queryResult: { data: any; error: any; count: number | null } = { data: [], error: null, count: 0 }
let capturedCalls: { method: string; args: any[] }[] = []

function createQueryChain() {
  const chain: any = {
    select: (...args: any[]) => { capturedCalls.push({ method: "select", args }); return chain },
    order: (...args: any[]) => { capturedCalls.push({ method: "order", args }); return chain },
    range: (...args: any[]) => { capturedCalls.push({ method: "range", args }); return chain },
    eq: (...args: any[]) => { capturedCalls.push({ method: "eq", args }); return chain },
    ilike: (...args: any[]) => { capturedCalls.push({ method: "ilike", args }); return chain },
    not: (...args: any[]) => { capturedCalls.push({ method: "not", args }); return chain },
    is: (...args: any[]) => { capturedCalls.push({ method: "is", args }); return chain },
    gt: (...args: any[]) => { capturedCalls.push({ method: "gt", args }); return chain },
    or: (...args: any[]) => { capturedCalls.push({ method: "or", args }); return chain },
    then: (resolve: (v: any) => any) => resolve(queryResult),
  }
  // Make the chain thenable so `await query` resolves to queryResult
  Object.defineProperty(chain, "then", {
    value: (resolve: (v: any) => any, reject?: (e: any) => any) =>
      Promise.resolve(queryResult).then(resolve, reject),
    writable: true,
    configurable: true,
  })
  return chain
}

let mockFromTable = ""

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
  const url = new URL("http://localhost:3000/api/admin/inventory/search")
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url)
}

// --------------- Import route handler ---------------

import { GET } from "@/app/api/admin/inventory/search/route"

// --------------- Tests ---------------

describe("GET /api/admin/inventory/search", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedCalls = []
    mockFromTable = ""
    queryResult = { data: [], error: null, count: 0 }
  })

  // ── Auth ──────────────────────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 401 when user is not an admin", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "u1", role: "BUYER" })
    mockIsAdminRole.mockReturnValue(false)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  // ── Happy path ────────────────────────────────────────────────────

  it("returns items from inventory_listings_canonical for admin users", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)

    const mockItems = [
      { id: "1", make: "Toyota", model: "Camry", year: 2022, price: 25000, status: "ACTIVE" },
    ]
    queryResult = { data: mockItems, error: null, count: 1 }

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.items).toEqual(mockItems)
    expect(body.total).toBe(1)
    expect(body.limit).toBe(50)
    expect(body.offset).toBe(0)
    expect(mockFromTable).toBe("inventory_listings_canonical")
  })

  // ── Filter handling ───────────────────────────────────────────────

  it("applies source filter", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)
    queryResult = { data: [], error: null, count: 0 }

    await GET(makeRequest({ source: "autotrader" }))

    const eqCall = capturedCalls.find((c) => c.method === "eq" && c.args[0] === "source")
    expect(eqCall).toBeDefined()
    expect(eqCall!.args[1]).toBe("autotrader")
  })

  it("applies state filter (uppercased)", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)
    queryResult = { data: [], error: null, count: 0 }

    await GET(makeRequest({ state: "tx" }))

    const eqCall = capturedCalls.find((c) => c.method === "eq" && c.args[0] === "state")
    expect(eqCall).toBeDefined()
    expect(eqCall!.args[1]).toBe("TX")
  })

  it("applies make filter (ilike)", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)
    queryResult = { data: [], error: null, count: 0 }

    await GET(makeRequest({ make: "Toyota" }))

    const ilikeCall = capturedCalls.find((c) => c.method === "ilike" && c.args[0] === "make")
    expect(ilikeCall).toBeDefined()
    expect(ilikeCall!.args[1]).toBe("Toyota")
  })

  it("applies hasVin=true filter", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)
    queryResult = { data: [], error: null, count: 0 }

    await GET(makeRequest({ hasVin: "true" }))

    const notCall = capturedCalls.find((c) => c.method === "not" && c.args[0] === "vin")
    expect(notCall).toBeDefined()
  })

  it("applies hasVin=false filter", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)
    queryResult = { data: [], error: null, count: 0 }

    await GET(makeRequest({ hasVin: "false" }))

    const isCall = capturedCalls.find((c) => c.method === "is" && c.args[0] === "vin")
    expect(isCall).toBeDefined()
  })

  it("applies hasPrice=true filter", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)
    queryResult = { data: [], error: null, count: 0 }

    await GET(makeRequest({ hasPrice: "true" }))

    const gtCall = capturedCalls.find((c) => c.method === "gt" && c.args[0] === "price")
    expect(gtCall).toBeDefined()
    expect(gtCall!.args[1]).toBe(0)
  })

  it("applies free-text search (q param)", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)
    queryResult = { data: [], error: null, count: 0 }

    await GET(makeRequest({ q: "Camry" }))

    const orCall = capturedCalls.find((c) => c.method === "or")
    expect(orCall).toBeDefined()
    expect(orCall!.args[0]).toContain("make.ilike.%Camry%")
    expect(orCall!.args[0]).toContain("model.ilike.%Camry%")
    expect(orCall!.args[0]).toContain("vin.ilike.%Camry%")
  })

  it("sanitizes special characters in search query to prevent filter injection", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)
    queryResult = { data: [], error: null, count: 0 }

    await GET(makeRequest({ q: "test,vin.eq.123" }))

    const orCall = capturedCalls.find((c) => c.method === "or")
    expect(orCall).toBeDefined()
    // Commas and dots should be escaped to prevent PostgREST filter injection
    expect(orCall!.args[0]).not.toContain("test,vin.eq.123")
    expect(orCall!.args[0]).toContain("test\\,vin\\.eq\\.123")
  })

  // ── Pagination ────────────────────────────────────────────────────

  it("respects limit and offset params", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)
    queryResult = { data: [], error: null, count: 0 }

    await GET(makeRequest({ limit: "25", offset: "50" }))

    const rangeCall = capturedCalls.find((c) => c.method === "range")
    expect(rangeCall).toBeDefined()
    expect(rangeCall!.args).toEqual([50, 74])
  })

  it("caps limit at 200", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)
    queryResult = { data: [], error: null, count: 0 }

    const res = await GET(makeRequest({ limit: "500" }))
    const body = await res.json()
    expect(body.limit).toBe(200)
  })

  it("floors offset at 0", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)
    queryResult = { data: [], error: null, count: 0 }

    const res = await GET(makeRequest({ offset: "-10" }))
    const body = await res.json()
    expect(body.offset).toBe(0)
  })

  // ── Error handling ────────────────────────────────────────────────

  it("returns 500 with correlationId on Supabase error", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)
    queryResult = { data: null, error: { message: "relation does not exist" }, count: null }

    const res = await GET(makeRequest())
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toEqual({ code: "SEARCH_FAILED", message: "Failed to search inventory" })
    expect(body.correlationId).toBeDefined()
  })

  it("returns 500 with correlationId on unexpected exception", async () => {
    mockGetSessionUser.mockRejectedValue(new Error("session service down"))

    const res = await GET(makeRequest())
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toEqual({ code: "SEARCH_FAILED", message: "Failed to search inventory" })
    expect(body.correlationId).toBeDefined()
  })
})
