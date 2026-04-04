/**
 * Admin Inventory Events API – unit tests
 *
 * Tests the GET /api/admin/inventory/[listingId]/events route handler for:
 * - Auth / RBAC enforcement
 * - Event listing
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

let queryResult: { data: any; error: any } = { data: [], error: null }
let mockFromTable = ""

vi.mock("@/lib/db", () => ({
  getSupabase: () => ({
    from: (table: string) => {
      mockFromTable = table
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
      }
      Object.defineProperty(chain, "then", {
        value: (resolve: (v: any) => any, reject?: (e: any) => any) =>
          Promise.resolve(queryResult).then(resolve, reject),
        writable: true,
        configurable: true,
      })
      return chain
    },
  }),
}))

// --------------- Helpers ---------------

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/admin/inventory/test-id/events")
}

function makeParams(listingId = "test-listing-id") {
  return { params: Promise.resolve({ listingId }) }
}

// --------------- Import route handler ---------------

import { GET } from "@/app/api/admin/inventory/[listingId]/events/route"

// --------------- Tests ---------------

describe("GET /api/admin/inventory/[listingId]/events", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFromTable = ""
    queryResult = { data: [], error: null }
  })

  it("returns 401 when user is not authenticated", async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 401 when user is not an admin", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "u1", role: "BUYER" })
    mockIsAdminRole.mockReturnValue(false)
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(401)
  })

  it("returns events from inventory_admin_events", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)

    const mockEvents = [
      { id: "e1", action: "SUPPRESS", created_at: "2024-01-01T00:00:00Z" },
      { id: "e2", action: "RESTORE", created_at: "2024-01-02T00:00:00Z" },
    ]
    queryResult = { data: mockEvents, error: null }

    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.items).toEqual(mockEvents)
    expect(mockFromTable).toBe("inventory_admin_events")
  })

  it("returns empty array when no events exist", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)
    queryResult = { data: null, error: null }

    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.items).toEqual([])
  })

  it("returns 500 on Supabase error", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)
    queryResult = { data: null, error: { message: "db error" } }

    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toBe("Failed to load events")
  })
})
