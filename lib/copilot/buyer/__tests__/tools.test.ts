import { describe, it, expect, vi, beforeEach } from "vitest"
import { BUYER_TOOLS } from "@/lib/copilot/buyer/tools"
import { scrubResponse } from "@/lib/copilot/shared/policies"
import type { CopilotContext } from "@/lib/copilot/shared/types"

const buyerContext: CopilotContext = {
  variant: "buyer",
  role: "buyer",
  route: "/buyer/deals",
  sessionId: "test-session",
  userId: "user-123",
}

const SESSION_TOKEN = "test-token"

beforeEach(() => {
  vi.resetAllMocks()
})

describe("add_to_shortlist", () => {
  it("returns guidance when no offerId provided", async () => {
    const tool = BUYER_TOOLS["add_to_shortlist"]
    const result = await tool.execute({}, buyerContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/navigate/i)
    expect(result.redirectTo).toBeTruthy()
  })

  it("returns max-5 error on 409 response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal("fetch", mockFetch)

    const tool = BUYER_TOOLS["add_to_shortlist"]
    const result = await tool.execute({ offerId: "offer-1" }, buyerContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/maximum of 5/i)
  })

  it("succeeds and returns shortlist redirect on 200", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal("fetch", mockFetch)

    const tool = BUYER_TOOLS["add_to_shortlist"]
    const result = await tool.execute({ offerId: "offer-1" }, buyerContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/shortlist/i)
    expect(result.redirectTo).toBe("/buyer/shortlist")
  })
})

describe("pay_deposit", () => {
  it("requires requiresConfirmation = true", () => {
    const tool = BUYER_TOOLS["pay_deposit"]
    expect(tool.requiresConfirmation).toBe(true)
  })

  it("returns checkout URL on success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ checkoutUrl: "https://checkout.stripe.com/test" }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const tool = BUYER_TOOLS["pay_deposit"]
    const result = await tool.execute({}, buyerContext, SESSION_TOKEN)
    expect(result.redirectTo).toBe("https://checkout.stripe.com/test")
    expect(result.summary).toMatch(/\$99/i)
  })

  it("throws on failed API call", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal("fetch", mockFetch)

    const tool = BUYER_TOOLS["pay_deposit"]
    await expect(tool.execute({}, buyerContext, SESSION_TOKEN)).rejects.toThrow()
  })
})

describe("view_deal_status", () => {
  it("translates deal stage to plain English", async () => {
    const contextWithStage: CopilotContext = {
      ...buyerContext,
      dealId: "deal-abc",
      dealStage: "FEE_PENDING",
    }
    const tool = BUYER_TOOLS["view_deal_status"]
    const result = await tool.execute({}, contextWithStage, SESSION_TOKEN)
    // Must not contain raw enum
    expect(result.summary).not.toMatch(/\bFEE_PENDING\b/)
    // Must contain human-readable label
    expect(result.summary).toMatch(/Concierge Fee Due/i)
  })

  it("returns guidance when no dealId", async () => {
    const tool = BUYER_TOOLS["view_deal_status"]
    const result = await tool.execute({}, buyerContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/don't have an active deal/i)
  })

  it("never returns 'approved for a loan' language", async () => {
    const contextWithStage: CopilotContext = { ...buyerContext, dealId: "d1", dealStage: "FINANCING_APPROVED" }
    const tool = BUYER_TOOLS["view_deal_status"]
    const result = await tool.execute({}, contextWithStage, SESSION_TOKEN)
    const scrubbed = scrubResponse(result.summary)
    expect(scrubbed).not.toMatch(/approved for a loan/i)
  })
})

describe("pay_concierge_fee", () => {
  it("requires FEE_PENDING stage", () => {
    const tool = BUYER_TOOLS["pay_concierge_fee"]
    expect(tool.requiredDealStage).toContain("FEE_PENDING")
  })

  it("returns guidance when no dealId", async () => {
    const tool = BUYER_TOOLS["pay_concierge_fee"]
    const result = await tool.execute({}, buyerContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/active deal/i)
  })

  it("returns checkout on success", async () => {
    const contextWithDeal: CopilotContext = { ...buyerContext, dealId: "deal-123", dealStage: "FEE_PENDING" }
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ checkoutUrl: "https://checkout.stripe.com/fee" }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const tool = BUYER_TOOLS["pay_concierge_fee"]
    const result = await tool.execute({}, contextWithDeal, SESSION_TOKEN)
    expect(result.redirectTo).toBe("https://checkout.stripe.com/fee")
  })
})

describe("include_fee_in_loan", () => {
  it("requires requiresConfirmation = true", () => {
    const tool = BUYER_TOOLS["include_fee_in_loan"]
    expect(tool.requiresConfirmation).toBe(true)
  })

  it("returns redirectTo only — no direct API call", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)

    const contextWithDeal: CopilotContext = { ...buyerContext, dealId: "deal-123", dealStage: "FEE_PENDING" }
    const tool = BUYER_TOOLS["include_fee_in_loan"]
    const result = await tool.execute({}, contextWithDeal, SESSION_TOKEN)

    // Should NOT have made any fetch call
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.redirectTo).toContain("/buyer/deals/deal-123/fee")
  })

  it("never mentions approved for a loan in summary", async () => {
    const contextWithDeal: CopilotContext = { ...buyerContext, dealId: "deal-123", dealStage: "FEE_PENDING" }
    const tool = BUYER_TOOLS["include_fee_in_loan"]
    const result = await tool.execute({}, contextWithDeal, SESSION_TOKEN)
    expect(scrubResponse(result.summary)).not.toMatch(/approved for a loan/i)
  })
})
