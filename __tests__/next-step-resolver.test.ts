/**
 * Tests for the Next Best Step Resolver.
 *
 * Validates that the resolver correctly maps each lifecycle state
 * to the appropriate CTA, action cards, and status strip.
 */

import { describe, expect, it } from "vitest"
import { resolveNextStep } from "@/lib/ai/next-step-resolver"
import type { ConciergeContext, BuyerLifecycleContext } from "@/lib/ai/context-loader"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBuyerCtx(buyer: Partial<BuyerLifecycleContext> = {}): ConciergeContext {
  return {
    userId: "user_1",
    role: "buyer",
    workspaceId: "ws_1",
    workspaceMode: "LIVE",
    buyer: {
      prequal: { exists: false, creditTier: null, softPullCompleted: false, consentGiven: false },
      shortlist: { count: 0 },
      auction: null,
      deal: null,
      payments: { depositStatus: null, serviceFeeStatus: null },
      insurance: { status: null },
      contractShield: { status: null, issuesFound: false },
      esign: { status: null },
      pickup: { status: null, scheduledDate: null },
      ...buyer,
    },
    dealer: null,
    affiliate: null,
    admin: null,
  }
}

// ---------------------------------------------------------------------------
// Buyer lifecycle
// ---------------------------------------------------------------------------

