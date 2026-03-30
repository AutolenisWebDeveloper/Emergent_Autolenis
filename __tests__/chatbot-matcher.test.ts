/**
 * Tests for the local chatbot FAQ/intent matcher.
 *
 * Covers:
 *  - Intent matching accuracy
 *  - Fallback behavior when no intent matches
 *  - Route-aware prioritization
 *  - processMessage handler
 */

import { describe, expect, it } from "vitest"
import {
  matchIntent,
  matchIntentTopN,
  processMessage,
  categoryForRoute,
  INTENTS,
  FALLBACK_RESPONSE,
  FALLBACK_CHIPS,
} from "@/lib/chatbot/faq"

// =========================================================================
// categoryForRoute
// =========================================================================

describe("categoryForRoute", () => {
  it("returns 'pricing' for /pricing", () => {
    expect(categoryForRoute("/pricing")).toBe("pricing")
  })

  it("returns 'process' for /how-it-works", () => {
    expect(categoryForRoute("/how-it-works")).toBe("process")
  })

  it("returns 'prequal' for /buyer", () => {
    expect(categoryForRoute("/buyer")).toBe("prequal")
  })

  it("returns 'prequal' for /buyer/dashboard", () => {
    expect(categoryForRoute("/buyer/dashboard")).toBe("prequal")
  })

  it("returns 'dealer' for /dealer", () => {
    expect(categoryForRoute("/dealer")).toBe("dealer")
  })

  it("returns 'affiliate' for /affiliate", () => {
    expect(categoryForRoute("/affiliate")).toBe("affiliate")
  })

  it("returns 'support' for /contact", () => {
    expect(categoryForRoute("/contact")).toBe("support")
  })

  it("returns null for unknown routes", () => {
    expect(categoryForRoute("/unknown")).toBeNull()
    expect(categoryForRoute("/")).toBeNull()
  })
})

// =========================================================================
// matchIntent – exact matches
// =========================================================================

describe("matchIntent – exact keyword matching", () => {
  it("matches 'how does autolenis work' to how_it_works", () => {
    const result = matchIntent("How does AutoLenis work?")
    expect(result).not.toBeNull()
    expect(result!.intent.id).toBe("how_it_works")
    expect(result!.score).toBeGreaterThanOrEqual(0.8)
  })

  it("matches 'what are the fees' to pricing", () => {
    const result = matchIntent("What are the fees?")
    expect(result).not.toBeNull()
    expect(result!.intent.id).toBe("pricing")
  })

  it("matches 'pre-qualification' to prequal", () => {
    const result = matchIntent("Tell me about pre-qualification")
    expect(result).not.toBeNull()
    expect(result!.intent.id).toBe("prequal")
  })

  it("matches 'become a dealer' to dealer_onboarding", () => {
    const result = matchIntent("How do I become a dealer?")
    expect(result).not.toBeNull()
    expect(result!.intent.id).toBe("dealer_onboarding")
  })

  it("matches 'affiliate program' to affiliate_program", () => {
    const result = matchIntent("Tell me about the affiliate program")
    expect(result).not.toBeNull()
    expect(result!.intent.id).toBe("affiliate_program")
  })

  it("matches 'contact support' to contact_support", () => {
    const result = matchIntent("How do I contact support?")
    expect(result).not.toBeNull()
    expect(result!.intent.id).toBe("contact_support")
  })

  it("matches 'contract shield' to contract_shield", () => {
    const result = matchIntent("What is Contract Shield?")
    expect(result).not.toBeNull()
    expect(result!.intent.id).toBe("contract_shield")
  })

  it("matches 'find a car' to vehicle_search", () => {
    const result = matchIntent("I want to find a car")
    expect(result).not.toBeNull()
    expect(result!.intent.id).toBe("vehicle_search")
  })

  it("matches 'refinance' to refinance", () => {
    const result = matchIntent("Can I refinance my loan?")
    expect(result).not.toBeNull()
    expect(result!.intent.id).toBe("refinance")
  })
})

// =========================================================================
// matchIntent – fallback behavior
// =========================================================================

describe("matchIntent – fallback", () => {
  it("returns null for completely unrelated input", () => {
    const result = matchIntent("Tell me a joke about cats")
    expect(result).toBeNull()
  })

  it("returns null for empty input", () => {
    const result = matchIntent("")
    expect(result).toBeNull()
  })

  it("returns null for single-character input", () => {
    const result = matchIntent("a")
    expect(result).toBeNull()
  })
})

// =========================================================================
// matchIntent – route-aware prioritization
// =========================================================================

