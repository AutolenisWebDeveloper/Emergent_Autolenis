/**
 * Public Orchestrator — Extended Intent Coverage Tests
 *
 * Tests the new intent patterns added for broader topic coverage:
 *  - TIMELINE_INQUIRY, TRADE_IN_INQUIRY, DELIVERY_INQUIRY
 *  - FINANCING_FAQ, PRIVACY_SECURITY, AUCTION_PROCESS, COMPARE_DEALERSHIP
 *  - Greeting detection integration
 */

import { describe, it, expect, vi } from "vitest"
import { runPublicOrchestrator } from "@/lib/copilot/public/orchestrator"
import type { CopilotContext } from "@/lib/copilot/shared/types"

// Mock LLM provider so tests run deterministically (no actual Groq calls)
vi.mock("@/lib/ai/llm-provider", () => ({
  isLLMAvailable: vi.fn(() => false),
  getLLM: vi.fn(() => null),
}))

const publicContext: CopilotContext = {
  variant: "public",
  role: "anonymous",
  route: "/",
  sessionId: "test-session",
}

// ---------------------------------------------------------------------------
// New intent patterns
// ---------------------------------------------------------------------------

describe("runPublicOrchestrator — new intent patterns", () => {
  it("matches TIMELINE_INQUIRY for 'how long does it take'", async () => {
    const response = await runPublicOrchestrator("how long does it take", publicContext)
    expect(response.intent).toBe("TIMELINE_INQUIRY")
    expect(response.text).toBeTruthy()
    expect(response.text!.toLowerCase()).toContain("day")
  })

  it("matches TRADE_IN_INQUIRY for 'can i trade in my car'", async () => {
    const response = await runPublicOrchestrator("can i trade in my car", publicContext)
    expect(response.intent).toBe("TRADE_IN_INQUIRY")
    expect(response.text).toBeTruthy()
  })

  it("matches DELIVERY_INQUIRY for 'how does delivery work'", async () => {
    const response = await runPublicOrchestrator("how does delivery work", publicContext)
    expect(response.intent).toBe("DELIVERY_INQUIRY")
    expect(response.text).toBeTruthy()
  })

  it("matches FINANCING_FAQ for 'how does financing work'", async () => {
    const response = await runPublicOrchestrator("how does financing work", publicContext)
    expect(response.intent).toBe("FINANCING_FAQ")
    expect(response.text).toBeTruthy()
    // Compliance: should not guarantee specific rates
    expect(response.text!.toLowerCase()).not.toMatch(/guaranteed/i)
  })

  it("matches PRIVACY_SECURITY for 'is my data safe'", async () => {
    const response = await runPublicOrchestrator("is my data safe", publicContext)
    expect(response.intent).toBe("PRIVACY_SECURITY")
    expect(response.text).toBeTruthy()
  })

  it("matches AUCTION_PROCESS for 'how does the auction work'", async () => {
    const response = await runPublicOrchestrator("how does the auction work", publicContext)
    expect(response.intent).toBe("AUCTION_PROCESS")
    expect(response.text).toBeTruthy()
    expect(response.text!.toLowerCase()).toContain("blind")
  })

  it("matches COMPARE_DEALERSHIP for 'why not go to a dealership'", async () => {
    const response = await runPublicOrchestrator("why not go to a dealership", publicContext)
    expect(response.intent).toBe("COMPARE_DEALERSHIP")
    expect(response.text).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Greeting detection integration
// ---------------------------------------------------------------------------

describe("runPublicOrchestrator — greeting detection", () => {
  it("responds naturally to 'hello'", async () => {
    const response = await runPublicOrchestrator("hello", publicContext)
    expect(response.intent).toBe("GREETING")
    expect(response.text).toBeTruthy()
    expect(response.text!.toLowerCase()).toContain("autolenis")
  })

  it("responds with quick actions for greetings", async () => {
    const response = await runPublicOrchestrator("hi", publicContext)
    expect(response.intent).toBe("GREETING")
    expect(response.quickActions).toBeDefined()
    expect(response.quickActions!.length).toBeGreaterThan(0)
  })

  it("does NOT treat 'what is contract shield' as greeting", async () => {
    const response = await runPublicOrchestrator("what is contract shield", publicContext)
    expect(response.intent).not.toBe("GREETING")
  })

  it("does NOT treat 'how does it work' as greeting", async () => {
    const response = await runPublicOrchestrator("how does it work", publicContext)
    expect(response.intent).not.toBe("GREETING")
  })
})

// ---------------------------------------------------------------------------
// Conversation history passthrough
// ---------------------------------------------------------------------------

describe("runPublicOrchestrator — conversation history", () => {
  it("accepts history parameter without error", async () => {
    const history = [
      { role: "user" as const, content: "hello", timestamp: Date.now() - 1000 },
      { role: "assistant" as const, content: "Welcome!", timestamp: Date.now() - 500 },
    ]
    const response = await runPublicOrchestrator("how does autolenis work", publicContext, history)
    expect(response.intent).toBe("HOW_IT_WORKS")
    expect(response.text).toBeTruthy()
  })

  it("works with empty history", async () => {
    const response = await runPublicOrchestrator("how does autolenis work", publicContext, [])
    expect(response.intent).toBe("HOW_IT_WORKS")
  })
})

// ---------------------------------------------------------------------------
// Knowledge module content quality
// ---------------------------------------------------------------------------

describe("runPublicOrchestrator — knowledge module quality", () => {
  const intents = [
    { msg: "how does autolenis work", intent: "HOW_IT_WORKS" },
    { msg: "how much does it cost", intent: "PRICING_INQUIRY" },
    { msg: "how much is the deposit", intent: "DEPOSIT_INQUIRY" },
    { msg: "what is the concierge fee", intent: "CONCIERGE_FEE_INQUIRY" },
    { msg: "how long does it take", intent: "TIMELINE_INQUIRY" },
    { msg: "is my data safe", intent: "PRIVACY_SECURITY" },
    { msg: "how does the auction work", intent: "AUCTION_PROCESS" },
  ]

  for (const { msg, intent } of intents) {
    it(`${intent}: returns non-empty text with quick actions`, async () => {
      const response = await runPublicOrchestrator(msg, publicContext)
      expect(response.intent).toBe(intent)
      expect(response.text!.length).toBeGreaterThan(50) // Substantial response
      if (response.quickActions) {
        expect(response.quickActions.length).toBeLessThanOrEqual(3)
        for (const qa of response.quickActions) {
          expect(qa.label).toBeTruthy()
          expect(qa.message).toBeTruthy()
        }
      }
    })
  }
})