describe("resolveNextStep — buyer lifecycle", () => {
  it("returns prequal step when no prequal exists", () => {
    const result = resolveNextStep(makeBuyerCtx())
    expect(result.currentStep).toBe("prequal")
    expect(result.cta.label).toContain("Pre-Qualification")
    expect(result.actionCards.length).toBeGreaterThan(0)
    expect(result.statusStripSteps.length).toBeGreaterThan(0)
  })

  it("returns shortlist step when prequal done but no requests", () => {
    const result = resolveNextStep(
      makeBuyerCtx({
        prequal: { exists: true, creditTier: "GOOD", softPullCompleted: true, consentGiven: true },
      }),
    )
    expect(result.currentStep).toBe("shortlist")
    expect(result.cta.label).toContain("Vehicle Request")
  })

  it("returns deposit step when auction is pending deposit", () => {
    const result = resolveNextStep(
      makeBuyerCtx({
        prequal: { exists: true, creditTier: "GOOD", softPullCompleted: true, consentGiven: true },
        shortlist: { count: 1 },
        auction: { id: "auc_1", status: "PENDING_DEPOSIT", offerCount: 0, endsAt: null },
      }),
    )
    expect(result.currentStep).toBe("deposit")
    expect(result.cta.label).toContain("Deposit")
    expect(result.actionCards[0].type).toBe("pay")
  })

  it("returns auction step when auction is active", () => {
    const result = resolveNextStep(
      makeBuyerCtx({
        prequal: { exists: true, creditTier: "GOOD", softPullCompleted: true, consentGiven: true },
        shortlist: { count: 1 },
        auction: { id: "auc_1", status: "ACTIVE", offerCount: 3, endsAt: "2026-03-01T00:00:00Z" },
      }),
    )
    expect(result.currentStep).toBe("auction")
    expect(result.cta.description).toContain("3 offer(s)")
    expect(result.actionCards[0].type).toBe("track_auction")
  })

  it("returns best_price step when auction is closed with no deal selected", () => {
    const result = resolveNextStep(
      makeBuyerCtx({
        prequal: { exists: true, creditTier: "GOOD", softPullCompleted: true, consentGiven: true },
        shortlist: { count: 1 },
        auction: { id: "auc_1", status: "CLOSED", offerCount: 5, endsAt: null },
      }),
    )
    expect(result.currentStep).toBe("best_price")
    expect(result.cta.label).toContain("Review")
    expect(result.actionCards[0].type).toBe("review_offers")
  })

  it("returns financing_fee step when deal is selected", () => {
    const result = resolveNextStep(
      makeBuyerCtx({
        prequal: { exists: true, creditTier: "GOOD", softPullCompleted: true, consentGiven: true },
        shortlist: { count: 1 },
        deal: { id: "deal_1", status: "SELECTED", vehicleSummary: "2024 Toyota Camry" },
      }),
    )
    expect(result.currentStep).toBe("financing_fee")
    expect(result.cta.label).toContain("Payment")
    expect(result.actionCards[0].type).toBe("pay")
  })

  it("returns insurance step when fee is paid", () => {
    const result = resolveNextStep(
      makeBuyerCtx({
        prequal: { exists: true, creditTier: "GOOD", softPullCompleted: true, consentGiven: true },
        shortlist: { count: 1 },
        deal: { id: "deal_1", status: "FEE_PAID", vehicleSummary: "2024 Toyota Camry" },
        payments: { depositStatus: "SUCCEEDED", serviceFeeStatus: "SUCCEEDED" },
      }),
    )
    expect(result.currentStep).toBe("insurance")
    expect(result.cta.label).toContain("Insurance")
  })

  it("returns contract_shield step with fix list when issues found", () => {
    const result = resolveNextStep(
      makeBuyerCtx({
        prequal: { exists: true, creditTier: "GOOD", softPullCompleted: true, consentGiven: true },
        shortlist: { count: 1 },
        deal: { id: "deal_1", status: "CONTRACT_REVIEW", vehicleSummary: "2024 Toyota Camry" },
        contractShield: { status: "ISSUES_FOUND", issuesFound: true },
      }),
    )
    expect(result.currentStep).toBe("contract_shield")
    expect(result.cta.label).toContain("Issues")
    expect(result.actionCards.some((c) => c.type === "view_fix_list")).toBe(true)
  })

  it("returns esign step when contract is approved", () => {
    const result = resolveNextStep(
      makeBuyerCtx({
        prequal: { exists: true, creditTier: "GOOD", softPullCompleted: true, consentGiven: true },
        shortlist: { count: 1 },
        deal: { id: "deal_1", status: "CONTRACT_APPROVED", vehicleSummary: "2024 Toyota Camry" },
      }),
    )
    expect(result.currentStep).toBe("esign")
    expect(result.cta.label).toContain("Sign")
  })

  it("returns pickup step when signed", () => {
    const result = resolveNextStep(
      makeBuyerCtx({
        prequal: { exists: true, creditTier: "GOOD", softPullCompleted: true, consentGiven: true },
        shortlist: { count: 1 },
        deal: { id: "deal_1", status: "SIGNED", vehicleSummary: "2024 Toyota Camry" },
        pickup: { status: "SCHEDULED", scheduledDate: "2026-03-15T10:00:00Z" },
      }),
    )
    expect(result.currentStep).toBe("pickup")
    expect(result.cta.label).toContain("Pickup")
    expect(result.actionCards[0].type).toBe("schedule")
  })

  it("returns completed step when deal is done", () => {
    const result = resolveNextStep(
      makeBuyerCtx({
        prequal: { exists: true, creditTier: "GOOD", softPullCompleted: true, consentGiven: true },
        shortlist: { count: 1 },
        deal: { id: "deal_1", status: "COMPLETED", vehicleSummary: "2024 Toyota Camry" },
      }),
    )
    expect(result.currentStep).toBe("completed")
    expect(result.actionCards.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Status strip
// ---------------------------------------------------------------------------

describe("resolveNextStep — status strip", () => {
  it("marks steps before current as completed", () => {
    const result = resolveNextStep(
      makeBuyerCtx({
        prequal: { exists: true, creditTier: "GOOD", softPullCompleted: true, consentGiven: true },
        shortlist: { count: 1 },
        deal: { id: "deal_1", status: "INSURANCE_PENDING", vehicleSummary: null },
      }),
    )
    const strip = result.statusStripSteps
    expect(strip.length).toBeGreaterThan(0)
    const insuranceIdx = strip.findIndex((s) => s.key === "insurance")
    expect(insuranceIdx).toBeGreaterThan(0)
    // All steps before insurance should be completed
    for (let i = 0; i < insuranceIdx; i++) {
      expect(strip[i].status).toBe("completed")
    }
    expect(strip[insuranceIdx].status).toBe("active")
  })

  it("returns empty strip for non-buyer roles", () => {
    const result = resolveNextStep({
      userId: "user_1",
      role: "dealer",
      workspaceId: "ws_1",
      workspaceMode: "LIVE",
      buyer: null,
      dealer: { activeAuctions: 2, pendingBids: 2, pendingPickups: 0, pendingContractFixes: 0 },
      affiliate: null,
      admin: null,
    })
    expect(result.statusStripSteps.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Dealer
// ---------------------------------------------------------------------------

describe("resolveNextStep — dealer", () => {
  it("returns active auctions CTA when dealer has auctions", () => {
    const result = resolveNextStep({
      userId: "user_d",
      role: "dealer",
      workspaceId: "ws_1",
      workspaceMode: "LIVE",
      buyer: null,
      dealer: { activeAuctions: 3, pendingBids: 3, pendingPickups: 1, pendingContractFixes: 0 },
      affiliate: null,
      admin: null,
    })
    expect(result.currentStep).toBe("dealer_active")
    expect(result.cta.label).toContain("Auction")
    expect(result.actionCards[0].type).toBe("submit_bid")
  })
})

// ---------------------------------------------------------------------------
// Affiliate
// ---------------------------------------------------------------------------

describe("resolveNextStep — affiliate", () => {
  it("highlights pending commissions when available", () => {
    const result = resolveNextStep({
      userId: "user_a",
      role: "affiliate",
      workspaceId: "ws_1",
      workspaceMode: "LIVE",
      buyer: null,
      dealer: null,
      affiliate: { totalClicks: 100, totalSignups: 10, pendingCommissions: 250, totalPaid: 500 },
      admin: null,
    })
    expect(result.currentStep).toBe("affiliate_active")
    expect(result.cta.label).toContain("Commission")
    expect(result.actionCards.some((c) => c.type === "generate_link")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

describe("resolveNextStep — admin", () => {
  it("returns ops dashboard CTA", () => {
    const result = resolveNextStep({
      userId: "user_admin",
      role: "admin",
      workspaceId: "ws_1",
      workspaceMode: "LIVE",
      buyer: null,
      dealer: null,
      affiliate: null,
      admin: { activeDeals: 15, pendingAuctions: 3, pendingPayouts: 2 },
    })
    expect(result.currentStep).toBe("admin_active")
    expect(result.cta.label).toContain("Dashboard")
    expect(result.actionCards.some((c) => c.type === "view_report")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Public / unauthenticated
// ---------------------------------------------------------------------------

describe("resolveNextStep — public", () => {
  it("returns onboarding CTA for unauthenticated users", () => {
    const result = resolveNextStep({
      userId: "anon",
      role: "public",
      workspaceId: null,
      workspaceMode: "LIVE",
      buyer: null,
      dealer: null,
      affiliate: null,
      admin: null,
    })
    expect(result.currentStep).toBe("onboarding")
    expect(result.cta.label).toContain("Get Started")
    expect(result.actionCards.length).toBeGreaterThan(0)
  })
})
