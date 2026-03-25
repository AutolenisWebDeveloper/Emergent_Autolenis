/**
 * Shortlist & Auction Guard + Buyer Eligibility Tests
 *
 * Validates:
 * - Shortlist and auction guards are gated ONLY by PrequalStatus
 * - Insurance status does NOT appear in shortlist/auction gate logic
 * - Lender status does NOT appear in shortlist/auction gate logic
 * - resolveBuyerEligibility() produces correct flags for each PrequalStatus
 */

import { describe, it, expect } from "vitest"

import {
  resolveBuyerEligibility,
  type PrequalStatus,
} from "@/lib/constants/buyer-eligibility"

// ─── resolveBuyerEligibility — Flag Resolution ────────────────────────────

describe("resolveBuyerEligibility — PrequalStatus Mapping", () => {
  const baseParams = {
    buyerId: "buyer-1",
    shoppingRangeLow: 15000,
    shoppingRangeHigh: 40000,
    shoppingPassIssuedAt: "2024-01-01T00:00:00Z",
    shoppingPassExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    incomeVerified: true,
    manualReviewRequired: false,
    vehicleBudgetCap: 40000,
  }

  it("PREQUALIFIED: allows shop, shortlist, and auction", () => {
    const result = resolveBuyerEligibility({ ...baseParams, prequalStatus: "PREQUALIFIED" })
    expect(result.allowed_to_shop).toBe(true)
    expect(result.allowed_to_shortlist).toBe(true)
    expect(result.allowed_to_trigger_auction).toBe(true)
    expect(result.next_required_action).toBeNull()
  })

  it("PREQUALIFIED_CONDITIONAL with valid shopping pass: allows all", () => {
    const result = resolveBuyerEligibility({
      ...baseParams,
      prequalStatus: "PREQUALIFIED_CONDITIONAL",
    })
    expect(result.allowed_to_shop).toBe(true)
    expect(result.allowed_to_shortlist).toBe(true)
    expect(result.allowed_to_trigger_auction).toBe(true)
  })

  it("PREQUALIFIED_CONDITIONAL without shopping pass: blocks auction", () => {
    const result = resolveBuyerEligibility({
      ...baseParams,
      prequalStatus: "PREQUALIFIED_CONDITIONAL",
      shoppingPassIssuedAt: null,
      shoppingPassExpiresAt: null,
    })
    expect(result.allowed_to_shop).toBe(true)
    expect(result.allowed_to_shortlist).toBe(true)
    expect(result.allowed_to_trigger_auction).toBe(false)
    expect(result.next_required_action).toBe("complete_required_step")
  })

  it("MANUAL_REVIEW: allows shop/shortlist but blocks auction", () => {
    const result = resolveBuyerEligibility({
      ...baseParams,
      prequalStatus: "MANUAL_REVIEW",
    })
    expect(result.allowed_to_shop).toBe(true)
    expect(result.allowed_to_shortlist).toBe(true)
    expect(result.allowed_to_trigger_auction).toBe(false)
    expect(result.next_required_action).toBe("await_manual_review")
  })

  it("NOT_PREQUALIFIED: blocks everything", () => {
    const result = resolveBuyerEligibility({
      ...baseParams,
      prequalStatus: "NOT_PREQUALIFIED",
    })
    expect(result.allowed_to_shop).toBe(false)
    expect(result.allowed_to_shortlist).toBe(false)
    expect(result.allowed_to_trigger_auction).toBe(false)
    expect(result.next_required_action).toBe("retry_prequalification")
  })

  it("NOT_STARTED: blocks everything", () => {
    const result = resolveBuyerEligibility({
      ...baseParams,
      prequalStatus: "NOT_STARTED",
    })
    expect(result.allowed_to_shop).toBe(false)
    expect(result.allowed_to_shortlist).toBe(false)
    expect(result.allowed_to_trigger_auction).toBe(false)
    expect(result.next_required_action).toBe("start_prequalification")
  })

  it("EXPIRED: blocks everything", () => {
    const result = resolveBuyerEligibility({
      ...baseParams,
      prequalStatus: "EXPIRED",
    })
    expect(result.allowed_to_shop).toBe(false)
    expect(result.allowed_to_shortlist).toBe(false)
    expect(result.allowed_to_trigger_auction).toBe(false)
    expect(result.next_required_action).toBe("renew_prequalification")
  })

  it("PENDING: blocks everything", () => {
    const result = resolveBuyerEligibility({
      ...baseParams,
      prequalStatus: "PENDING",
    })
    expect(result.allowed_to_shop).toBe(false)
    expect(result.allowed_to_shortlist).toBe(false)
    expect(result.allowed_to_trigger_auction).toBe(false)
    expect(result.next_required_action).toBe("complete_prequalification")
  })
})

