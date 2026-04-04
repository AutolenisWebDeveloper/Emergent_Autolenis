import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mock the Supabase client
// ---------------------------------------------------------------------------

const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockRange = vi.fn()

function resetChain() {
  mockSelect.mockReturnThis()
  mockSingle.mockReturnValue({ data: null, error: null })
  mockInsert.mockReturnThis()
  mockUpdate.mockReturnThis()
  mockEq.mockReturnThis()
  mockOrder.mockReturnThis()
  mockRange.mockReturnValue({ data: [], error: null })
}

vi.mock("@/lib/db", () => ({
  getSupabase: () => ({
    from: () => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: mockEq,
      order: mockOrder,
      range: mockRange,
      single: mockSingle,
    }),
  }),
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  BuyerPackageStatus,
  SourcingCaseStatus,
  InviteStatus,
  OfferStatus,
  BUYER_PACKAGE_TRANSITIONS,
  SOURCING_CASE_TRANSITIONS,
  INVITE_TRANSITIONS,
  OFFER_TRANSITIONS,
} from "@/lib/services/inventory-sourcing/case.service"

beforeEach(() => {
  vi.clearAllMocks()
  resetChain()
})

// ---------------------------------------------------------------------------
// 1. Status enum tests
// ---------------------------------------------------------------------------

describe("BuyerPackageStatus enum", () => {
  it("has all required values", () => {
    expect(BuyerPackageStatus.DRAFT).toBe("DRAFT")
    expect(BuyerPackageStatus.READY).toBe("READY")
    expect(BuyerPackageStatus.APPROVED).toBe("APPROVED")
    expect(BuyerPackageStatus.ARCHIVED).toBe("ARCHIVED")
  })
})

describe("SourcingCaseStatus enum", () => {
  it("has all required values", () => {
    expect(SourcingCaseStatus.OPEN).toBe("OPEN")
    expect(SourcingCaseStatus.INVITED).toBe("INVITED")
    expect(SourcingCaseStatus.RESPONDING).toBe("RESPONDING")
    expect(SourcingCaseStatus.OPTIONS_READY).toBe("OPTIONS_READY")
    expect(SourcingCaseStatus.SELECTED).toBe("SELECTED")
    expect(SourcingCaseStatus.CLOSED).toBe("CLOSED")
    expect(SourcingCaseStatus.CANCELLED).toBe("CANCELLED")
  })
})

describe("InviteStatus enum", () => {
  it("has all required values", () => {
    expect(InviteStatus.PENDING).toBe("PENDING")
    expect(InviteStatus.SENT).toBe("SENT")
    expect(InviteStatus.VIEWED).toBe("VIEWED")
    expect(InviteStatus.RESPONDED).toBe("RESPONDED")
    expect(InviteStatus.DECLINED).toBe("DECLINED")
    expect(InviteStatus.EXPIRED).toBe("EXPIRED")
  })
})

describe("OfferStatus enum", () => {
  it("has all required values", () => {
    expect(OfferStatus.SUBMITTED).toBe("SUBMITTED")
    expect(OfferStatus.UNDER_REVIEW).toBe("UNDER_REVIEW")
    expect(OfferStatus.SHORTLISTED).toBe("SHORTLISTED")
    expect(OfferStatus.SELECTED).toBe("SELECTED")
    expect(OfferStatus.REJECTED).toBe("REJECTED")
    expect(OfferStatus.WITHDRAWN).toBe("WITHDRAWN")
  })
})

// ---------------------------------------------------------------------------
// 2. Status transition tests
// ---------------------------------------------------------------------------

