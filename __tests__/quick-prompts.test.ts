/**
 * Tests for Quick Prompts — context-aware pre-selected questions.
 *
 * Validates that getQuickPrompts() returns the correct prompt set
 * for each role, route pattern, and state flag combination.
 */

import { describe, expect, it } from "vitest"
import {
  getQuickPrompts,
  MORE_DETAILS_PROMPT,
  type QuickPrompt,
  type QuickPromptInput,
} from "@/lib/lenis/quickPrompts"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Assert every prompt has both emoji and label. */
function assertValidPrompts(prompts: QuickPrompt[]) {
  expect(prompts.length).toBeGreaterThanOrEqual(6)
  expect(prompts.length).toBeLessThanOrEqual(10)
  for (const p of prompts) {
    expect(p.emoji).toBeTruthy()
    expect(p.label).toBeTruthy()
  }
}

/** Assert at least one prompt label contains one of the given substrings. */
function assertContainsPromptMatching(prompts: QuickPrompt[], substrings: string[]) {
  const found = prompts.some((p) =>
    substrings.some((s) => p.label.toLowerCase().includes(s.toLowerCase())),
  )
  expect(found).toBe(true)
}

// ---------------------------------------------------------------------------
// Public role / homepage
// ---------------------------------------------------------------------------

describe("getQuickPrompts — public / homepage", () => {
  const input: QuickPromptInput = { role: "public", pathname: "/" }

  it("returns 6–10 valid prompts", () => {
    assertValidPrompts(getQuickPrompts(input))
  })

  it("includes a fees question", () => {
    assertContainsPromptMatching(getQuickPrompts(input), ["fee"])
  })

  it("includes a start/next-step action", () => {
    assertContainsPromptMatching(getQuickPrompts(input), ["start", "request"])
  })

  it('includes a "how it works" question', () => {
    assertContainsPromptMatching(getQuickPrompts(input), [
      "how",
      "what's included",
      "pre-qualification",
    ])
  })
})

// ---------------------------------------------------------------------------
// Buyer role / dashboard
// ---------------------------------------------------------------------------

describe("getQuickPrompts — buyer dashboard", () => {
  it("returns default buyer prompts without active request", () => {
    const prompts = getQuickPrompts({ role: "buyer", pathname: "/buyer" })
    assertValidPrompts(prompts)
    assertContainsPromptMatching(prompts, ["fee"])
    assertContainsPromptMatching(prompts, ["affordability", "create", "request"])
  })

  it("returns active-request prompts when state.hasActiveRequest is true", () => {
    const prompts = getQuickPrompts({
      role: "buyer",
      pathname: "/buyer",
      state: { hasActiveRequest: true },
    })
    assertValidPrompts(prompts)
    // Should have tracking prompts instead of "create"
    assertContainsPromptMatching(prompts, ["step", "update"])
  })

  it("route /buyer overrides role fallback", () => {
    // A public role on the buyer route should still get buyer prompts
    const prompts = getQuickPrompts({ role: "public", pathname: "/buyer/dashboard" })
    assertContainsPromptMatching(prompts, ["affordability", "create", "document"])
  })
})

// ---------------------------------------------------------------------------
// Dealer role
// ---------------------------------------------------------------------------

describe("getQuickPrompts — dealer dashboard", () => {
  const input: QuickPromptInput = { role: "dealer", pathname: "/dealer" }

  it("returns 6–10 valid prompts", () => {
    assertValidPrompts(getQuickPrompts(input))
  })

  it("includes a fees question", () => {
    assertContainsPromptMatching(getQuickPrompts(input), ["fee"])
  })

  it("includes an offer/action question", () => {
    assertContainsPromptMatching(getQuickPrompts(input), ["offer", "submit"])
  })

  it("includes a process/how question", () => {
    assertContainsPromptMatching(getQuickPrompts(input), ["ranking", "timeline", "how"])
  })
})

// ---------------------------------------------------------------------------
// Affiliate role
// ---------------------------------------------------------------------------

