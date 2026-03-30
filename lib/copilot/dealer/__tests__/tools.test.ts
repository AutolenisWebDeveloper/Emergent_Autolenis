import { describe, it, expect, vi, beforeEach } from "vitest"
import { DEALER_TOOLS } from "@/lib/copilot/dealer/tools"
import type { CopilotContext } from "@/lib/copilot/shared/types"

const dealerContext: CopilotContext = {
  variant: "dealer",
  role: "dealer",
  route: "/dealer/deals",
  sessionId: "test-session",
  userId: "dealer-123",
}

const SESSION_TOKEN = "dealer-token"

beforeEach(() => {
  vi.resetAllMocks()
})

describe("view_fix_list", () => {
  it("returns guidance when no dealId provided", async () => {
    const tool = DEALER_TOOLS["view_fix_list"]
    const result = await tool.execute({}, dealerContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/navigate/i)
    expect(result.redirectTo).toBeTruthy()
  })

  it("returns redirect to deal page when dealId provided (no fetch call)", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)

    const tool = DEALER_TOOLS["view_fix_list"]
    const result = await tool.execute({ dealId: "deal-456" }, dealerContext, SESSION_TOKEN)

    // Should NOT have made any fetch call — fix-list route was verified missing
    expect(mockFetch).not.toHaveBeenCalled()
    expect(result.redirectTo).toContain("deal-456")
    expect(result.summary).toMatch(/fix list/i)
  })

  it("does not expose buyer personal data in summary", async () => {
    const tool = DEALER_TOOLS["view_fix_list"]
    const result = await tool.execute({ dealId: "deal-456" }, dealerContext, SESSION_TOKEN)
    // Summary should not contain any buyer PII
    expect(result.summary).not.toMatch(/buyer@/i)
    expect(result.summary).not.toMatch(/555-/i)
  })
})

describe("submit_offer", () => {
  it("requires requiresConfirmation = true", () => {
    const tool = DEALER_TOOLS["submit_offer"]
    expect(tool.requiresConfirmation).toBe(true)
  })

  it("returns redirect guidance when no auctionId provided", async () => {
    const tool = DEALER_TOOLS["submit_offer"]
    const result = await tool.execute({}, dealerContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/navigate/i)
    expect(result.redirectTo).toBe("/dealer/auctions")
  })

  it("returns auction-specific redirect when auctionId provided", async () => {
    const tool = DEALER_TOOLS["submit_offer"]
    const result = await tool.execute({ auctionId: "auction-789" }, dealerContext, SESSION_TOKEN)
    expect(result.redirectTo).toContain("auction-789")
  })
})

describe("upload_contract", () => {
  it("returns guidance when no dealId provided", async () => {
    const tool = DEALER_TOOLS["upload_contract"]
    const result = await tool.execute({}, dealerContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/navigate/i)
    expect(result.redirectTo).toBe("/dealer/deals")
  })

  it("returns deal-specific redirect when dealId provided", async () => {
    const tool = DEALER_TOOLS["upload_contract"]
    const result = await tool.execute({ dealId: "deal-123" }, dealerContext, SESSION_TOKEN)
    expect(result.redirectTo).toContain("deal-123")
    expect(result.redirectTo).toContain("contract")
  })
})

describe("view_inventory", () => {
  it("navigates to inventory", async () => {
    const tool = DEALER_TOOLS["view_inventory"]
    const result = await tool.execute({}, dealerContext, SESSION_TOKEN)
    expect(result.redirectTo).toBe("/dealer/inventory")
  })
})

describe("view_active_auctions", () => {
  it("navigates to auctions", async () => {
    const tool = DEALER_TOOLS["view_active_auctions"]
    const result = await tool.execute({}, dealerContext, SESSION_TOKEN)
    expect(result.redirectTo).toBe("/dealer/auctions")
  })
})
