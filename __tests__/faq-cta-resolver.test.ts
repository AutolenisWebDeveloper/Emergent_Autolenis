/**
 * Tests for the FAQ CTA Resolver.
 *
 * Validates that resolvePrimaryCTA returns the correct CTA for every
 * permutation of buyer context state, following the funnel:
 *   prequal → shortlist → offers/auction → select deal →
 *   contract shield → e-sign → pickup → complete
 */

import { describe, expect, it } from "vitest"
import { resolvePrimaryCTA, DEFAULT_BUYER_CONTEXT, buildFAQCard } from "@/lib/ai/faq/cta-resolver"
import type { BuyerContext, IntentMatchResult, FAQIntent } from "@/lib/ai/faq/types"

// ---------------------------------------------------------------------------
// Helper – build context with overrides
// ---------------------------------------------------------------------------

function ctx(overrides: Partial<BuyerContext> = {}): BuyerContext {
  return { ...DEFAULT_BUYER_CONTEXT, ...overrides }
}

// ---------------------------------------------------------------------------
// Step 1 – Pre-qualification
// ---------------------------------------------------------------------------

describe("CTA Resolver – prequal stage", () => {
  it("returns 'Start Pre-Qualification' when prequal is NOT_STARTED", () => {
    const cta = resolvePrimaryCTA("FLOW_PREQUAL", ctx())
    expect(cta.label).toBe("Start Pre-Qualification")
    expect(cta.actionType).toBe("startPreQual")
    expect(cta.isEnabled).toBe(true)
  })

  it("returns 'Finish Pre-Qualification' when prequal is IN_PROGRESS", () => {
    const cta = resolvePrimaryCTA("FLOW_PREQUAL", ctx({ prequal: { status: "IN_PROGRESS" } }))
    expect(cta.label).toBe("Finish Pre-Qualification")
    expect(cta.actionType).toBe("resumePreQual")
  })
})

// ---------------------------------------------------------------------------
// Step 2 – Shortlist
// ---------------------------------------------------------------------------

describe("CTA Resolver – shortlist stage", () => {
  it("returns 'Build Your Shortlist' when prequal approved but shortlist empty", () => {
    const cta = resolvePrimaryCTA("FLOW_SHORTLIST", ctx({
      prequal: { status: "APPROVED" },
      shortlist: { count: 0 },
    }))
    expect(cta.label).toBe("Build Your Shortlist")
    expect(cta.actionType).toBe("buildShortlist")
  })
})

// ---------------------------------------------------------------------------
// Step 3 – Offers / Auction
// ---------------------------------------------------------------------------

describe("CTA Resolver – offers/auction stage", () => {
  it("returns 'Request Offers' when shortlist has items but no auction active", () => {
    const cta = resolvePrimaryCTA("OFFERS_AUCTION", ctx({
      prequal: { status: "APPROVED" },
      shortlist: { count: 3 },
      offers: { status: "NOT_STARTED" },
      auction: { status: "NOT_STARTED" },
    }))
    expect(cta.label).toBe("Request Offers")
    expect(cta.actionType).toBe("requestOffers")
  })

  it("returns 'View Auction Status' when auction is in progress", () => {
    const cta = resolvePrimaryCTA("OFFERS_AUCTION", ctx({
      prequal: { status: "APPROVED" },
      shortlist: { count: 3 },
      offers: { status: "NOT_STARTED" },
      auction: { status: "IN_PROGRESS" },
    }))
    expect(cta.label).toBe("View Auction Status")
    expect(cta.actionType).toBe("viewAuction")
  })
})

// ---------------------------------------------------------------------------
// Step 4 – Compare / Select deal
// ---------------------------------------------------------------------------

describe("CTA Resolver – compare offers stage", () => {
  it("returns 'Compare Offers' when offers are ready but no deal selected", () => {
    const cta = resolvePrimaryCTA("OFFERS_COMPARE", ctx({
      prequal: { status: "APPROVED" },
      shortlist: { count: 3 },
      offers: { status: "READY" },
      selectedDeal: { status: "NONE" },
    }))
    expect(cta.label).toBe("Compare Offers")
    expect(cta.actionType).toBe("compareOffers")
  })
})

// ---------------------------------------------------------------------------
// Step 5 – Contract Shield
// ---------------------------------------------------------------------------

describe("CTA Resolver – contract shield stage", () => {
  const baseCtx = {
    prequal: { status: "APPROVED" as const },
    shortlist: { count: 3 },
    offers: { status: "READY" as const },
    selectedDeal: { status: "COMPLETED" as const },
  }

  it("returns 'Upload Contract' when contract not uploaded", () => {
    const cta = resolvePrimaryCTA("CONTRACT_SHIELD_UPLOAD", ctx({
      ...baseCtx,
      contractShield: { status: "NOT_UPLOADED" },
    }))
    expect(cta.label).toBe("Upload Contract")
    expect(cta.actionType).toBe("uploadContract")
  })

  it("returns 'Review Contract Issues' when contract rejected", () => {
    const cta = resolvePrimaryCTA("CONTRACT_SHIELD_REJECT", ctx({
      ...baseCtx,
      contractShield: { status: "REJECT" },
    }))
    expect(cta.label).toBe("Review Contract Issues")
    expect(cta.actionType).toBe("reviewContractIssues")
  })

  it("returns 'Check Manual Review Status' when contract in manual review", () => {
    const cta = resolvePrimaryCTA("CONTRACT_SHIELD_MANUAL", ctx({
      ...baseCtx,
      contractShield: { status: "MANUAL_REVIEW" },
    }))
    expect(cta.label).toBe("Check Manual Review Status")
    expect(cta.actionType).toBe("checkManualReview")
  })
})