describe("BUYER_PACKAGE_TRANSITIONS", () => {
  it("allows DRAFT → READY", () => {
    expect(BUYER_PACKAGE_TRANSITIONS.DRAFT).toContain("READY")
  })

  it("allows DRAFT → ARCHIVED", () => {
    expect(BUYER_PACKAGE_TRANSITIONS.DRAFT).toContain("ARCHIVED")
  })

  it("allows READY → APPROVED", () => {
    expect(BUYER_PACKAGE_TRANSITIONS.READY).toContain("APPROVED")
  })

  it("allows READY → ARCHIVED", () => {
    expect(BUYER_PACKAGE_TRANSITIONS.READY).toContain("ARCHIVED")
  })

  it("allows APPROVED → ARCHIVED", () => {
    expect(BUYER_PACKAGE_TRANSITIONS.APPROVED).toContain("ARCHIVED")
  })

  it("disallows transitions from ARCHIVED", () => {
    expect(BUYER_PACKAGE_TRANSITIONS.ARCHIVED).toEqual([])
  })

  it("does not allow DRAFT → APPROVED directly", () => {
    expect(BUYER_PACKAGE_TRANSITIONS.DRAFT).not.toContain("APPROVED")
  })
})

describe("SOURCING_CASE_TRANSITIONS", () => {
  it("allows OPEN → INVITED", () => {
    expect(SOURCING_CASE_TRANSITIONS.OPEN).toContain("INVITED")
  })

  it("allows OPEN → CANCELLED", () => {
    expect(SOURCING_CASE_TRANSITIONS.OPEN).toContain("CANCELLED")
  })

  it("allows full lifecycle OPEN → INVITED → RESPONDING → OPTIONS_READY → SELECTED → CLOSED", () => {
    expect(SOURCING_CASE_TRANSITIONS.OPEN).toContain("INVITED")
    expect(SOURCING_CASE_TRANSITIONS.INVITED).toContain("RESPONDING")
    expect(SOURCING_CASE_TRANSITIONS.RESPONDING).toContain("OPTIONS_READY")
    expect(SOURCING_CASE_TRANSITIONS.OPTIONS_READY).toContain("SELECTED")
    expect(SOURCING_CASE_TRANSITIONS.SELECTED).toContain("CLOSED")
  })

  it("disallows transitions from CLOSED", () => {
    expect(SOURCING_CASE_TRANSITIONS.CLOSED).toEqual([])
  })

  it("disallows transitions from CANCELLED", () => {
    expect(SOURCING_CASE_TRANSITIONS.CANCELLED).toEqual([])
  })

  it("allows cancellation from any active status", () => {
    expect(SOURCING_CASE_TRANSITIONS.OPEN).toContain("CANCELLED")
    expect(SOURCING_CASE_TRANSITIONS.INVITED).toContain("CANCELLED")
    expect(SOURCING_CASE_TRANSITIONS.RESPONDING).toContain("CANCELLED")
    expect(SOURCING_CASE_TRANSITIONS.OPTIONS_READY).toContain("CANCELLED")
  })
})

describe("INVITE_TRANSITIONS", () => {
  it("allows PENDING → SENT", () => {
    expect(INVITE_TRANSITIONS.PENDING).toContain("SENT")
  })

  it("allows SENT → VIEWED", () => {
    expect(INVITE_TRANSITIONS.SENT).toContain("VIEWED")
  })

  it("allows VIEWED → RESPONDED or DECLINED", () => {
    expect(INVITE_TRANSITIONS.VIEWED).toContain("RESPONDED")
    expect(INVITE_TRANSITIONS.VIEWED).toContain("DECLINED")
  })

  it("allows expiration from PENDING, SENT, or VIEWED", () => {
    expect(INVITE_TRANSITIONS.PENDING).toContain("EXPIRED")
    expect(INVITE_TRANSITIONS.SENT).toContain("EXPIRED")
    expect(INVITE_TRANSITIONS.VIEWED).toContain("EXPIRED")
  })

  it("disallows transitions from terminal states", () => {
    expect(INVITE_TRANSITIONS.RESPONDED).toEqual([])
    expect(INVITE_TRANSITIONS.DECLINED).toEqual([])
    expect(INVITE_TRANSITIONS.EXPIRED).toEqual([])
  })
})