describe("getQuickPrompts — affiliate dashboard", () => {
  const input: QuickPromptInput = { role: "affiliate", pathname: "/affiliate" }

  it("returns 6–10 valid prompts", () => {
    assertValidPrompts(getQuickPrompts(input))
  })

  it("includes a referral/link prompt", () => {
    assertContainsPromptMatching(getQuickPrompts(input), ["referral", "link"])
  })

  it("includes a payout question", () => {
    assertContainsPromptMatching(getQuickPrompts(input), ["payout"])
  })

  it("includes an attribution question", () => {
    assertContainsPromptMatching(getQuickPrompts(input), ["attribution", "tracked"])
  })
})

// ---------------------------------------------------------------------------
// Admin role
// ---------------------------------------------------------------------------

describe("getQuickPrompts — admin dashboard", () => {
  const input: QuickPromptInput = { role: "admin", pathname: "/admin" }

  it("returns 6–10 valid prompts", () => {
    assertValidPrompts(getQuickPrompts(input))
  })

  it("includes a search/user prompt", () => {
    assertContainsPromptMatching(getQuickPrompts(input), ["search", "user"])
  })

  it("includes a report prompt", () => {
    assertContainsPromptMatching(getQuickPrompts(input), ["report"])
  })

  it("includes a fees/revenue prompt", () => {
    assertContainsPromptMatching(getQuickPrompts(input), ["fee", "revenue"])
  })
})

// ---------------------------------------------------------------------------
// Role fallback when pathname is generic
// ---------------------------------------------------------------------------

describe("getQuickPrompts — role fallback on generic path", () => {
  it("returns admin prompts for admin role on /", () => {
    const prompts = getQuickPrompts({ role: "admin", pathname: "/" })
    assertContainsPromptMatching(prompts, ["search", "report", "revenue"])
  })

  it("returns dealer prompts for dealer role on /settings", () => {
    const prompts = getQuickPrompts({ role: "dealer", pathname: "/settings" })
    assertContainsPromptMatching(prompts, ["offer", "ranking"])
  })
})

// ---------------------------------------------------------------------------
// MORE_DETAILS_PROMPT
// ---------------------------------------------------------------------------

describe("MORE_DETAILS_PROMPT", () => {
  it("is a non-empty expand instruction", () => {
    expect(MORE_DETAILS_PROMPT).toContain("Expand")
    expect(MORE_DETAILS_PROMPT.length).toBeGreaterThan(10)
  })
})

// ---------------------------------------------------------------------------
// Brevity policy in system prompt
// ---------------------------------------------------------------------------

describe("brevity policy in system prompt", () => {
  it("includes concise answer instruction", async () => {
    const { BREVITY_POLICY } = await import("@/lib/ai/prompts/system-prompt")
    expect(BREVITY_POLICY).toContain("2–5 sentences")
    expect(BREVITY_POLICY).toContain("3–6 bullets")
  })

  it("prohibits repeating the user question", async () => {
    const { BREVITY_POLICY } = await import("@/lib/ai/prompts/system-prompt")
    expect(BREVITY_POLICY).toContain("Do not repeat the user's question")
  })

  it("prohibits marketing filler", async () => {
    const { BREVITY_POLICY } = await import("@/lib/ai/prompts/system-prompt")
    expect(BREVITY_POLICY).toContain("Avoid marketing filler")
  })

  it("requires calculator tool usage for affordability", async () => {
    const { BREVITY_POLICY } = await import("@/lib/ai/prompts/system-prompt")
    expect(BREVITY_POLICY).toContain("NEVER estimate manually")
    expect(BREVITY_POLICY).toContain("calculator tool")
  })

  it("includes calculator short format (≤6 bullets)", async () => {
    const { BREVITY_POLICY } = await import("@/lib/ai/prompts/system-prompt")
    expect(BREVITY_POLICY).toContain("≤6 bullets")
  })

  it("is included in buildFullSystemPrompt output", async () => {
    const { buildFullSystemPrompt } = await import("@/lib/ai/prompts/system-prompt")
    const prompt = buildFullSystemPrompt("public", "test")
    expect(prompt).toContain("BREVITY & PRECISION POLICY")
  })
})
