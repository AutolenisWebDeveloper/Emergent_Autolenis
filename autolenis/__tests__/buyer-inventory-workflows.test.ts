/**
 * Phase 5 – Buyer claim and source API route tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// --------------- Mocks ---------------

const mockGetSessionUser = vi.fn()

vi.mock("@/lib/auth-server", () => ({
  getSessionUser: (...args: any[]) => mockGetSessionUser(...args),
}))

const mockCreateLead = vi.fn()
const mockCreateSourcingRequest = vi.fn()

vi.mock("@/lib/services/inventory-sourcing/lead.service", () => ({
  createLead: (...args: any[]) => mockCreateLead(...args),
  createSourcingRequest: (...args: any[]) => mockCreateSourcingRequest(...args),
}))

// --------------- Helpers ---------------

function makePostRequest(path: string, body: any) {
  return new NextRequest(new URL(`http://localhost:3000${path}`), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

// --------------- Import route handlers ---------------

import { POST as claimPost } from "@/app/api/buyer/inventory/claim/route"
import { POST as sourcePost } from "@/app/api/buyer/inventory/source/route"

// --------------- Tests ---------------

describe("Buyer Inventory Workflows", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("POST /api/buyer/inventory/claim", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetSessionUser.mockResolvedValue(null)
      const res = await claimPost(
        makePostRequest("/api/buyer/inventory/claim", { listing_id: "l1" }),
      )
      expect(res.status).toBe(401)
    })

    it("returns 401 when user role is not BUYER", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "admin-1", role: "ADMIN" })
      const res = await claimPost(
        makePostRequest("/api/buyer/inventory/claim", { listing_id: "l1" }),
      )
      expect(res.status).toBe(401)
    })

    it("returns 401 when user role is DEALER", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "dealer-1", role: "DEALER" })
      const res = await claimPost(
        makePostRequest("/api/buyer/inventory/claim", { listing_id: "l1" }),
      )
      expect(res.status).toBe(401)
    })

    it("returns 400 when listing_id is missing", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "buyer-1", role: "BUYER" })
      const res = await claimPost(
        makePostRequest("/api/buyer/inventory/claim", {}),
      )
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe("MISSING_LISTING_ID")
    })

    it("creates a CLAIM lead with buyer context", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "buyer-1", role: "BUYER" })
      mockCreateLead.mockResolvedValue({
        id: "lead-claim",
        lead_type: "CLAIM",
        listing_id: "listing-abc",
        status: "NEW",
      })

      const res = await claimPost(
        makePostRequest("/api/buyer/inventory/claim", {
          listing_id: "listing-abc",
          buyer_name: "Test Buyer",
          buyer_email: "buyer@test.com",
          buyer_phone: "555-1234",
          buyer_zip: "75001",
        }),
      )

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.id).toBe("lead-claim")
      expect(body.lead_type).toBe("CLAIM")

      // Verify createLead was called with correct params
      expect(mockCreateLead).toHaveBeenCalledWith(
        expect.objectContaining({
          listing_id: "listing-abc",
          buyer_user_id: "buyer-1",
          lead_type: "CLAIM",
        }),
        "buyer-1",
      )
    })

    it("returns 500 on service failure", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "buyer-1", role: "BUYER" })
      mockCreateLead.mockRejectedValue(new Error("DB error"))

      const res = await claimPost(
        makePostRequest("/api/buyer/inventory/claim", { listing_id: "l1" }),
      )
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error.code).toBe("CLAIM_FAILED")
      expect(body.correlationId).toBeDefined()
    })
  })

  describe("POST /api/buyer/inventory/source", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetSessionUser.mockResolvedValue(null)
      const res = await sourcePost(
        makePostRequest("/api/buyer/inventory/source", { make: "Toyota" }),
      )
      expect(res.status).toBe(401)
    })

    it("returns 401 when user role is not BUYER", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "admin-1", role: "ADMIN" })
      const res = await sourcePost(
        makePostRequest("/api/buyer/inventory/source", { make: "Toyota" }),
      )
      expect(res.status).toBe(401)
    })

    it("returns 401 when user role is DEALER", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "dealer-1", role: "DEALER" })
      const res = await sourcePost(
        makePostRequest("/api/buyer/inventory/source", { make: "Toyota" }),
      )
      expect(res.status).toBe(401)
    })

    it("returns 400 when no criteria provided", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "buyer-1", role: "BUYER" })
      const res = await sourcePost(
        makePostRequest("/api/buyer/inventory/source", {}),
      )
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe("MISSING_CRITERIA")
    })

    it("returns 400 when only year_min is provided without make", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "buyer-1", role: "BUYER" })
      const res = await sourcePost(
        makePostRequest("/api/buyer/inventory/source", { year_min: 2020 }),
      )
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe("MISSING_CRITERIA")
    })

    it("creates a sourcing request with vehicle criteria", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "buyer-1", role: "BUYER" })
      mockCreateSourcingRequest.mockResolvedValue({
        id: "sr-1",
        status: "OPEN",
        make: "Toyota",
        model: "Camry",
      })

      const res = await sourcePost(
        makePostRequest("/api/buyer/inventory/source", {
          make: "Toyota",
          model: "Camry",
          year_min: 2020,
          year_max: 2024,
          max_price: 35000,
          buyer_zip: "75001",
        }),
      )

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.id).toBe("sr-1")
      expect(body.status).toBe("OPEN")

      expect(mockCreateSourcingRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          buyer_user_id: "buyer-1",
          make: "Toyota",
          model: "Camry",
          year_min: 2020,
          year_max: 2024,
          max_price: 35000,
        }),
      )
    })

    it("accepts notes-only criteria", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "buyer-1", role: "BUYER" })
      mockCreateSourcingRequest.mockResolvedValue({
        id: "sr-2",
        status: "OPEN",
        notes: "Looking for a reliable SUV",
      })

      const res = await sourcePost(
        makePostRequest("/api/buyer/inventory/source", {
          notes: "Looking for a reliable SUV",
        }),
      )

      expect(res.status).toBe(201)
    })

    it("returns 500 on service failure", async () => {
      mockGetSessionUser.mockResolvedValue({ userId: "buyer-1", role: "BUYER" })
      mockCreateSourcingRequest.mockRejectedValue(new Error("DB error"))

      const res = await sourcePost(
        makePostRequest("/api/buyer/inventory/source", { make: "Honda" }),
      )
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error.code).toBe("SOURCE_FAILED")
      expect(body.correlationId).toBeDefined()
    })
  })
})
