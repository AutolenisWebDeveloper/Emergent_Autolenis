/**
 * Tests for the FAQ Intent Matcher.
 *
 * Validates that user questions (including synonyms and variations)
 * reliably map to the correct intent with sufficient confidence.
 */

import { describe, expect, it } from "vitest"
import {
  matchIntent,
  matchIntentTopN,
  getIntentById,
  getIntentsByCategory,
  FAQ_PACK_VERSION,
} from "@/lib/ai/faq/intent-matcher"

// ---------------------------------------------------------------------------
// Pack metadata
// ---------------------------------------------------------------------------

describe("FAQ Intent Pack metadata", () => {
  it("has a version string", () => {
    expect(FAQ_PACK_VERSION).toBe("1.0.0")
  })
})

// ---------------------------------------------------------------------------
// Exact question matches (should be very high confidence)
// ---------------------------------------------------------------------------

describe("Intent Matcher – exact question matches", () => {
  const exactCases: [string, string][] = [
    ["What is AutoLenis?", "VALUE_WHAT_IS"],
    ["How much does AutoLenis cost?", "FEES_HOW_MUCH"],
    ["How does the auction work?", "OFFERS_AUCTION"],
    ["What is Contract Shield?", "CONTRACT_SHIELD_WHAT"],
    ["How does pickup work?", "CLOSE_PICKUP"],
    ["How does AutoLenis work?", "FLOW_HOW_WORKS"],
    ["Can I get a refund?", "FEES_REFUND"],
    ["Is home delivery available?", "CLOSE_DELIVERY"],
    ["Am I obligated to buy?", "VALUE_OBLIGATED"],
    ["What do I need for pre-qualification?", "FLOW_PREQUAL_INFO"],
  ]

  it.each(exactCases)("'%s' → %s", (question, expectedId) => {
    const result = matchIntent(question)
    expect(result).not.toBeNull()
    expect(result!.intentId).toBe(expectedId)
    expect(result!.confidence).toBeGreaterThanOrEqual(0.85)
  })
})

// ---------------------------------------------------------------------------
// Synonym / variation matching (should match with reasonable confidence)
// ---------------------------------------------------------------------------

describe("Intent Matcher – synonym matching", () => {
  const synonymCases: [string, string][] = [
    ["Tell me about AutoLenis", "VALUE_WHAT_IS"],
    ["What are your fees?", "FEES_HOW_MUCH"],
    ["Is the deposit refundable?", "FEES_DEPOSIT"],
    ["Why not use a free broker?", "FEES_WORTH_IT"],
    ["Walk me through the process", "FLOW_HOW_WORKS"],
    ["Does pre-qual affect my credit?", "FLOW_PREQUAL"],
    ["How do dealers bid?", "OFFERS_AUCTION"],
    ["What if I get no offers?", "OFFERS_NO_BIDS"],
    ["What happens if something is flagged?", "CONTRACT_SHIELD_FLAGS"],
    ["Do I need insurance?", "CLOSE_INSURANCE"],
  ]

  it.each(synonymCases)("'%s' → %s", (question, expectedId) => {
    const result = matchIntent(question)
    expect(result).not.toBeNull()
    expect(result!.intentId).toBe(expectedId)
    expect(result!.confidence).toBeGreaterThanOrEqual(0.25)
  })
})

// ---------------------------------------------------------------------------
// Category-scoped matching
// ---------------------------------------------------------------------------

describe("Intent Matcher – category queries", () => {
  it("getIntentsByCategory returns correct count for FEES", () => {
    const feeIntents = getIntentsByCategory("FEES")
    expect(feeIntents.length).toBeGreaterThanOrEqual(5)
    expect(feeIntents.every((i) => i.category === "FEES")).toBe(true)
  })

  it("getIntentsByCategory returns correct count for CONTRACT_SHIELD", () => {
    const csIntents = getIntentsByCategory("CONTRACT_SHIELD")
    expect(csIntents.length).toBeGreaterThanOrEqual(5)
    expect(csIntents.every((i) => i.category === "CONTRACT_SHIELD")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getIntentById
// ---------------------------------------------------------------------------

describe("Intent Matcher – getIntentById", () => {
  it("returns an intent for a valid ID", () => {
    const intent = getIntentById("FEES_WORTH_IT")
    expect(intent).toBeDefined()
    expect(intent!.id).toBe("FEES_WORTH_IT")
    expect(intent!.category).toBe("FEES")
  })

  it("returns undefined for an invalid ID", () => {
    const intent = getIntentById("NONEXISTENT_INTENT")
    expect(intent).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Top-N ranking
// ---------------------------------------------------------------------------

describe("Intent Matcher – matchIntentTopN", () => {
  it("returns multiple ranked results for a broad query", () => {
    const results = matchIntentTopN("fees and pricing", 5)
    expect(results.length).toBeGreaterThanOrEqual(1)
    // Results should be sorted by confidence
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.confidence).toBeGreaterThanOrEqual(results[i]!.confidence)
    }
  })

  it("returns empty array for empty input", () => {
    const results = matchIntentTopN("", 5)
    expect(results).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("Intent Matcher – edge cases", () => {
  it("returns null for empty input", () => {
    expect(matchIntent("")).toBeNull()
  })

  it("returns null for whitespace-only input", () => {
    expect(matchIntent("   ")).toBeNull()
  })

  it("handles very short input gracefully", () => {
    // "hello there" is too generic — should return null or low confidence
    const result = matchIntent("hello there")
    // Either null or very low confidence is acceptable
    if (result) {
      expect(result.confidence).toBeLessThan(0.5)
    }
  })

  it("category hint serves as tie-breaker", () => {
    // A generic question about cost could match multiple intents
    const withHint = matchIntent("cost", "FEES")
    const withoutHint = matchIntent("cost")

    // Both should find something
    if (withHint && withoutHint) {
      // Hint should bias toward FEES category
      expect(withHint.category).toBe("FEES")
    }
  })
})

// ---------------------------------------------------------------------------
// Compliance: no guarantees in answers
// ---------------------------------------------------------------------------

describe("Intent Matcher – compliance checks", () => {
  it("no answer contains 'guaranteed approval'", () => {
    const allCategories: Array<"VALUE" | "FEES" | "FLOW" | "OFFERS" | "CONTRACT_SHIELD" | "CLOSE"> = [
      "VALUE", "FEES", "FLOW", "OFFERS", "CONTRACT_SHIELD", "CLOSE",
    ]
    for (const category of allCategories) {
      const intents = getIntentsByCategory(category)
      for (const intent of intents) {
        expect(intent.answer_markdown.toLowerCase()).not.toContain("guaranteed approval")
        expect(intent.answer_markdown.toLowerCase()).not.toContain("we guarantee")
      }
    }
  })
})
