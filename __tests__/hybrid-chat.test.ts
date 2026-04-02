/**
 * Hybrid Chat Engine — Unit Tests
 *
 * Tests the hybridChat() pipeline:
 *  1. FAQ fast-path returns instantly for known intents
 *  2. LLM fallback is called when FAQ returns null (no match)
 *  3. Compliance scrub is applied to LLM output
 *  4. Graceful degradation when LLM is unavailable (no API key)
 *  5. Kill switch prevents LLM calls
 *  6. Groq API errors fall back to deterministic reply
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { CopilotContext, ConversationTurn } from "@/lib/copilot/shared/types"

// ---------------------------------------------------------------------------
// Mocks — set up BEFORE importing the module under test
// ---------------------------------------------------------------------------

// Mock the Groq generateText from Vercel AI SDK
vi.mock("ai", () => ({
  generateText: vi.fn(),
}))

// Mock llm-provider
vi.mock("@/lib/ai/llm-provider", () => ({
  isLLMAvailable: vi.fn(() => false),
  getLLM: vi.fn(() => null),
  DEFAULT_GROQ_MODEL: "llama-3.3-70b-versatile",
  FALLBACK_GROQ_MODEL: "mixtral-8x7b-32768",
}))

// ---------------------------------------------------------------------------
// Import after mocks are wired
// ---------------------------------------------------------------------------

import { hybridChat } from "@/lib/ai/hybrid-chat"
import { generateText } from "ai"
import { isLLMAvailable, getLLM } from "@/lib/ai/llm-provider"
import type { GroqModel } from "@/lib/ai/llm-provider"

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const publicContext: CopilotContext = {
  variant: "public",
  role: "anonymous",
  route: "/",
  sessionId: "test-session-001",
}

const buyerContext: CopilotContext = {
  variant: "buyer",
  role: "buyer",
  route: "/buyer/dashboard",
  sessionId: "test-session-002",
  dealStage: "FEE_PENDING",
}

const mockModel = { id: "llama-3.3-70b-versatile" } as unknown as GroqModel

// ---------------------------------------------------------------------------
// Suite 1 — FAQ fast-path
// ---------------------------------------------------------------------------

describe("hybridChat — FAQ fast-path", () => {
  beforeEach(() => {
    vi.mocked(isLLMAvailable).mockReturnValue(false)
    vi.mocked(getLLM).mockReturnValue(null)
  })

  it("returns source='faq' for a well-known FAQ phrase", async () => {
    const result = await hybridChat({
      message: "how does autolenis work",
      variant: "public",
      context: publicContext,
    })
    expect(result.source).toBe("faq")
    expect(result.reply).toBeTruthy()
    expect(result.intent).toBeTruthy()
  })

  it("returns source='faq' for pricing question", async () => {
    const result = await hybridChat({
      message: "how much does it cost",
      variant: "public",
      context: publicContext,
    })
    expect(result.source).toBe("faq")
    // FAQ intentId may differ from copilot intent name — just verify it matched something
    expect(result.intent).toBeTruthy()
  })

  it("does NOT call generateText for FAQ-matched messages", async () => {
    await hybridChat({
      message: "what is the deposit",
      variant: "public",
      context: publicContext,
    })
    expect(vi.mocked(generateText)).not.toHaveBeenCalled()
  })

  it("returns intent with FAQ match", async () => {
    const result = await hybridChat({
      message: "what is contract shield",
      variant: "public",
      context: publicContext,
    })
    expect(result.source).toBe("faq")
    expect(result.intent).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Suite 2 — LLM fallback path
// ---------------------------------------------------------------------------

describe("hybridChat — LLM fallback", () => {
  beforeEach(() => {
    vi.mocked(isLLMAvailable).mockReturnValue(true)
    vi.mocked(getLLM).mockReturnValue(mockModel)
    vi.mocked(generateText).mockResolvedValue({
      text: "This is an intelligent LLM response about AutoLenis.",
    } as Awaited<ReturnType<typeof generateText>>)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it("calls generateText for unrecognized input when LLM is available", async () => {
    const result = await hybridChat({
      message: "xyzzy plugh plover unrecognized query 1234",
      variant: "public",
      context: publicContext,
    })
    expect(vi.mocked(generateText)).toHaveBeenCalled()
    expect(result.source).toBe("llm")
    expect(result.reply).toContain("LLM response")
  })

  it("includes conversation history in LLM call (up to 10 turns)", async () => {
    const history: ConversationTurn[] = Array.from({ length: 12 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Turn ${i}`,
      timestamp: Date.now() - (12 - i) * 1000,
    }))

    await hybridChat({
      message: "qjwxkzpvtuyreobcm this has no faq match at all 9z8x7y",
      variant: "public",
      context: publicContext,
      history,
    })

    expect(vi.mocked(generateText)).toHaveBeenCalled()
    const callArgs = vi.mocked(generateText).mock.calls[0]?.[0]
    expect(callArgs).toBeDefined()
    if (callArgs && "messages" in callArgs && Array.isArray(callArgs.messages)) {
      // Max 10 history + 1 current = 11 total
      expect(callArgs.messages.length).toBeLessThanOrEqual(11)
    }
  })

  it("does NOT call LLM for FAQ-matched messages even when LLM is available", async () => {
    const result = await hybridChat({
      message: "how does autolenis work",
      variant: "public",
      context: publicContext,
    })
    expect(vi.mocked(generateText)).not.toHaveBeenCalled()
    expect(result.source).toBe("faq")
  })
})

// ---------------------------------------------------------------------------
// Suite 3 — Compliance scrub applied to LLM output
// ---------------------------------------------------------------------------

describe("hybridChat — compliance scrub on LLM output", () => {
  it("strips loan approval language from LLM response", async () => {
    vi.mocked(isLLMAvailable).mockReturnValue(true)
    vi.mocked(getLLM).mockReturnValue(mockModel)
    vi.mocked(generateText).mockResolvedValue({
      text: "You're pre-approved for a loan! Your financing is guaranteed.",
    } as Awaited<ReturnType<typeof generateText>>)

    const result = await hybridChat({
      message: "qjwxkzpvt unrecognized financial query z9x8y7",
      variant: "public",
      context: publicContext,
    })

    expect(result.reply).not.toMatch(/you('re| are) (pre-?)?approved/i)
    expect(result.reply).not.toMatch(/guaranteed/i)
    expect(result.source).toBe("llm")

    vi.resetAllMocks()
  })

  it("strips raw DealStage enum values from LLM response", async () => {
    vi.mocked(isLLMAvailable).mockReturnValue(true)
    vi.mocked(getLLM).mockReturnValue(mockModel)
    vi.mocked(generateText).mockResolvedValue({
      text: "Your deal is currently in FEE_PENDING status.",
    } as Awaited<ReturnType<typeof generateText>>)

    // Use public variant — compliance scrub applies to all variants
    const result = await hybridChat({
      message: "qjwxkzpvt rstlnefq zz88xx77yy mmmnnn",
      variant: "public",
      context: publicContext,
    })

    expect(result.reply).not.toMatch(/\bFEE_PENDING\b/)
    expect(result.source).toBe("llm")

    vi.resetAllMocks()
  })
})

// ---------------------------------------------------------------------------
// Suite 4 — Graceful degradation when LLM unavailable
// ---------------------------------------------------------------------------

describe("hybridChat — graceful degradation (no API key)", () => {
  beforeEach(() => {
    vi.mocked(isLLMAvailable).mockReturnValue(false)
    vi.mocked(getLLM).mockReturnValue(null)
  })

  it("returns source='faq' with fallback text when LLM unavailable", async () => {
    const result = await hybridChat({
      message: "completely unknown query xyzzy1234abcd",
      variant: "public",
      context: publicContext,
    })

    expect(result.source).toBe("faq")
    expect(result.reply).toBeTruthy()
    expect(result.intent).toBe("FALLBACK")
    expect(vi.mocked(generateText)).not.toHaveBeenCalled()
  })

  it("returns variant-specific fallback text for buyer when LLM unavailable", async () => {
    const result = await hybridChat({
      message: "completely unknown query xyzzy1234abcd",
      variant: "buyer",
      context: buyerContext,
    })

    expect(result.source).toBe("faq")
    expect(result.reply).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Suite 5 — Kill switch prevents LLM calls
// ---------------------------------------------------------------------------

describe("hybridChat — kill switch", () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  it("falls back to FAQ when kill switch is active (isLLMAvailable returns false)", async () => {
    // isAIDisabled() returns true → isLLMAvailable() returns false
    vi.mocked(isLLMAvailable).mockReturnValue(false)
    vi.mocked(getLLM).mockReturnValue(null)

    const result = await hybridChat({
      message: "unknown query kill switch test abc123",
      variant: "public",
      context: publicContext,
    })

    expect(vi.mocked(generateText)).not.toHaveBeenCalled()
    expect(result.source).toBe("faq")
  })
})

// ---------------------------------------------------------------------------
// Suite 6 — LLM error handling
// ---------------------------------------------------------------------------

describe("hybridChat — LLM error recovery", () => {
  beforeEach(() => {
    vi.mocked(isLLMAvailable).mockReturnValue(true)
    vi.mocked(getLLM).mockReturnValue(mockModel)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it("falls back to deterministic reply when generateText throws", async () => {
    vi.mocked(generateText).mockRejectedValue(new Error("Groq API timeout"))

    const result = await hybridChat({
      message: "unknown query that causes LLM error xyz789",
      variant: "public",
      context: publicContext,
    })

    // Should not throw — should degrade gracefully to fallback
    expect(result.source).toBe("faq")
    expect(result.reply).toBeTruthy()
    expect(result.intent).toBe("FALLBACK")
  })

  it("returns valid reply even on network error", async () => {
    vi.mocked(generateText).mockRejectedValue(new TypeError("fetch failed"))

    const result = await hybridChat({
      message: "network error simulation xyz456",
      variant: "dealer",
      context: { ...publicContext, variant: "dealer", role: "dealer" },
    })

    expect(result.reply).toBeTruthy()
    expect(result.source).toBe("faq")
  })
})
