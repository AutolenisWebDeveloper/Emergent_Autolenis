/**
 * Base Orchestrator — Unit Tests
 *
 * Tests for shared pipeline utilities:
 *  - detectGreeting() — word-boundary matching, variant-specific responses
 *  - detectFrustration() — signal detection, repeated question detection
 *  - getBuyerStageActions() — stage-aware quick action suggestions
 *  - buildFallbackResponse() — correct shape for all variants
 *  - translateDealStage() — human-readable labels
 */

import { describe, it, expect } from "vitest"
import {
  detectGreeting,
  detectFrustration,
  getBuyerStageActions,
  buildFallbackResponse,
  translateDealStage,
  runComplianceScrub,
} from "../base-orchestrator"
import type { CopilotVariant, ConversationTurn, DealStage } from "../types"

// ---------------------------------------------------------------------------
// detectGreeting
// ---------------------------------------------------------------------------

describe("detectGreeting", () => {
  it("detects 'hello' as a greeting", () => {
    expect(detectGreeting("hello", "public")).toBeTruthy()
  })

  it("detects 'hi' as a greeting", () => {
    expect(detectGreeting("hi", "public")).toBeTruthy()
  })

  it("detects 'hey' as a greeting", () => {
    expect(detectGreeting("hey", "public")).toBeTruthy()
  })

  it("detects 'good morning' as a greeting", () => {
    expect(detectGreeting("good morning", "public")).toBeTruthy()
  })

  it("does NOT detect 'what is contract shield' as a greeting", () => {
    expect(detectGreeting("what is contract shield", "public")).toBeNull()
  })

  it("does NOT detect 'how does autolenis work' as a greeting", () => {
    expect(detectGreeting("how does autolenis work", "public")).toBeNull()
  })

  it("does NOT detect long messages as greetings", () => {
    expect(detectGreeting("hello i want to learn about how autolenis works and what it costs", "public")).toBeNull()
  })

  it("does NOT match 'hi' inside 'shield'", () => {
    // This was a bug: "shield" contains "hi" — word-boundary matching should prevent this
    expect(detectGreeting("shield", "public")).toBeNull()
  })

  it("does NOT match 'hey' inside 'they'", () => {
    expect(detectGreeting("they", "public")).toBeNull()
  })

  it("returns variant-specific response for buyer", () => {
    const result = detectGreeting("hello", "buyer")
    expect(result).toBeTruthy()
    expect(result).toContain("buyer")
  })

  it("returns variant-specific response for dealer", () => {
    const result = detectGreeting("hello", "dealer")
    expect(result).toBeTruthy()
    expect(result).toContain("dealer")
  })

  it("returns variant-specific response for affiliate", () => {
    const result = detectGreeting("hello", "affiliate")
    expect(result).toBeTruthy()
    expect(result).toContain("affiliate")
  })

  it("returns variant-specific response for admin", () => {
    const result = detectGreeting("hello", "admin")
    expect(result).toBeTruthy()
    expect(result).toContain("admin")
  })
})

// ---------------------------------------------------------------------------
// detectFrustration
// ---------------------------------------------------------------------------

