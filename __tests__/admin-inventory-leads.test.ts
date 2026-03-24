/**
 * Phase 5 – Admin Leads API route tests
 * Tests GET /api/admin/inventory/leads and POST /api/admin/inventory/leads
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

const mockListLeads = vi.fn()
const mockCreateLead = vi.fn()

vi.mock("@/lib/services/inventory-sourcing/lead.service", () => ({
  listLeads: (...args: any[]) => mockListLeads(...args),
  createLead: (...args: any[]) => mockCreateLead(...args),
  LEAD_STATUSES: ["NEW", "REVIEW", "ASSIGNED", "CONTACTED", "NEGOTIATING", "CONVERTED", "CLOSED", "REJECTED"],
  LEAD_TYPES: ["CLAIM", "SOURCE"],
}))

// --------------- Helpers ---------------

function makeRequest(params: Record<string, string> = {}, method = "GET", body?: any) {
  const url = new URL("http://localhost:3000/api/admin/inventory/leads")
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  if (method === "POST" && body) {
    return new NextRequest(url, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  }
  return new NextRequest(url)
}

// --------------- Import route handler ---------------

import { GET, POST } from "@/app/api/admin/inventory/leads/route"

// --------------- Tests ---------------

describe("Admin Leads API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Auth ──────────────────────────────────────────────────────────

  describe("GET /api/admin/inventory/leads", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockGetSessionUser.mockResolvedValue(null)
      const res = await GET(makeRequest())
      expect(res.status).toBe(401)
    })

    it("returns 401 when user is not admin", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "u1", role: "BUYER" })
      mockIsAdminRole.mockReturnValue(false)
      const res = await GET(makeRequest())
      expect(res.status).toBe(401)
    })

    it("returns leads for admin", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
      mockIsAdminRole.mockReturnValue(true)
      mockListLeads.mockResolvedValue({
        leads: [{ id: "lead-1", status: "NEW" }],
        total: 1,
        limit: 50,
        offset: 0,
      })

      const res = await GET(makeRequest())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.leads).toHaveLength(1)
      expect(body.total).toBe(1)
    })

    it("passes filters to service", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
      mockIsAdminRole.mockReturnValue(true)
      mockListLeads.mockResolvedValue({ leads: [], total: 0, limit: 25, offset: 0 })

      await GET(makeRequest({ status: "ASSIGNED", lead_type: "CLAIM", limit: "25" }))

      expect(mockListLeads).toHaveBeenCalledWith({
        status: "ASSIGNED",
        lead_type: "CLAIM",
        limit: 25,
        offset: 0,
      })
    })

    it("returns 500 on service error", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
      mockIsAdminRole.mockReturnValue(true)
      mockListLeads.mockRejectedValue(new Error("DB error"))

      const res = await GET(makeRequest())
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error.code).toBe("LIST_LEADS_FAILED")
      expect(body.correlationId).toBeDefined()
    })
  })

  describe("POST /api/admin/inventory/leads", () => {
    it("returns 401 for non-admin", async () => {
      mockGetSessionUser.mockResolvedValue(null)
      const res = await POST(makeRequest({}, "POST", { listing_id: "l1" }))
      expect(res.status).toBe(401)
    })

    it("creates a lead for admin", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
      mockIsAdminRole.mockReturnValue(true)
      mockCreateLead.mockResolvedValue({ id: "lead-new", status: "NEW", lead_type: "CLAIM" })

      const res = await POST(
        makeRequest({}, "POST", { listing_id: "l1", buyer_email: "test@test.com" }),
      )
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.id).toBe("lead-new")
    })

    it("rejects invalid lead_type", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
      mockIsAdminRole.mockReturnValue(true)

      const res = await POST(makeRequest({}, "POST", { lead_type: "INVALID" }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe("INVALID_LEAD_TYPE")
    })

    it("rejects invalid status", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "admin1", role: "ADMIN" })
      mockIsAdminRole.mockReturnValue(true)

      const res = await POST(makeRequest({}, "POST", { status: "BOGUS" }))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe("INVALID_STATUS")
    })
  })
})
