/**
 * Admin Inventory Stale Maintenance API – unit tests
 *
 * Tests the POST /api/admin/inventory/maintenance/stale route handler for:
 * - Auth / RBAC enforcement
 * - Stale listing updates
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
let capturedCalls: { method: string; args: any[] }[] = []

vi.mock("@/lib/db", () => ({
  getSupabase: () => ({
    from: () => {
      const chain: any = {
        select: (...args: any[]) => { capturedCalls.push({ method: "select", args }); return chain },
        update: (...args: any[]) => { capturedCalls.push({ method: "update", args }); return chain },
        lt: (...args: any[]) => { capturedCalls.push({ method: "lt", args }); return chain },
        in: (...args: any[]) => { capturedCalls.push({ method: "in", args }); return chain },
        eq: (...args: any[]) => { capturedCalls.push({ method: "eq", args }); return chain },
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
  return new NextRequest("http://localhost:3000/api/admin/inventory/maintenance/stale", {
    method: "POST",
  })
}

// --------------- Import route handler ---------------

import { POST } from "@/app/api/admin/inventory/maintenance/stale/route"

// --------------- Tests ---------------

describe("POST /api/admin/inventory/maintenance/stale", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedCalls = []
    queryResult = { data: [], error: null }
  })

  it("returns 401 when user is not authenticated", async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 401 when user is not an admin", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "u1", role: "BUYER" })
    mockIsAdminRole.mockReturnValue(false)
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it("marks stale listings and returns count", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)

    queryResult = { data: [{ id: "1" }, { id: "2" }], error: null }

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.updated).toBe(2)

    // Verify update was called with STALE status
    const updateCall = capturedCalls.find((c) => c.method === "update")
    expect(updateCall).toBeDefined()
    expect(updateCall!.args[0].status).toBe("STALE")

    // Verify filter on status: ["ACTIVE", "BUYER_VISIBLE"]
    const inCall = capturedCalls.find((c) => c.method === "in")
    expect(inCall).toBeDefined()
    expect(inCall!.args[0]).toBe("status")
    expect(inCall!.args[1]).toEqual(["ACTIVE", "BUYER_VISIBLE"])
  })

  it("returns 0 when no stale listings found", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)

    queryResult = { data: [], error: null }

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.updated).toBe(0)
  })

  it("returns 500 on Supabase error", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)

    queryResult = { data: null, error: { message: "db error" } }

    const res = await POST(makeRequest())
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toBe("Failed to mark stale listings")
  })
})