describe("OFFER_TRANSITIONS", () => {
  it("allows SUBMITTED → UNDER_REVIEW", () => {
    expect(OFFER_TRANSITIONS.SUBMITTED).toContain("UNDER_REVIEW")
  })

  it("allows withdrawal from non-terminal states", () => {
    expect(OFFER_TRANSITIONS.SUBMITTED).toContain("WITHDRAWN")
    expect(OFFER_TRANSITIONS.UNDER_REVIEW).toContain("WITHDRAWN")
    expect(OFFER_TRANSITIONS.SHORTLISTED).toContain("WITHDRAWN")
  })

  it("allows full lifecycle SUBMITTED → UNDER_REVIEW → SHORTLISTED → SELECTED", () => {
    expect(OFFER_TRANSITIONS.SUBMITTED).toContain("UNDER_REVIEW")
    expect(OFFER_TRANSITIONS.UNDER_REVIEW).toContain("SHORTLISTED")
    expect(OFFER_TRANSITIONS.SHORTLISTED).toContain("SELECTED")
  })

  it("disallows transitions from terminal states", () => {
    expect(OFFER_TRANSITIONS.SELECTED).toEqual([])
    expect(OFFER_TRANSITIONS.REJECTED).toEqual([])
    expect(OFFER_TRANSITIONS.WITHDRAWN).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 3. Service function tests — buyer packages
// ---------------------------------------------------------------------------

describe("createBuyerPackageFromLead", () => {
  it("throws when lead not found", async () => {
    mockSingle.mockReturnValueOnce({ data: null, error: { message: "Not found" } })

    const { createBuyerPackageFromLead } = await import(
      "@/lib/services/inventory-sourcing/case.service"
    )

    await expect(createBuyerPackageFromLead("missing-lead")).rejects.toThrow("Lead not found")
  })
})

describe("createBuyerPackageFromSourcingRequest", () => {
  it("throws when sourcing request not found", async () => {
    mockSingle.mockReturnValueOnce({ data: null, error: { message: "Not found" } })

    const { createBuyerPackageFromSourcingRequest } = await import(
      "@/lib/services/inventory-sourcing/case.service"
    )

    await expect(createBuyerPackageFromSourcingRequest("missing-req")).rejects.toThrow(
      "Sourcing request not found",
    )
  })
})

describe("updateBuyerPackageStatus", () => {
  it("throws when package not found", async () => {
    mockSingle.mockReturnValueOnce({ data: null, error: { message: "Not found" } })

    const { updateBuyerPackageStatus } = await import(
      "@/lib/services/inventory-sourcing/case.service"
    )

    await expect(updateBuyerPackageStatus("missing-pkg", "READY")).rejects.toThrow(
      "Buyer package not found",
    )
  })

  it("throws on invalid transition", async () => {
    mockSingle.mockReturnValueOnce({ data: { status: "ARCHIVED" }, error: null })

    const { updateBuyerPackageStatus } = await import(
      "@/lib/services/inventory-sourcing/case.service"
    )

    await expect(updateBuyerPackageStatus("pkg-1", "READY")).rejects.toThrow(
      "Invalid status transition: ARCHIVED → READY",
    )
  })
})

// ---------------------------------------------------------------------------
// 4. Service function tests — sourcing cases
// ---------------------------------------------------------------------------

describe("updateSourcingCaseStatus", () => {
  it("throws when case not found", async () => {
    mockSingle.mockReturnValueOnce({ data: null, error: { message: "Not found" } })

    const { updateSourcingCaseStatus } = await import(
      "@/lib/services/inventory-sourcing/case.service"
    )

    await expect(updateSourcingCaseStatus("missing-case", "INVITED")).rejects.toThrow(
      "Sourcing case not found",
    )
  })

  it("throws on invalid transition", async () => {
    mockSingle.mockReturnValueOnce({ data: { status: "CLOSED" }, error: null })

    const { updateSourcingCaseStatus } = await import(
      "@/lib/services/inventory-sourcing/case.service"
    )

    await expect(updateSourcingCaseStatus("case-1", "OPEN")).rejects.toThrow(
      "Invalid status transition: CLOSED → OPEN",
    )
  })
})

// ---------------------------------------------------------------------------
// 5. Service function tests — invites
// ---------------------------------------------------------------------------

describe("inviteDealerToCase", () => {
  it("throws when neither dealerId nor externalDealerId is provided", async () => {
    const { inviteDealerToCase } = await import(
      "@/lib/services/inventory-sourcing/case.service"
    )

    await expect(
      inviteDealerToCase({ sourcingCaseId: "case-1" }),
    ).rejects.toThrow("Either dealerId or externalDealerId is required")
  })
})

describe("updateInviteStatus", () => {
  it("throws when invite not found", async () => {
    mockSingle.mockReturnValueOnce({ data: null, error: { message: "Not found" } })

    const { updateInviteStatus } = await import(
      "@/lib/services/inventory-sourcing/case.service"
    )

    await expect(updateInviteStatus("missing-invite", "SENT")).rejects.toThrow(
      "Invite not found",
    )
  })

  it("throws on invalid transition", async () => {
    mockSingle.mockReturnValueOnce({ data: { status: "EXPIRED" }, error: null })

    const { updateInviteStatus } = await import(
      "@/lib/services/inventory-sourcing/case.service"
    )

    await expect(updateInviteStatus("inv-1", "SENT")).rejects.toThrow(
      "Invalid status transition: EXPIRED → SENT",
    )
  })
})

// ---------------------------------------------------------------------------
// 6. Service function tests — offers
// ---------------------------------------------------------------------------

describe("submitOffer", () => {
  it("throws when neither dealerId nor externalDealerId is provided", async () => {
    const { submitOffer } = await import(
      "@/lib/services/inventory-sourcing/case.service"
    )

    await expect(
      submitOffer({ sourcingCaseId: "case-1" }),
    ).rejects.toThrow("Either dealerId or externalDealerId is required")
  })
})

describe("updateOfferStatus", () => {
  it("throws when offer not found", async () => {
    mockSingle.mockReturnValueOnce({ data: null, error: { message: "Not found" } })

    const { updateOfferStatus } = await import(
      "@/lib/services/inventory-sourcing/case.service"
    )

    await expect(updateOfferStatus("missing-offer", "UNDER_REVIEW")).rejects.toThrow(
      "Offer not found",
    )
  })

  it("throws on invalid transition", async () => {
    mockSingle.mockReturnValueOnce({ data: { status: "WITHDRAWN" }, error: null })

    const { updateOfferStatus } = await import(
      "@/lib/services/inventory-sourcing/case.service"
    )

    await expect(updateOfferStatus("offer-1", "SELECTED")).rejects.toThrow(
      "Invalid status transition: WITHDRAWN → SELECTED",
    )
  })
})

// ---------------------------------------------------------------------------
// 7. Migration artifact existence
// ---------------------------------------------------------------------------

describe("Phase 6 migration file", () => {
  it("exists on disk", () => {
    const fs = require("node:fs")
    const path = "supabase/migrations/20240101000021_phase6_buyer_packages_sourcing.sql"
    expect(fs.existsSync(path)).toBe(true)
  })

  it("creates buyer_packages_intake table", () => {
    const fs = require("node:fs")
    const sql = fs.readFileSync(
      "supabase/migrations/20240101000021_phase6_buyer_packages_sourcing.sql",
      "utf8",
    )
    expect(sql).toContain("create table if not exists buyer_packages_intake")
  })

  it("creates sourcing_cases table", () => {
    const fs = require("node:fs")
    const sql = fs.readFileSync(
      "supabase/migrations/20240101000021_phase6_buyer_packages_sourcing.sql",
      "utf8",
    )
    expect(sql).toContain("create table if not exists sourcing_cases")
  })

  it("creates sourcing_case_invites table", () => {
    const fs = require("node:fs")
    const sql = fs.readFileSync(
      "supabase/migrations/20240101000021_phase6_buyer_packages_sourcing.sql",
      "utf8",
    )
    expect(sql).toContain("create table if not exists sourcing_case_invites")
  })

  it("creates sourcing_case_offers table", () => {
    const fs = require("node:fs")
    const sql = fs.readFileSync(
      "supabase/migrations/20240101000021_phase6_buyer_packages_sourcing.sql",
      "utf8",
    )
    expect(sql).toContain("create table if not exists sourcing_case_offers")
  })
})
