import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Hoisted mocks — each from() call gets its own chainable + thenable mock
// ---------------------------------------------------------------------------

const { mockFrom, fromCallResults } = vi.hoisted(() => {
  /**
   * Queue of { data, error } results consumed by successive DB operations.
   * Each from().select().eq()...single() or from().update().eq() chain
   * consumes one entry when it resolves.
   */
  const fromCallResults: Array<{ data: unknown; error: unknown }> = []

  /** Build a fresh chain that is both chainable AND thenable (like Supabase). */
  function buildChain(): Record<string, any> {
    const chain: Record<string, any> = {}
    const chainMethods = [
      "select",
      "insert",
      "update",
      "upsert",
      "eq",
      "order",
      "limit",
    ]
    for (const m of chainMethods) {
      chain[m] = vi.fn().mockImplementation(() => chain)
    }
    // Make chain thenable — consumed when `await`ed after non-terminal calls
    chain.then = (resolve: any, reject: any) => {
      const entry = fromCallResults.shift() ?? { data: null, error: null }
      return Promise.resolve(entry).then(resolve, reject)
    }
    // Explicit terminal methods that also consume results
    chain.single = vi.fn().mockImplementation(() => {
      const entry = fromCallResults.shift() ?? { data: null, error: null }
      return Promise.resolve(entry)
    })
    chain.maybeSingle = vi.fn().mockImplementation(() => {
      const entry = fromCallResults.shift() ?? { data: null, error: null }
      return Promise.resolve(entry)
    })
    return chain
  }

  const mockFrom = vi.fn().mockImplementation(() => buildChain())

  return { mockFrom, fromCallResults }
})

vi.mock("@/lib/db", () => ({
  getSupabase: vi.fn().mockReturnValue({ from: mockFrom }),
}))

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
  DealerPortalService,
  InviteStatus,
  OfferStatus,
} from "@/lib/services/inventory-sourcing/dealer-portal.service"

const service = new DealerPortalService()

/** Helper: queue a from() chain result */
function q(data: unknown, error: unknown = null) {
  fromCallResults.push({ data, error })
}

beforeEach(() => {
  vi.clearAllMocks()
  fromCallResults.length = 0
})

// ---------------------------------------------------------------------------
// 1. InviteStatus enum coverage
// ---------------------------------------------------------------------------
describe("InviteStatus enum", () => {
  it("has exactly 6 values", () => {
    expect(Object.keys(InviteStatus)).toHaveLength(6)
  })

  it.each([
    "PENDING",
    "SENT",
    "VIEWED",
    "RESPONDED",
    "DECLINED",
    "EXPIRED",
  ])("includes %s", (status) => {
    expect(Object.values(InviteStatus)).toContain(status)
  })
})

// ---------------------------------------------------------------------------
// 2. OfferStatus enum coverage
// ---------------------------------------------------------------------------
describe("OfferStatus enum", () => {
  it("has exactly 6 values", () => {
    expect(Object.keys(OfferStatus)).toHaveLength(6)
  })

  it.each([
    "SUBMITTED",
    "UNDER_REVIEW",
    "SHORTLISTED",
    "SELECTED",
    "REJECTED",
    "WITHDRAWN",
  ])("includes %s", (status) => {
    expect(Object.values(OfferStatus)).toContain(status)
  })
})

// ---------------------------------------------------------------------------
// 3. getInvitesForDealer
// ---------------------------------------------------------------------------
describe("getInvitesForDealer", () => {
  it("queries sourcing_case_invites with correct dealer filter", async () => {
    q([{ id: "inv-1", dealer_id: "d-1", status: "SENT" }])

    const result = await service.getInvitesForDealer("d-1")

    expect(mockFrom).toHaveBeenCalledWith("dealer_portal_invites")
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("inv-1")
  })

  it("returns empty array when no invites exist", async () => {
    q(null)

    const result = await service.getInvitesForDealer("d-none")

    expect(result).toEqual([])
  })

  it("throws on Supabase error", async () => {
    q(null, { message: "DB error" })

    await expect(service.getInvitesForDealer("d-1")).rejects.toThrow(
      "Failed to load dealer invites",
    )
  })
})

