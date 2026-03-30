import { describe, it, expect } from "vitest"
import { runPublicOrchestrator } from "@/lib/copilot/public/orchestrator"
import type { CopilotContext } from "@/lib/copilot/shared/types"

const publicContext: CopilotContext = {
  variant: "public",
  role: "anonymous",
  route: "/",
  sessionId: "test-session",
}

describe("runPublicOrchestrator — intent detection", () => {
  it("matches HOW_IT_WORKS for 'how does autolenis work'", () => {
    const response = runPublicOrchestrator("how does autolenis work", publicContext)
    expect(response.intent).toBe("HOW_IT_WORKS")
    expect(response.text).toBeTruthy()
  })

  it("matches PRICING_INQUIRY for 'how much does it cost'", () => {
    const response = runPublicOrchestrator("how much does it cost", publicContext)
    expect(response.intent).toBe("PRICING_INQUIRY")
  })

  it("matches DEPOSIT_INQUIRY for 'how much is the deposit'", () => {
    const response = runPublicOrchestrator("how much is the deposit", publicContext)
    expect(response.intent).toBe("DEPOSIT_INQUIRY")
  })

  it("matches CONCIERGE_FEE_INQUIRY for 'what is the concierge fee'", () => {
    const response = runPublicOrchestrator("what is the concierge fee", publicContext)
    expect(response.intent).toBe("CONCIERGE_FEE_INQUIRY")
  })

  it("matches CONTRACT_SHIELD_INFO for 'what is contract shield'", () => {
    const response = runPublicOrchestrator("what is contract shield", publicContext)
    expect(response.intent).toBe("CONTRACT_SHIELD_INFO")
  })

  it("falls back to FALLBACK for unrecognized input", () => {
    const response = runPublicOrchestrator("xyzzy plugh plover", publicContext)
    expect(response.intent).toBe("FALLBACK")
    expect(response.text).toBeTruthy()
  })

  it("applies route context bonus on /pricing route", () => {
    const pricingContext: CopilotContext = { ...publicContext, route: "/pricing" }
    const response = runPublicOrchestrator("tell me about fees", pricingContext)
    // Should match PRICING_INQUIRY or similar
    expect(["PRICING_INQUIRY", "DEPOSIT_INQUIRY", "CONCIERGE_FEE_INQUIRY"]).toContain(response.intent)
  })
})

describe("runPublicOrchestrator — compliance scrub", () => {
  it("never returns raw DealStage enum values in response", () => {
    const response = runPublicOrchestrator("what happens after FEE_PENDING", publicContext)
    expect(response.text).not.toMatch(/\bFEE_PENDING\b/)
  })

  it("never returns loan approval language", () => {
    // All knowledge modules should be pre-scrubbed
    const scenarios = [
      "how does autolenis work",
      "how much does it cost",
      "how do i sign up",
      "tell me about prequalification",
    ]
    for (const msg of scenarios) {
      const response = runPublicOrchestrator(msg, publicContext)
      expect(response.text).not.toMatch(/you('re| are) (pre-?)?approved/i)
      expect(response.text).not.toMatch(/guaranteed approval/i)
    }
  })
})

describe("runPublicOrchestrator — no action intents", () => {
  it("never returns confirmation render state for public variant", () => {
    const response = runPublicOrchestrator("pay my deposit", publicContext)
    expect(response.renderState).not.toBe("confirmation")
    expect(response.renderState).not.toBe("action_result")
  })

  it("returns at most 3 quick action chips", () => {
    const response = runPublicOrchestrator("how does autolenis work", publicContext)
    if (response.quickActions) {
      expect(response.quickActions.length).toBeLessThanOrEqual(3)
    }
  })
})

describe("runPublicOrchestrator — response format", () => {
  it("always returns a non-empty text", () => {
    const messages = [
      "hello",
      "how does autolenis work",
      "what is the deposit",
      "",
    ]
    for (const msg of messages) {
      const response = runPublicOrchestrator(msg || "hello", publicContext)
      expect(response.text).toBeTruthy()
    }
  })
})
