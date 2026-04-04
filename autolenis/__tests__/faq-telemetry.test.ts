/**
 * Tests for the FAQ Telemetry module.
 *
 * Validates event tracking, aggregation, and metric computation.
 */

import { describe, expect, it, beforeEach } from "vitest"
import {
  trackFAQEvent,
  getFAQEvents,
  clearFAQEvents,
  trackIntentRecognized,
  trackCTAShown,
  trackCTAClicked,
  computeFAQMetrics,
} from "@/lib/ai/faq/telemetry"

beforeEach(() => {
  clearFAQEvents()
})

// ---------------------------------------------------------------------------
// Event tracking
// ---------------------------------------------------------------------------

describe("FAQ Telemetry – event tracking", () => {
  it("records events and returns them", () => {
    trackFAQEvent({
      type: "intent_recognized",
      intentId: "FEES_HOW_MUCH",
      category: "FEES",
      confidence: 0.95,
      ctaLabel: null,
      timestamp: Date.now(),
      userId: "user-1",
      workspaceId: "ws-1",
    })
    const events = getFAQEvents()
    expect(events.length).toBe(1)
    expect(events[0]!.intentId).toBe("FEES_HOW_MUCH")
  })

  it("clearFAQEvents resets the log", () => {
    trackIntentRecognized("FLOW_PREQUAL", "FLOW", 0.8, "user-1", null)
    expect(getFAQEvents().length).toBe(1)
    clearFAQEvents()
    expect(getFAQEvents().length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

describe("FAQ Telemetry – convenience helpers", () => {
  it("trackIntentRecognized creates an event with correct type", () => {
    trackIntentRecognized("VALUE_WHAT_IS", "VALUE", 0.9, "u1", "w1")
    const events = getFAQEvents()
    expect(events[0]!.type).toBe("intent_recognized")
    expect(events[0]!.category).toBe("VALUE")
  })

  it("trackCTAShown creates an event with CTA label", () => {
    trackCTAShown("OFFERS_COMPARE", "OFFERS", 0.85, "Compare Offers", "u1", "w1")
    const events = getFAQEvents()
    expect(events[0]!.type).toBe("cta_shown")
    expect(events[0]!.ctaLabel).toBe("Compare Offers")
  })

  it("trackCTAClicked creates an event with CTA label", () => {
    trackCTAClicked("CLOSE_ESIGN", "CLOSE", 0.9, "Open E-Sign", "u1", "w1")
    const events = getFAQEvents()
    expect(events[0]!.type).toBe("cta_clicked")
    expect(events[0]!.ctaLabel).toBe("Open E-Sign")
  })
})

// ---------------------------------------------------------------------------
// Metrics computation
// ---------------------------------------------------------------------------

describe("FAQ Telemetry – computeFAQMetrics", () => {
  it("computes correct metrics from event data", () => {
    // Simulate a sequence of events
    trackIntentRecognized("FEES_HOW_MUCH", "FEES", 0.95, "u1", "w1")
    trackCTAShown("FEES_HOW_MUCH", "FEES", 0.95, "Start Pre-Qualification", "u1", "w1")
    trackCTAClicked("FEES_HOW_MUCH", "FEES", 0.95, "Start Pre-Qualification", "u1", "w1")

    trackIntentRecognized("VALUE_WHAT_IS", "VALUE", 0.9, "u2", "w1")
    trackCTAShown("VALUE_WHAT_IS", "VALUE", 0.9, "Start Pre-Qualification", "u2", "w1")

    const metrics = computeFAQMetrics()
    expect(metrics.totalIntentHits).toBe(2)
    expect(metrics.totalCTAShown).toBe(2)
    expect(metrics.totalCTAClicked).toBe(1)
    expect(metrics.ctaClickThroughRate).toBe(0.5)
    expect(metrics.totalEscalations).toBe(0)
    expect(metrics.escalationRate).toBe(0)
    expect(metrics.hitsByCategory["FEES"]).toBe(1)
    expect(metrics.hitsByCategory["VALUE"]).toBe(1)
    expect(metrics.hitsByIntent["FEES_HOW_MUCH"]).toBe(1)
    expect(metrics.hitsByIntent["VALUE_WHAT_IS"]).toBe(1)
  })

  it("returns zero rates when no events recorded", () => {
    const metrics = computeFAQMetrics()
    expect(metrics.totalIntentHits).toBe(0)
    expect(metrics.ctaClickThroughRate).toBe(0)
    expect(metrics.escalationRate).toBe(0)
  })
})