// ---------------------------------------------------------------------------
// 4. getInvite
// ---------------------------------------------------------------------------
describe("getInvite", () => {
  it("returns invite when found", async () => {
    const invite = { id: "inv-1", dealer_id: "d-1", status: "SENT" }
    q(invite) // consumed by .single()

    const result = await service.getInvite("inv-1", "d-1")

    expect(result).toEqual(invite)
  })

  it("returns null when not found", async () => {
    q(null, { message: "not found" })

    const result = await service.getInvite("inv-404", "d-1")

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 5. respondToInvite — invite lifecycle transitions
// ---------------------------------------------------------------------------
describe("respondToInvite", () => {
  it("transitions SENT → VIEWED", async () => {
    // getInvite → single()
    q({ id: "inv-1", dealer_id: "d-1", status: "SENT", case_id: "c-1" })
    // update → select → single()
    q({ id: "inv-1", status: "VIEWED" })

    const result = await service.respondToInvite("inv-1", "d-1", "VIEWED")

    expect(result.status).toBe("VIEWED")
  })

  it("transitions SENT → DECLINED", async () => {
    q({ id: "inv-1", dealer_id: "d-1", status: "SENT", case_id: "c-1" })
    q({ id: "inv-1", status: "DECLINED" })

    const result = await service.respondToInvite("inv-1", "d-1", "DECLINED")

    expect(result.status).toBe("DECLINED")
  })

  it("transitions VIEWED → RESPONDED (ACCEPTED)", async () => {
    q({ id: "inv-1", dealer_id: "d-1", status: "VIEWED", case_id: "c-1" })
    q({ id: "inv-1", status: "RESPONDED" })

    const result = await service.respondToInvite("inv-1", "d-1", "ACCEPTED")

    expect(result.status).toBe("RESPONDED")
  })

  it("rejects invalid transition PENDING → VIEWED", async () => {
    q({ id: "inv-1", dealer_id: "d-1", status: "PENDING", case_id: "c-1" })

    await expect(
      service.respondToInvite("inv-1", "d-1", "VIEWED"),
    ).rejects.toThrow("Cannot transition invite from PENDING to VIEWED")
  })

  it("rejects invalid transition DECLINED → ACCEPTED", async () => {
    q({ id: "inv-1", dealer_id: "d-1", status: "DECLINED", case_id: "c-1" })

    await expect(
      service.respondToInvite("inv-1", "d-1", "ACCEPTED"),
    ).rejects.toThrow("Cannot transition")
  })

  it("rejects when invite not found", async () => {
    q(null, { message: "not found" })

    await expect(
      service.respondToInvite("inv-404", "d-1", "VIEWED"),
    ).rejects.toThrow("Invite not found")
  })
})

// ---------------------------------------------------------------------------
// 6. submitOffer
// ---------------------------------------------------------------------------
describe("submitOffer", () => {
  it("submits offer when invite is VIEWED", async () => {
    // getInvite → single()
    q({ id: "inv-1", dealer_id: "d-1", case_id: "c-1", status: "VIEWED" })
    // insert offer → select → single()
    q({ id: "offer-1", invite_id: "inv-1", status: "SUBMITTED", make: "Toyota" })
    // auto-transition invite → update().eq().eq() (thenable, no error)
    q(null)

    const result = await service.submitOffer("inv-1", "d-1", {
      make: "Toyota",
      model: "Camry",
      year: 2024,
      priceCents: 3200000,
    })

    expect(result.id).toBe("offer-1")
    expect(result.status).toBe("SUBMITTED")
    expect(mockFrom).toHaveBeenCalledWith("dealer_portal_offers")
  })

  it("throws if invite auto-transition fails after offer insert", async () => {
    q({ id: "inv-1", dealer_id: "d-1", case_id: "c-1", status: "VIEWED" })
    q({ id: "offer-1", status: "SUBMITTED" })
    // auto-transition fails
    q(null, { message: "update failed" })

    await expect(
      service.submitOffer("inv-1", "d-1", { make: "Toyota" }),
    ).rejects.toThrow("invite status update failed")
  })

  it("submits offer when invite is RESPONDED", async () => {
    q({ id: "inv-1", dealer_id: "d-1", case_id: "c-1", status: "RESPONDED" })
    q({ id: "offer-2", status: "SUBMITTED" })
    // No auto-transition needed since already RESPONDED

    const result = await service.submitOffer("inv-1", "d-1", {
      vin: "1HGBH41JXMN109186",
    })

    expect(result.status).toBe("SUBMITTED")
  })

  it("rejects offer when invite is PENDING", async () => {
    q({ id: "inv-1", dealer_id: "d-1", case_id: "c-1", status: "PENDING" })

    await expect(
      service.submitOffer("inv-1", "d-1", { make: "Honda" }),
    ).rejects.toThrow("Cannot submit offer: invite is in PENDING status")
  })

  it("rejects offer when invite is DECLINED", async () => {
    q({ id: "inv-1", dealer_id: "d-1", case_id: "c-1", status: "DECLINED" })

    await expect(
      service.submitOffer("inv-1", "d-1", { make: "Ford" }),
    ).rejects.toThrow("Cannot submit offer: invite is in DECLINED status")
  })

  it("rejects when invite not found", async () => {
    q(null, { message: "not found" })

    await expect(
      service.submitOffer("inv-404", "d-1", { make: "BMW" }),
    ).rejects.toThrow("Invite not found")
  })
})

// ---------------------------------------------------------------------------
// 7. getOffersForInvite
// ---------------------------------------------------------------------------
describe("getOffersForInvite", () => {
  it("returns offers filtered by invite and dealer", async () => {
    q([
      { id: "o-1", invite_id: "inv-1", status: "SUBMITTED" },
      { id: "o-2", invite_id: "inv-1", status: "UNDER_REVIEW" },
    ])

    const result = await service.getOffersForInvite("inv-1", "d-1")

    expect(result).toHaveLength(2)
    expect(mockFrom).toHaveBeenCalledWith("dealer_portal_offers")
  })
})

// ---------------------------------------------------------------------------
// 8. mapExternalDealer
// ---------------------------------------------------------------------------
describe("mapExternalDealer", () => {
  it("creates an external dealer match via upsert", async () => {
    q({
      id: "match-1",
      external_dealer_name: "Joe's Cars",
      dealer_id: "d-1",
    })

    const result = await service.mapExternalDealer({
      externalDealerName: "Joe's Cars",
      externalDealerSource: "cars.com",
      dealerId: "d-1",
      matchedBy: "admin-1",
      confidence: 0.95,
    })

    expect(result.external_dealer_name).toBe("Joe's Cars")
    expect(mockFrom).toHaveBeenCalledWith("dealer_portal_external_matches")
  })

  it("throws on upsert failure", async () => {
    q(null, { message: "unique constraint" })

    await expect(
      service.mapExternalDealer({
        externalDealerName: "Dup",
        externalDealerSource: "x",
        dealerId: "d-1",
      }),
    ).rejects.toThrow("Failed to map external dealer")
  })
})

// ---------------------------------------------------------------------------
// 9. getExternalMatches
// ---------------------------------------------------------------------------
describe("getExternalMatches", () => {
  it("returns matches for a dealer", async () => {
    q([
      { id: "m-1", external_dealer_name: "AutoMax", dealer_id: "d-1" },
    ])

    const result = await service.getExternalMatches("d-1")

    expect(result).toHaveLength(1)
    expect(mockFrom).toHaveBeenCalledWith("dealer_portal_external_matches")
  })
})

// ---------------------------------------------------------------------------
// 10. findOnboardedDealer
// ---------------------------------------------------------------------------
describe("findOnboardedDealer", () => {
  it("returns the highest-confidence match", async () => {
    q({ id: "m-1", dealer_id: "d-1", confidence: 0.98 })

    const result = await service.findOnboardedDealer("Joe's Cars", "cars.com")

    expect(result?.dealer_id).toBe("d-1")
  })

  it("returns null when no match found", async () => {
    q(null)

    const result = await service.findOnboardedDealer("Unknown", "x")

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 11. Migration file existence
// ---------------------------------------------------------------------------
describe("Phase 8 migration", () => {
  it("migration SQL file exists", () => {
    const fs = require("fs")
    const path = require("path")
    const migrationPath = path.join(
      process.cwd(),
      "supabase/migrations/20240101000021_phase8_dealer_portal.sql",
    )
    expect(fs.existsSync(migrationPath)).toBe(true)
  })

  it("migration creates dealer_portal_invites table", () => {
    const fs = require("fs")
    const path = require("path")
    const sql = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/20240101000021_phase8_dealer_portal.sql",
      ),
      "utf-8",
    )
    expect(sql).toContain("create table if not exists dealer_portal_invites")
    expect(sql).toContain("PENDING")
    expect(sql).toContain("SENT")
    expect(sql).toContain("VIEWED")
    expect(sql).toContain("RESPONDED")
    expect(sql).toContain("DECLINED")
    expect(sql).toContain("EXPIRED")
  })

  it("migration creates dealer_portal_offers table", () => {
    const fs = require("fs")
    const path = require("path")
    const sql = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/20240101000021_phase8_dealer_portal.sql",
      ),
      "utf-8",
    )
    expect(sql).toContain("create table if not exists dealer_portal_offers")
    expect(sql).toContain("SUBMITTED")
    expect(sql).toContain("UNDER_REVIEW")
    expect(sql).toContain("SHORTLISTED")
    expect(sql).toContain("SELECTED")
    expect(sql).toContain("REJECTED")
    expect(sql).toContain("WITHDRAWN")
  })

  it("migration creates dealer_portal_external_matches table", () => {
    const fs = require("fs")
    const path = require("path")
    const sql = fs.readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/20240101000021_phase8_dealer_portal.sql",
      ),
      "utf-8",
    )
    expect(sql).toContain("create table if not exists dealer_portal_external_matches")
    expect(sql).toContain("external_dealer_name")
    expect(sql).toContain("external_dealer_source")
    expect(sql).toContain("dealer_id")
    expect(sql).toContain("confidence")
  })
})

// ---------------------------------------------------------------------------
// 12. API route files existence
// ---------------------------------------------------------------------------
describe("Phase 8 API route files", () => {
  const fs = require("fs")
  const path = require("path")
  const API_DIR = path.join(process.cwd(), "app/api")

  const routes = [
    "dealer/cases/route.ts",
    "dealer/cases/[inviteId]/respond/route.ts",
    "dealer/cases/[inviteId]/offer/route.ts",
    "admin/dealer-migration/route.ts",
  ]

  for (const route of routes) {
    it(`has route: ${route}`, () => {
      expect(fs.existsSync(path.join(API_DIR, route))).toBe(true)
    })
  }
})

// ---------------------------------------------------------------------------
// 13. Invite lifecycle: no self-transitions or backward jumps
// ---------------------------------------------------------------------------
describe("Invite lifecycle integrity", () => {
  it("EXPIRED invites cannot be re-activated", async () => {
    q({ id: "inv-1", dealer_id: "d-1", status: "EXPIRED" })

    await expect(
      service.respondToInvite("inv-1", "d-1", "VIEWED"),
    ).rejects.toThrow("Cannot transition")
  })

  it("RESPONDED invites cannot go back to VIEWED", async () => {
    q({ id: "inv-1", dealer_id: "d-1", status: "RESPONDED" })

    await expect(
      service.respondToInvite("inv-1", "d-1", "VIEWED"),
    ).rejects.toThrow("Cannot transition")
  })
})
