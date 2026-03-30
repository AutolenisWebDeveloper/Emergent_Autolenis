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

  it("returns issue count and categories on success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        items: [
          { category: "Mechanical" },
          { category: "Mechanical" },
          { category: "Cosmetic" },
        ],
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const tool = DEALER_TOOLS["view_fix_list"]
    const result = await tool.execute({ dealId: "deal-456" }, dealerContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/3 fix item/i)
    expect(result.summary).toMatch(/Mechanical/i)
    expect(result.summary).toMatch(/Cosmetic/i)
  })

  it("does not expose buyer personal data in summary", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        items: [
          { category: "Tire", buyerEmail: "buyer@test.com", buyerPhone: "555-1234" },
        ],
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const tool = DEALER_TOOLS["view_fix_list"]
    const result = await tool.execute({ dealId: "deal-456" }, dealerContext, SESSION_TOKEN)
    // Summary should not contain buyer email or phone
    expect(result.summary).not.toContain("buyer@test.com")
    expect(result.summary).not.toContain("555-1234")
  })

  it("returns zero items message when no fix items", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const tool = DEALER_TOOLS["view_fix_list"]
    const result = await tool.execute({ dealId: "deal-456" }, dealerContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/no fix items/i)
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