// ---------------------------------------------------------------------------
// Step 6 – E-Sign
// ---------------------------------------------------------------------------

describe("CTA Resolver – e-sign stage", () => {
  it("returns 'Open E-Sign' when contract shield passed but not signed", () => {
    const cta = resolvePrimaryCTA("CLOSE_ESIGN", ctx({
      prequal: { status: "APPROVED" },
      shortlist: { count: 3 },
      offers: { status: "READY" },
      selectedDeal: { status: "COMPLETED" },
      contractShield: { status: "PASS" },
      esign: { status: "NOT_STARTED" },
    }))
    expect(cta.label).toBe("Open E-Sign")
    expect(cta.actionType).toBe("openESign")
  })
})

// ---------------------------------------------------------------------------
// Step 7 – Pickup
// ---------------------------------------------------------------------------

describe("CTA Resolver – pickup stage", () => {
  it("returns 'Schedule Pickup' when signed but pickup not scheduled", () => {
    const cta = resolvePrimaryCTA("CLOSE_PICKUP", ctx({
      prequal: { status: "APPROVED" },
      shortlist: { count: 3 },
      offers: { status: "READY" },
      selectedDeal: { status: "COMPLETED" },
      contractShield: { status: "PASS" },
      esign: { status: "SIGNED" },
      pickup: { status: "NOT_STARTED" },
    }))
    expect(cta.label).toBe("Schedule Pickup")
    expect(cta.actionType).toBe("schedulePickup")
  })
})

// ---------------------------------------------------------------------------
// Step 8 – Complete
// ---------------------------------------------------------------------------

describe("CTA Resolver – complete stage", () => {
  it("returns 'Share Your Referral Link' when everything is done", () => {
    const cta = resolvePrimaryCTA("CLOSE_REFERRAL", ctx({
      prequal: { status: "APPROVED" },
      shortlist: { count: 3 },
      offers: { status: "READY" },
      selectedDeal: { status: "COMPLETED" },
      contractShield: { status: "PASS" },
      esign: { status: "SIGNED" },
      pickup: { status: "SCHEDULED" },
    }))
    expect(cta.label).toBe("Share Your Referral Link")
    expect(cta.actionType).toBe("shareReferral")
  })
})

// ---------------------------------------------------------------------------
// buildFAQCard integration
// ---------------------------------------------------------------------------

describe("buildFAQCard", () => {
  const mockIntent: FAQIntent = {
    id: "FEES_HOW_MUCH",
    category: "FEES",
    title: "How much does AutoLenis cost?",
    user_questions: ["How much does AutoLenis cost?"],
    answer_markdown: "A flat concierge fee.",
    cta: { type: "PRIMARY_NEXT_STEP", label: "Continue to your next step" },
    disclosure: "Terms depend on underwriting.",
    tags: ["fees"],
    version: "1.0.0",
  }

  const mockMatch: IntentMatchResult = {
    intentId: "FEES_HOW_MUCH",
    confidence: 0.95,
    category: "FEES",
    intent: mockIntent,
  }

  it("builds a complete FAQ card with CTA resolved from context", () => {
    const card = buildFAQCard(mockMatch, DEFAULT_BUYER_CONTEXT)
    expect(card.intentId).toBe("FEES_HOW_MUCH")
    expect(card.category).toBe("FEES")
    expect(card.answerMarkdown).toBe("A flat concierge fee.")
    expect(card.disclosure).toBe("Terms depend on underwriting.")
    expect(card.cta.label).toBe("Start Pre-Qualification")
    expect(card.cta.isEnabled).toBe(true)
    expect(card.confidence).toBe(0.95)
  })

  it("uses buyer context to determine CTA (not hardcoded)", () => {
    const advancedContext = ctx({
      prequal: { status: "APPROVED" },
      shortlist: { count: 3 },
      offers: { status: "READY" },
      selectedDeal: { status: "NONE" },
    })
    const card = buildFAQCard(mockMatch, advancedContext)
    expect(card.cta.label).toBe("Compare Offers")
    expect(card.cta.actionType).toBe("compareOffers")
  })
})

// ---------------------------------------------------------------------------
// CTA is always exactly one
// ---------------------------------------------------------------------------

describe("CTA Resolver – invariants", () => {
  it("always returns exactly one CTA (never null or multiple)", () => {
    const states: BuyerContext[] = [
      DEFAULT_BUYER_CONTEXT,
      ctx({ prequal: { status: "IN_PROGRESS" } }),
      ctx({ prequal: { status: "APPROVED" } }),
      ctx({ prequal: { status: "APPROVED" }, shortlist: { count: 3 } }),
      ctx({ prequal: { status: "APPROVED" }, shortlist: { count: 3 }, offers: { status: "READY" }, selectedDeal: { status: "NONE" } }),
      ctx({ prequal: { status: "APPROVED" }, shortlist: { count: 3 }, offers: { status: "READY" }, selectedDeal: { status: "COMPLETED" }, contractShield: { status: "PASS" }, esign: { status: "SIGNED" }, pickup: { status: "SCHEDULED" } }),
    ]

    for (const state of states) {
      const cta = resolvePrimaryCTA("any_intent", state)
      expect(cta).toBeDefined()
      expect(cta.label).toBeTruthy()
      expect(cta.actionType).toBeTruthy()
      expect(typeof cta.isEnabled).toBe("boolean")
    }
  })
})