describe("matchIntent – route-aware boosting", () => {
  it("boosts pricing intent on /pricing route", () => {
    const withoutRoute = matchIntent("fees")
    const withRoute = matchIntent("fees", "/pricing")
    expect(withRoute).not.toBeNull()
    expect(withoutRoute).not.toBeNull()
    // Score on pricing route should be higher
    expect(withRoute!.score).toBeGreaterThanOrEqual(withoutRoute!.score)
  })

  it("boosts dealer intent on /dealer route", () => {
    const withoutRoute = matchIntent("dealer partnership")
    const withRoute = matchIntent("dealer partnership", "/dealer")
    expect(withRoute).not.toBeNull()
    expect(withRoute!.score).toBeGreaterThanOrEqual(withoutRoute!.score)
  })

  it("boosts prequal intent on /buyer route", () => {
    const withoutRoute = matchIntent("pre-qualification")
    const withRoute = matchIntent("pre-qualification", "/buyer")
    expect(withRoute).not.toBeNull()
    expect(withRoute!.score).toBeGreaterThanOrEqual(withoutRoute!.score)
  })

  it("boosts affiliate intent on /affiliate route", () => {
    const withoutRoute = matchIntent("referral program")
    const withRoute = matchIntent("referral program", "/affiliate")
    expect(withRoute).not.toBeNull()
    expect(withRoute!.score).toBeGreaterThanOrEqual(withoutRoute!.score)
  })

  it("boosts process intents on /how-it-works route", () => {
    const withoutRoute = matchIntent("how does this work")
    const withRoute = matchIntent("how does this work", "/how-it-works")
    expect(withRoute).not.toBeNull()
    expect(withRoute!.score).toBeGreaterThanOrEqual(withoutRoute!.score)
  })

  it("no boost on unrelated route", () => {
    const noRoute = matchIntent("pricing fees")
    const unrelatedRoute = matchIntent("pricing fees", "/dealer")
    // Both should match pricing, but /dealer shouldn't boost pricing
    expect(noRoute).not.toBeNull()
    expect(unrelatedRoute).not.toBeNull()
    expect(noRoute!.intent.id).toBe("pricing")
    expect(unrelatedRoute!.intent.id).toBe("pricing")
  })
})

// =========================================================================
// matchIntentTopN
// =========================================================================

describe("matchIntentTopN", () => {
  it("returns multiple results sorted by score", () => {
    const results = matchIntentTopN("how does autolenis work and pricing", 3)
    expect(results.length).toBeGreaterThan(0)
    expect(results.length).toBeLessThanOrEqual(3)
    // Sorted descending
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })

  it("returns empty array for gibberish", () => {
    const results = matchIntentTopN("xyzzy frobnicator plugh", 3)
    expect(results).toHaveLength(0)
  })
})

// =========================================================================
// processMessage – handler
// =========================================================================

describe("processMessage", () => {
  it("returns a matched reply for known intent", () => {
    const result = processMessage("How does AutoLenis work?")
    expect(result.intentId).toBe("how_it_works")
    expect(result.reply).toContain("Pre-Qualified")
    expect(result.suggestedTopics.length).toBeGreaterThan(0)
  })

  it("returns a matched reply for pricing question", () => {
    const result = processMessage("What are the fees?")
    expect(result.intentId).toBe("pricing")
    expect(result.reply).toContain("concierge service fee")
    expect(result.suggestedTopics.length).toBeGreaterThan(0)
  })

  it("returns fallback for unrecognized input", () => {
    const result = processMessage("asdfghjkl nonsense query")
    expect(result.intentId).toBeNull()
    expect(result.reply).toBe(FALLBACK_RESPONSE)
    expect(result.suggestedTopics).toEqual(FALLBACK_CHIPS)
  })

  it("returns fallback with suggested topics", () => {
    const result = processMessage("random unmatched query")
    expect(result.suggestedTopics.length).toBeGreaterThanOrEqual(3)
    // Fallback chips should include broad topics
    const labels = result.suggestedTopics.map((c) => c.label)
    expect(labels.some((l) => l.includes("How AutoLenis works"))).toBe(true)
    expect(labels.some((l) => l.includes("Pricing"))).toBe(true)
  })

  it("is case-insensitive", () => {
    const lower = processMessage("how does autolenis work")
    const upper = processMessage("HOW DOES AUTOLENIS WORK")
    expect(lower.intentId).toBe(upper.intentId)
  })

  it("handles route-aware context", () => {
    const result = processMessage("fees", "/pricing")
    expect(result.intentId).toBe("pricing")
  })
})

// =========================================================================
// Intents data integrity
// =========================================================================

describe("intents data integrity", () => {
  it("all intents have unique IDs", () => {
    const ids = INTENTS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("all intents have non-empty keywords", () => {
    for (const intent of INTENTS) {
      expect(intent.keywords.length).toBeGreaterThan(0)
    }
  })

  it("all intents have non-empty answers", () => {
    for (const intent of INTENTS) {
      expect(intent.answer.length).toBeGreaterThan(0)
    }
  })

  it("all intents have chips", () => {
    for (const intent of INTENTS) {
      expect(intent.chips.length).toBeGreaterThan(0)
    }
  })

  it("covers minimum required intents", () => {
    const ids = INTENTS.map((i) => i.id)
    expect(ids).toContain("how_it_works")
    expect(ids).toContain("pricing")
    expect(ids).toContain("prequal")
    expect(ids).toContain("dealer_onboarding")
    expect(ids).toContain("affiliate_program")
    expect(ids).toContain("contact_support")
  })

  it("fallback chips are non-empty", () => {
    expect(FALLBACK_CHIPS.length).toBeGreaterThan(0)
    for (const chip of FALLBACK_CHIPS) {
      expect(chip.label.length).toBeGreaterThan(0)
      expect(chip.query.length).toBeGreaterThan(0)
    }
  })
})
