/**
 * Phase 5 – Inventory Lead Service unit tests
 *
 * Tests the lead service functions for:
 * - Lead CRUD (create, get, list, status update, assignment)
 * - Lead events (write, read)
 * - External dealer matching (create, list, deactivate)
 * - Vehicle sourcing requests (create, get, list, status update)
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// --------------- hoisted mocks ---------------
const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn()
  return { mockFrom }
})

vi.mock("@/lib/db", () => ({
  getSupabase: vi.fn().mockReturnValue({ from: mockFrom }),
}))

// --------------- import under test ---------------
import {
  writeLeadEvent,
  getLeadEvents,
  createLead,
  getLeadById,
  listLeads,
  updateLeadStatus,
  assignLead,
  createExternalDealerMatch,
  listExternalDealerMatches,
  deactivateExternalDealerMatch,
  createSourcingRequest,
  getSourcingRequestById,
  listSourcingRequests,
  updateSourcingRequestStatus,
  LEAD_STATUSES,
  SOURCING_STATUSES,
  LEAD_TYPES,
} from "@/lib/services/inventory-sourcing/lead.service"

// --------------- helpers ---------------

/** Build a chainable Supabase query mock that resolves to the given result. */
function chainMock(result: { data?: any; error?: any; count?: number | null }) {
  const chain: any = {}
  for (const m of ["select", "insert", "update", "delete", "eq", "order", "range", "single"]) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // Make chain thenable
  Object.defineProperty(chain, "then", {
    value: (resolve: (v: any) => any, reject?: (e: any) => any) =>
      Promise.resolve(result).then(resolve, reject),
    writable: true,
    configurable: true,
  })
  return chain
}

// --------------- tests ---------------