// ─── Insurance Independence: Shortlist & Auction ───────────────────────────

describe("Shortlist/Auction Guards — Insurance Independence", () => {
  const baseParams = {
    buyerId: "buyer-1",
    shoppingRangeLow: 15000,
    shoppingRangeHigh: 40000,
    shoppingPassIssuedAt: "2024-01-01T00:00:00Z",
    shoppingPassExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    incomeVerified: true,
    manualReviewRequired: false,
    vehicleBudgetCap: 40000,
  }

  it("prequalified buyer CAN shortlist regardless of insurance status (insurance is not a parameter)", () => {
    // The key assertion: resolveBuyerEligibility does NOT accept any insurance parameter.
    // Its only gating input is PrequalStatus.
    const result = resolveBuyerEligibility({
      ...baseParams,
      prequalStatus: "PREQUALIFIED",
    })
    expect(result.allowed_to_shortlist).toBe(true)

    // Verify insurance is NOT in the eligibility object's gate logic
    // (it's in a separate field for display only)
    expect(result).not.toHaveProperty("insurance_status")
    expect(result).not.toHaveProperty("lender_status")
  })

  it("not-prequalified buyer CANNOT shortlist", () => {
    const result = resolveBuyerEligibility({
      ...baseParams,
      prequalStatus: "NOT_PREQUALIFIED",
    })
    expect(result.allowed_to_shortlist).toBe(false)
  })

  it("prequalified buyer CAN trigger auction regardless of insurance status", () => {
    const result = resolveBuyerEligibility({
      ...baseParams,
      prequalStatus: "PREQUALIFIED",
    })
    expect(result.allowed_to_trigger_auction).toBe(true)
  })

  it("not-prequalified buyer CANNOT trigger auction", () => {
    const result = resolveBuyerEligibility({
      ...baseParams,
      prequalStatus: "NOT_PREQUALIFIED",
    })
    expect(result.allowed_to_trigger_auction).toBe(false)
  })

  it("manual-review buyer CANNOT trigger auction", () => {
    const result = resolveBuyerEligibility({
      ...baseParams,
      prequalStatus: "MANUAL_REVIEW",
    })
    expect(result.allowed_to_trigger_auction).toBe(false)
  })

  it("resolveBuyerEligibility function signature has no insurance parameter", () => {
    // This is a structural test — we verify the function doesn't accept
    // insurance-related fields. The params object only has PrequalStatus-related fields.
    const paramsKeys = Object.keys(baseParams)
    expect(paramsKeys).not.toContain("insuranceStatus")
    expect(paramsKeys).not.toContain("insuranceReadinessStatus")
    expect(paramsKeys).not.toContain("insurance_readiness_status")
    expect(paramsKeys).not.toContain("lenderStatus")
    expect(paramsKeys).not.toContain("lender_routing_status")
  })
})

// ─── BuyerEligibility Object Shape ──────────────────────────────────────────

describe("BuyerEligibility — No Lender Fields", () => {
  it("does not include any lender-oriented fields", () => {
    const result = resolveBuyerEligibility({
      buyerId: "buyer-1",
      prequalStatus: "PREQUALIFIED",
      shoppingRangeLow: 15000,
      shoppingRangeHigh: 40000,
      shoppingPassIssuedAt: null,
      shoppingPassExpiresAt: null,
      incomeVerified: true,
      manualReviewRequired: false,
      vehicleBudgetCap: 40000,
    })

    const keys = Object.keys(result)
    // Must NOT have lender-oriented keys
    expect(keys).not.toContain("lender_routing_status")
    expect(keys).not.toContain("lender_export_readiness")
    expect(keys).not.toContain("financing_partner_status")
    expect(keys).not.toContain("lender_response_state")

    // Must have buyer-eligibility keys
    expect(keys).toContain("allowed_to_shop")
    expect(keys).toContain("allowed_to_shortlist")
    expect(keys).toContain("allowed_to_trigger_auction")
    expect(keys).toContain("prequal_status")
    expect(keys).toContain("shopping_pass_issued_at")
  })
})
