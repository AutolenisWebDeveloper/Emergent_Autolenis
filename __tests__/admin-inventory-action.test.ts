/**
 * Admin Inventory Actions API – unit tests
 *
 * Tests the POST /api/admin/inventory/[listingId]/action route handler for:
 * - Auth / RBAC enforcement
 * - Status transition actions (SUPPRESS, RESTORE, MARK_STALE, etc.)
 * - RENORMALIZE action with raw source lookup
 * - Audit event logging
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

const mockPromoteRawListing = vi.fn()
vi.mock("@/lib/services/inventory-sourcing/promote.service", () => ({
  promoteRawListing: (...args: any[]) => mockPromoteRawListing(...args),
}))

// Supabase mock state
let listingResult: { data: any; error: any } = { data: null, error: null }
let rawResult: { data: any; error: any } = { data: null, error: null }
let updateResult: { error: any } = { error: null }
let insertCalls: { table: string; payload: any }[] = []
let updateCalls: { table: string; data: any; eqField?: string; eqVal?: string }[] = []

function createQueryChain(resolveWith: () => any) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    single: () => chain,
    order: () => chain,
    update: (data: any) => {
      updateCalls.push({ table: "_pending_", data })
      return chain
    },
    insert: (payload: any) => {
      insertCalls.push({ table: "_pending_", payload })
      return chain
    },
  }
  Object.defineProperty(chain, "then", {
    value: (resolve: (v: any) => any, reject?: (e: any) => any) =>
      Promise.resolve(resolveWith()).then(resolve, reject),
    writable: true,
    configurable: true,
  })
  return chain
}

let fromCallIndex = 0
const fromResults: (() => any)[] = []

vi.mock("@/lib/db", () => ({
  getSupabase: () => ({
    from: (table: string) => {
      const idx = fromCallIndex++
      const resolver = fromResults[idx] || (() => ({ data: null, error: null }))

      const chain: any = {
        select: () => chain,
        eq: () => chain,
        single: () => chain,
        order: () => chain,
        update: (data: any) => {
          updateCalls.push({ table, data })
          return chain
        },
        insert: (payload: any) => {
          insertCalls.push({ table, payload })
          return chain
        },
      }
      Object.defineProperty(chain, "then", {
        value: (resolve: (v: any) => any, reject?: (e: any) => any) =>
          Promise.resolve(resolver()).then(resolve, reject),
        writable: true,
        configurable: true,
      })
      return chain
    },
  }),
}))

// --------------- Helpers ---------------

function makeRequest(body: any) {
  return new NextRequest("http://localhost:3000/api/admin/inventory/test-id/action", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

function makeParams(listingId = "test-listing-id") {
  return { params: Promise.resolve({ listingId }) }
}

// --------------- Import route handler ---------------

import { POST } from "@/app/api/admin/inventory/[listingId]/action/route"

// --------------- Tests ---------------

describe("POST /api/admin/inventory/[listingId]/action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fromCallIndex = 0
    fromResults.length = 0
    insertCalls = []
    updateCalls = []
    mockPromoteRawListing.mockResolvedValue({ success: true, normalized: {} })
  })

  // ── Auth ──────────────────────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    mockGetSessionUser.mockResolvedValue(null)
    const res = await POST(makeRequest({ action: "SUPPRESS" }), makeParams())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 401 when user is not an admin", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "u1", role: "BUYER" })
    mockIsAdminRole.mockReturnValue(false)
    const res = await POST(makeRequest({ action: "SUPPRESS" }), makeParams())
    expect(res.status).toBe(401)
  })

  // ── Validation ────────────────────────────────────────────────────

  it("returns 400 for invalid action", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)

    const res = await POST(makeRequest({ action: "INVALID_ACTION" }), makeParams())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Invalid action")
  })

  it("returns 400 for missing action", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)

    const res = await POST(makeRequest({}), makeParams())
    expect(res.status).toBe(400)
  })

  // ── Listing not found ─────────────────────────────────────────────

  it("returns 404 when listing not found", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)

    // from("inventory_listings_canonical").select.eq.single → not found
    fromResults.push(() => ({ data: null, error: { message: "not found" } }))

    const res = await POST(makeRequest({ action: "SUPPRESS" }), makeParams())
    expect(res.status).toBe(404)
  })

  // ── Status transition actions ─────────────────────────────────────

  const transitions: [string, string][] = [
    ["SUPPRESS", "SUPPRESSED"],
    ["RESTORE", "ACTIVE"],
    ["MARK_STALE", "STALE"],
    ["PROMOTE_TO_BUYER_VISIBLE", "BUYER_VISIBLE"],
    ["SEND_TO_REVIEW", "REVIEW"],
  ]

  for (const [action, expectedStatus] of transitions) {
    it(`transitions to ${expectedStatus} on action ${action}`, async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
      mockIsAdminRole.mockReturnValue(true)

      // from("inventory_listings_canonical").select.eq.single → listing found
      fromResults.push(() => ({
        data: { id: "listing-1", status: "ACTIVE", raw_listing_id: null },
        error: null,
      }))
      // from("inventory_listings_canonical").update.eq → success
      fromResults.push(() => ({ error: null }))
      // from("inventory_admin_events").insert → success
      fromResults.push(() => ({ error: null }))

      const res = await POST(makeRequest({ action }), makeParams())
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.action).toBe(action)
      expect(body.status).toBe(expectedStatus)

      // Verify update was called with correct status
      const updateCall = updateCalls.find((c) => c.table === "inventory_listings_canonical")
      expect(updateCall).toBeDefined()
      expect(updateCall!.data.status).toBe(expectedStatus)

      // Verify audit event was inserted
      const insertCall = insertCalls.find((c) => c.table === "inventory_admin_events")
      expect(insertCall).toBeDefined()
      expect(insertCall!.payload.action).toBe(action)
      expect(insertCall!.payload.actor_user_id).toBe("admin1")
    })
  }

  // ── Update failure ────────────────────────────────────────────────

  it("returns 500 when update fails", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)

    fromResults.push(() => ({
      data: { id: "listing-1", status: "ACTIVE", raw_listing_id: null },
      error: null,
    }))
    fromResults.push(() => ({ error: { message: "db error" } }))

    const res = await POST(makeRequest({ action: "SUPPRESS" }), makeParams())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe("Failed to update listing")
  })

  // ── RENORMALIZE ───────────────────────────────────────────────────

  it("returns 400 when RENORMALIZE and no raw_listing_id", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)

    fromResults.push(() => ({
      data: { id: "listing-1", status: "ACTIVE", raw_listing_id: null },
      error: null,
    }))

    const res = await POST(makeRequest({ action: "RENORMALIZE" }), makeParams())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Listing has no raw source record")
  })

  it("returns 404 when RENORMALIZE and raw listing not found", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)

    fromResults.push(() => ({
      data: { id: "listing-1", status: "ACTIVE", raw_listing_id: "raw-1" },
      error: null,
    }))
    fromResults.push(() => ({ data: null, error: { message: "not found" } }))

    const res = await POST(makeRequest({ action: "RENORMALIZE" }), makeParams())
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe("Raw listing source not found")
  })

  it("renormalizes successfully from raw source", async () => {
    mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
    mockIsAdminRole.mockReturnValue(true)

    const rawRecord = { id: "raw-1", raw_payload: { make: "Toyota" } }

    fromResults.push(() => ({
      data: { id: "listing-1", status: "ACTIVE", raw_listing_id: "raw-1" },
      error: null,
    }))
    fromResults.push(() => ({ data: rawRecord, error: null }))
    // from("inventory_admin_events").insert
    fromResults.push(() => ({ error: null }))

    const res = await POST(makeRequest({ action: "RENORMALIZE" }), makeParams())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.action).toBe("RENORMALIZE")
    expect(mockPromoteRawListing).toHaveBeenCalledWith(rawRecord)
  })
})