describe("Lead Service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Constants ────────────────────────────────────────────────────

  describe("constants", () => {
    it("exports valid LEAD_STATUSES", () => {
      expect(LEAD_STATUSES).toContain("NEW")
      expect(LEAD_STATUSES).toContain("ASSIGNED")
      expect(LEAD_STATUSES).toContain("CONVERTED")
      expect(LEAD_STATUSES).toContain("CLOSED")
      expect(LEAD_STATUSES).toContain("REJECTED")
      expect(LEAD_STATUSES).toHaveLength(8)
    })

    it("exports valid SOURCING_STATUSES", () => {
      expect(SOURCING_STATUSES).toContain("OPEN")
      expect(SOURCING_STATUSES).toContain("SEARCHING")
      expect(SOURCING_STATUSES).toContain("OPTIONS_READY")
      expect(SOURCING_STATUSES).toContain("CONVERTED")
      expect(SOURCING_STATUSES).toHaveLength(6)
    })

    it("exports valid LEAD_TYPES", () => {
      expect(LEAD_TYPES).toEqual(["CLAIM", "SOURCE"])
    })
  })

  // ── writeLeadEvent ───────────────────────────────────────────────

  describe("writeLeadEvent", () => {
    it("inserts an event row into inventory_lead_events", async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null })
      mockFrom.mockReturnValue({ insert: insertMock })

      await writeLeadEvent("lead-1", "STATUS_CHANGED", "admin-1", { new_status: "REVIEW" })

      expect(mockFrom).toHaveBeenCalledWith("inventory_lead_events")
      expect(insertMock).toHaveBeenCalledWith({
        lead_id: "lead-1",
        event_type: "STATUS_CHANGED",
        actor_user_id: "admin-1",
        payload: { new_status: "REVIEW" },
      })
    })

    it("throws when insert fails", async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: { message: "DB down" } })
      mockFrom.mockReturnValue({ insert: insertMock })

      await expect(writeLeadEvent("lead-1", "CREATED")).rejects.toThrow("writeLeadEvent failed")
    })
  })

  // ── getLeadEvents ────────────────────────────────────────────────

  describe("getLeadEvents", () => {
    it("returns events for a lead", async () => {
      const events = [
        { id: "e1", lead_id: "lead-1", event_type: "LEAD_CREATED" },
        { id: "e2", lead_id: "lead-1", event_type: "STATUS_CHANGED" },
      ]
      const chain = chainMock({ data: events, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await getLeadEvents("lead-1")
      expect(result).toEqual(events)
      expect(mockFrom).toHaveBeenCalledWith("inventory_lead_events")
    })

    it("returns empty array when no events exist", async () => {
      const chain = chainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await getLeadEvents("lead-none")
      expect(result).toEqual([])
    })

    it("throws on error", async () => {
      const chain = chainMock({ data: null, error: { message: "query failed" } })
      mockFrom.mockReturnValue(chain)

      await expect(getLeadEvents("lead-1")).rejects.toThrow("getLeadEvents failed")
    })
  })

  // ── createLead ───────────────────────────────────────────────────

  describe("createLead", () => {
    it("creates a CLAIM lead and writes a LEAD_CREATED event", async () => {
      const createdLead = { id: "lead-new", lead_type: "CLAIM", status: "NEW" }

      // First call: insert into inventory_leads
      const insertChain = chainMock({ data: createdLead, error: null })
      // Second call: insert into inventory_lead_events
      const eventInsert = vi.fn().mockResolvedValue({ error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === "inventory_leads") return insertChain
        if (table === "inventory_lead_events") return { insert: eventInsert }
        return chainMock({ data: null, error: null })
      })

      const result = await createLead(
        { listing_id: "listing-1", buyer_email: "buyer@test.com", lead_type: "CLAIM" },
        "user-1",
      )

      expect(result).toEqual(createdLead)
      expect(mockFrom).toHaveBeenCalledWith("inventory_leads")
      expect(mockFrom).toHaveBeenCalledWith("inventory_lead_events")
      expect(eventInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_id: "lead-new",
          event_type: "LEAD_CREATED",
          actor_user_id: "user-1",
        }),
      )
    })

    it("throws when lead insert fails", async () => {
      const insertChain = chainMock({ data: null, error: { message: "insert error" } })
      mockFrom.mockReturnValue(insertChain)

      await expect(
        createLead({ buyer_email: "fail@test.com" }),
      ).rejects.toThrow("createLead failed")
    })
  })

  // ── getLeadById ──────────────────────────────────────────────────

  describe("getLeadById", () => {
    it("returns a lead by id", async () => {
      const lead = { id: "lead-1", status: "NEW", lead_type: "CLAIM" }
      const chain = chainMock({ data: lead, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await getLeadById("lead-1")
      expect(result).toEqual(lead)
      expect(mockFrom).toHaveBeenCalledWith("inventory_leads")
    })

    it("throws when not found", async () => {
      const chain = chainMock({ data: null, error: { message: "not found" } })
      mockFrom.mockReturnValue(chain)

      await expect(getLeadById("nonexistent")).rejects.toThrow("getLeadById failed")
    })
  })

  // ── listLeads ────────────────────────────────────────────────────

  describe("listLeads", () => {
    it("lists leads with defaults", async () => {
      const leads = [{ id: "lead-1" }, { id: "lead-2" }]
      const chain = chainMock({ data: leads, error: null, count: 2 })
      mockFrom.mockReturnValue(chain)

      const result = await listLeads({})
      expect(result.leads).toEqual(leads)
      expect(result.total).toBe(2)
      expect(result.limit).toBe(50)
      expect(result.offset).toBe(0)
    })

    it("caps limit at 200", async () => {
      const chain = chainMock({ data: [], error: null, count: 0 })
      mockFrom.mockReturnValue(chain)

      const result = await listLeads({ limit: 999 })
      expect(result.limit).toBe(200)
    })

    it("floors offset at 0", async () => {
      const chain = chainMock({ data: [], error: null, count: 0 })
      mockFrom.mockReturnValue(chain)

      const result = await listLeads({ offset: -5 })
      expect(result.offset).toBe(0)
    })

    it("throws on error", async () => {
      const chain = chainMock({ data: null, error: { message: "query failed" } })
      mockFrom.mockReturnValue(chain)

      await expect(listLeads({})).rejects.toThrow("listLeads failed")
    })
  })

  // ── updateLeadStatus ─────────────────────────────────────────────

  describe("updateLeadStatus", () => {
    it("updates lead status and writes an event", async () => {
      const updated = { id: "lead-1", status: "REVIEW" }
      const updateChain = chainMock({ data: updated, error: null })
      const eventInsert = vi.fn().mockResolvedValue({ error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === "inventory_leads") return updateChain
        if (table === "inventory_lead_events") return { insert: eventInsert }
        return chainMock({ data: null, error: null })
      })

      const result = await updateLeadStatus("lead-1", "REVIEW", "admin-1", "reviewing now")
      expect(result).toEqual(updated)
      expect(eventInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: "STATUS_CHANGED",
          payload: { new_status: "REVIEW", notes: "reviewing now" },
        }),
      )
    })

    it("rejects invalid status", async () => {
      await expect(
        updateLeadStatus("lead-1", "INVALID" as any),
      ).rejects.toThrow("Invalid lead status")
    })
  })

  // ── assignLead ───────────────────────────────────────────────────

  describe("assignLead", () => {
    it("assigns a dealer and auto-transitions status from NEW to ASSIGNED", async () => {
      const lead = { id: "lead-1", status: "NEW" }
      const assigned = { id: "lead-1", status: "ASSIGNED", assigned_dealer_id: "dealer-1" }

      // getLeadById chain (via select().eq().single())
      const getChain = chainMock({ data: lead, error: null })
      // update chain
      const updateChain = chainMock({ data: assigned, error: null })
      const eventInsert = vi.fn().mockResolvedValue({ error: null })

      let callCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === "inventory_leads") {
          callCount++
          // First call is getLeadById, second is the update
          return callCount <= 1 ? getChain : updateChain
        }
        if (table === "inventory_lead_events") return { insert: eventInsert }
        return chainMock({ data: null, error: null })
      })

      const result = await assignLead(
        "lead-1",
        { assigned_dealer_id: "dealer-1" },
        "admin-1",
      )

      expect(result).toEqual(assigned)
      expect(eventInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: "LEAD_ASSIGNED",
          payload: expect.objectContaining({ assigned_dealer_id: "dealer-1" }),
        }),
      )
    })

    it("auto-transitions status from REVIEW to ASSIGNED", async () => {
      const lead = { id: "lead-2", status: "REVIEW" }
      const assigned = { id: "lead-2", status: "ASSIGNED", assigned_admin_user_id: "admin-2" }

      const getChain = chainMock({ data: lead, error: null })
      const updateChain = chainMock({ data: assigned, error: null })
      const eventInsert = vi.fn().mockResolvedValue({ error: null })

      let callCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === "inventory_leads") {
          callCount++
          return callCount <= 1 ? getChain : updateChain
        }
        if (table === "inventory_lead_events") return { insert: eventInsert }
        return chainMock({ data: null, error: null })
      })

      const result = await assignLead(
        "lead-2",
        { assigned_admin_user_id: "admin-2" },
        "admin-1",
      )

      expect(result).toEqual(assigned)
    })

    it("does not change status when lead is in advanced state", async () => {
      const lead = { id: "lead-3", status: "CONTACTED" }
      const assigned = { id: "lead-3", status: "CONTACTED", assigned_dealer_id: "dealer-2" }

      const getChain = chainMock({ data: lead, error: null })
      const updateChain = chainMock({ data: assigned, error: null })
      const eventInsert = vi.fn().mockResolvedValue({ error: null })

      let callCount = 0
      mockFrom.mockImplementation((table: string) => {
        if (table === "inventory_leads") {
          callCount++
          return callCount <= 1 ? getChain : updateChain
        }
        if (table === "inventory_lead_events") return { insert: eventInsert }
        return chainMock({ data: null, error: null })
      })

      const result = await assignLead(
        "lead-3",
        { assigned_dealer_id: "dealer-2" },
        "admin-1",
      )

      // Status should remain CONTACTED, not be overwritten to ASSIGNED
      expect(result.status).toBe("CONTACTED")
    })
  })

  // ── External Dealer Matches ──────────────────────────────────────

  describe("createExternalDealerMatch", () => {
    it("creates a match record", async () => {
      const match = {
        id: "match-1",
        external_dealer_id: "ext-1",
        dealer_id: "dealer-1",
        match_type: "ADMIN_CONFIRMED",
        confidence_score: 100,
        is_active: true,
      }
      const chain = chainMock({ data: match, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await createExternalDealerMatch("ext-1", "dealer-1")
      expect(result).toEqual(match)
      expect(mockFrom).toHaveBeenCalledWith("external_dealer_matches")
    })

    it("throws on error", async () => {
      const chain = chainMock({ data: null, error: { message: "duplicate" } })
      mockFrom.mockReturnValue(chain)

      await expect(
        createExternalDealerMatch("ext-1", "dealer-1"),
      ).rejects.toThrow("createExternalDealerMatch failed")
    })
  })

  describe("listExternalDealerMatches", () => {
    it("lists active matches", async () => {
      const matches = [{ id: "match-1", is_active: true }]
      const chain = chainMock({ data: matches, error: null, count: 1 })
      mockFrom.mockReturnValue(chain)

      const result = await listExternalDealerMatches({ is_active: true })
      expect(result.matches).toEqual(matches)
      expect(result.total).toBe(1)
    })
  })

  describe("deactivateExternalDealerMatch", () => {
    it("sets is_active to false", async () => {
      const deactivated = { id: "match-1", is_active: false }
      const chain = chainMock({ data: deactivated, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await deactivateExternalDealerMatch("match-1")
      expect(result.is_active).toBe(false)
    })
  })

  // ── Sourcing Requests ────────────────────────────────────────────

  describe("createSourcingRequest", () => {
    it("creates a sourcing request with OPEN status", async () => {
      const request = { id: "sr-1", status: "OPEN", make: "Toyota", model: "Camry" }
      const chain = chainMock({ data: request, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await createSourcingRequest({
        buyer_email: "buyer@test.com",
        make: "Toyota",
        model: "Camry",
        year_min: 2020,
        year_max: 2024,
        max_price: 35000,
      })

      expect(result).toEqual(request)
      expect(mockFrom).toHaveBeenCalledWith("vehicle_sourcing_requests")
    })

    it("throws on error", async () => {
      const chain = chainMock({ data: null, error: { message: "insert error" } })
      mockFrom.mockReturnValue(chain)

      await expect(createSourcingRequest({})).rejects.toThrow("createSourcingRequest failed")
    })
  })

  describe("getSourcingRequestById", () => {
    it("returns a request by id", async () => {
      const request = { id: "sr-1", status: "OPEN" }
      const chain = chainMock({ data: request, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await getSourcingRequestById("sr-1")
      expect(result).toEqual(request)
    })
  })

  describe("listSourcingRequests", () => {
    it("lists requests with defaults", async () => {
      const requests = [{ id: "sr-1" }, { id: "sr-2" }]
      const chain = chainMock({ data: requests, error: null, count: 2 })
      mockFrom.mockReturnValue(chain)

      const result = await listSourcingRequests({})
      expect(result.requests).toEqual(requests)
      expect(result.total).toBe(2)
    })
  })

  describe("updateSourcingRequestStatus", () => {
    it("updates status with assignment", async () => {
      const updated = { id: "sr-1", status: "ASSIGNED", assigned_dealer_id: "dealer-1" }
      const chain = chainMock({ data: updated, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await updateSourcingRequestStatus("sr-1", "ASSIGNED", {
        assigned_dealer_id: "dealer-1",
      })
      expect(result.status).toBe("ASSIGNED")
    })

    it("rejects invalid sourcing status", async () => {
      await expect(
        updateSourcingRequestStatus("sr-1", "BOGUS" as any),
      ).rejects.toThrow("Invalid sourcing status")
    })
  })
})