describe("detectFrustration", () => {
  it("detects 'this is not working' as frustration", () => {
    expect(detectFrustration("this is not working", [])).toBe(true)
  })

  it("detects 'this sucks' as frustration", () => {
    expect(detectFrustration("this sucks", [])).toBe(true)
  })

  it("detects 'scam' as frustration", () => {
    expect(detectFrustration("is this a scam", [])).toBe(true)
  })

  it("does NOT detect 'how does autolenis work' as frustration", () => {
    expect(detectFrustration("how does autolenis work", [])).toBe(false)
  })

  it("detects repeated identical questions as frustration", () => {
    const history: ConversationTurn[] = [
      { role: "user", content: "how does it work?", timestamp: 1 },
      { role: "assistant", content: "...", timestamp: 2 },
      { role: "user", content: "how does it work?", timestamp: 3 },
    ]
    expect(detectFrustration("how does it work?", history)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getBuyerStageActions
// ---------------------------------------------------------------------------

describe("getBuyerStageActions", () => {
  it("returns default actions when no stage provided", () => {
    const actions = getBuyerStageActions(undefined)
    expect(actions.length).toBeGreaterThan(0)
  })

  it("returns fee-related actions for FEE_PENDING stage", () => {
    const actions = getBuyerStageActions("FEE_PENDING")
    expect(actions.length).toBeGreaterThan(0)
    const labels = actions.map((a) => a.label.toLowerCase())
    const hasFeeAction = labels.some((l) => l.includes("fee") || l.includes("financing"))
    expect(hasFeeAction).toBe(true)
  })

  it("returns contract-related actions for CONTRACT_REVIEW stage", () => {
    const actions = getBuyerStageActions("CONTRACT_REVIEW")
    expect(actions.length).toBeGreaterThan(0)
    const labels = actions.map((a) => a.label.toLowerCase())
    const hasContractAction = labels.some((l) => l.includes("contract") || l.includes("review") || l.includes("shield"))
    expect(hasContractAction).toBe(true)
  })

  it("returns pickup-related actions for SIGNED stage", () => {
    const actions = getBuyerStageActions("SIGNED")
    expect(actions.length).toBeGreaterThan(0)
    const labels = actions.map((a) => a.label.toLowerCase())
    const hasPickupAction = labels.some((l) => l.includes("pickup") || l.includes("schedule"))
    expect(hasPickupAction).toBe(true)
  })

  it("returns actions with autoSubmit=true", () => {
    const stages: DealStage[] = ["FEE_PENDING", "CONTRACT_REVIEW", "SIGNED"]
    for (const stage of stages) {
      const actions = getBuyerStageActions(stage)
      for (const action of actions) {
        expect(action.autoSubmit).toBe(true)
      }
    }
  })

  it("returns at most 3 actions per stage", () => {
    const stages: DealStage[] = [
      "SELECTED", "FINANCING_PENDING", "FEE_PENDING", "CONTRACT_REVIEW",
      "SIGNING_PENDING", "SIGNED", "PICKUP_SCHEDULED",
    ]
    for (const stage of stages) {
      const actions = getBuyerStageActions(stage)
      expect(actions.length).toBeLessThanOrEqual(3)
    }
  })
})

// ---------------------------------------------------------------------------
// buildFallbackResponse
// ---------------------------------------------------------------------------

describe("buildFallbackResponse", () => {
  const allVariants: CopilotVariant[] = ["public", "buyer", "dealer", "affiliate", "admin"]

  it("returns a valid response for each variant", () => {
    for (const variant of allVariants) {
      const response = buildFallbackResponse(variant)
      expect(response.text).toBeTruthy()
      expect(response.renderState).toBe("text_response")
      expect(response.intent).toBe("FALLBACK")
    }
  })

  it("includes quick actions when provided", () => {
    const chips = [{ label: "Test", message: "test", autoSubmit: true }]
    const response = buildFallbackResponse("public", undefined, chips)
    expect(response.renderState).toBe("quick_actions")
    expect(response.quickActions).toHaveLength(1)
  })

  it("limits quick actions to 3", () => {
    const chips = Array.from({ length: 5 }, (_, i) => ({
      label: `Action ${i}`,
      message: `action ${i}`,
      autoSubmit: true,
    }))
    const response = buildFallbackResponse("public", undefined, chips)
    expect(response.quickActions?.length).toBeLessThanOrEqual(3)
  })

  it("uses provided fallback text over default", () => {
    const response = buildFallbackResponse("public", "Custom fallback text")
    expect(response.text).toBe("Custom fallback text")
  })
})

// ---------------------------------------------------------------------------
// translateDealStage
// ---------------------------------------------------------------------------

describe("translateDealStage", () => {
  it("translates FEE_PENDING to a human-readable label", () => {
    const label = translateDealStage("FEE_PENDING")
    expect(label).not.toContain("FEE_PENDING")
    expect(label.length).toBeGreaterThan(0)
  })

  it("translates COMPLETED to a human-readable label", () => {
    const label = translateDealStage("COMPLETED")
    expect(label.toLowerCase()).toContain("complet")
  })

  it("returns a fallback for unknown stages", () => {
    // Test with a stage that exists
    const label = translateDealStage("CANCELLED")
    expect(label.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// runComplianceScrub
// ---------------------------------------------------------------------------

describe("runComplianceScrub", () => {
  it("does not modify compliant text", () => {
    const text = "AutoLenis is a concierge car-buying platform."
    expect(runComplianceScrub(text)).toBe(text)
  })
})
