import { describe, it, expect, vi, beforeEach } from "vitest"
import { AFFILIATE_TOOLS } from "@/lib/copilot/affiliate/tools"
import { scrubResponse } from "@/lib/copilot/shared/policies"
import type { CopilotContext } from "@/lib/copilot/shared/types"

const affiliateContext: CopilotContext = {
  variant: "affiliate",
  role: "affiliate",
  route: "/affiliate/portal",
  sessionId: "test-session",
  userId: "affiliate-123",
}

const SESSION_TOKEN = "affiliate-token"

beforeEach(() => {
  vi.resetAllMocks()
})

describe("view_commission_breakdown", () => {
  it("returns commission structure text", async () => {
    const tool = AFFILIATE_TOOLS["view_commission_breakdown"]
    const result = await tool.execute({}, affiliateContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/15%/i)
    expect(result.summary).toMatch(/3%/i)
    expect(result.summary).toMatch(/2%/i)
  })

  it("does not contain earnings guarantee language", async () => {
    const tool = AFFILIATE_TOOLS["view_commission_breakdown"]
    const result = await tool.execute({}, affiliateContext, SESSION_TOKEN)
    const scrubbed = scrubResponse(result.summary)
    expect(scrubbed).not.toMatch(/guaranteed (income|earnings|commissions?)/i)
    expect(scrubbed).not.toMatch(/you('ll| will) earn \$[\d,]+/i)
  })

  it("mentions activity-based nature of commissions", async () => {
    const tool = AFFILIATE_TOOLS["view_commission_breakdown"]
    const result = await tool.execute({}, affiliateContext, SESSION_TOKEN)
    // Should clarify that earnings depend on activity
    expect(result.summary).toMatch(/activity|depend|vary/i)
  })
})

describe("view_referrals", () => {
  it("returns referral count on success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 12 }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const tool = AFFILIATE_TOOLS["view_referrals"]
    const result = await tool.execute({}, affiliateContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/12 referral/i)
    expect(result.redirectTo).toBe("/affiliate/referrals")
  })

  it("falls back gracefully on API failure", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal("fetch", mockFetch)

    const tool = AFFILIATE_TOOLS["view_referrals"]
    const result = await tool.execute({}, affiliateContext, SESSION_TOKEN)
    expect(result.redirectTo).toBe("/affiliate/referrals")
  })
})

describe("view_payout_history", () => {
  it("navigates to payout history", async () => {
    const tool = AFFILIATE_TOOLS["view_payout_history"]
    const result = await tool.execute({}, affiliateContext, SESSION_TOKEN)
    expect(result.redirectTo).toBe("/affiliate/payouts")
  })
})

describe("get_referral_link", () => {
  it("navigates to referral link page", async () => {
    const tool = AFFILIATE_TOOLS["get_referral_link"]
    const result = await tool.execute({}, affiliateContext, SESSION_TOKEN)
    expect(result.redirectTo).toBe("/affiliate/links")
  })
})

describe("no earnings guarantee language across all affiliate tools", () => {
  it("commission breakdown summary does not project specific earnings", async () => {
    const tool = AFFILIATE_TOOLS["view_commission_breakdown"]
    const result = await tool.execute({}, affiliateContext, SESSION_TOKEN)
    // No "$X per month" or "earn $X" type claims
    expect(result.summary).not.toMatch(/you('ll| will) (earn|make|receive) \$[\d,]+/i)
    expect(result.summary).not.toMatch(/guaranteed/i)
  })
})
