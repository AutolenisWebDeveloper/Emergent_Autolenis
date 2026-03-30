import { describe, it, expect, vi, beforeEach } from "vitest"
import { ADMIN_TOOLS, logAdminCopilotAction } from "@/lib/copilot/admin/tools"
import { scrubResponse } from "@/lib/copilot/shared/policies"
import type { CopilotContext } from "@/lib/copilot/shared/types"
import { logger } from "@/lib/logger"

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const adminContext: CopilotContext = {
  variant: "admin",
  role: "admin",
  route: "/admin",
  sessionId: "admin-session",
  userId: "admin-001",
}

const SESSION_TOKEN = "admin-token"

beforeEach(() => {
  vi.resetAllMocks()
})

describe("lookup_deal", () => {
  it("returns plain English stage — never raw enum", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ deal: { status: "FEE_PENDING" } }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const tool = ADMIN_TOOLS["lookup_deal"]
    const result = await tool.execute({ dealId: "deal-123" }, adminContext, SESSION_TOKEN)

    // Must not contain the raw enum
    expect(result.summary).not.toContain("FEE_PENDING")
    // Must contain human-readable label
    expect(result.summary).toMatch(/Concierge Fee Due/i)
  })

  it("returns guidance when no dealId provided", async () => {
    const tool = ADMIN_TOOLS["lookup_deal"]
    const result = await tool.execute({}, adminContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/provide a deal id/i)
  })

  it("returns not found message on 404", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    vi.stubGlobal("fetch", mockFetch)

    const tool = ADMIN_TOOLS["lookup_deal"]
    const result = await tool.execute({ dealId: "bad-id" }, adminContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/could not be found/i)
  })
})

describe("lookup_buyer", () => {
  it("returns buyer navigation redirect", async () => {
    const tool = ADMIN_TOOLS["lookup_buyer"]
    const result = await tool.execute({ buyerId: "buyer-123" }, adminContext, SESSION_TOKEN)
    expect(result.redirectTo).toContain("buyer-123")
  })

  it("returns guidance when no buyerId", async () => {
    const tool = ADMIN_TOOLS["lookup_buyer"]
    const result = await tool.execute({}, adminContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/provide a buyer id/i)
  })
})

describe("operations_report stub", () => {
  it("returns graceful fallback message", async () => {
    const tool = ADMIN_TOOLS["operations_report"]
    const result = await tool.execute({}, adminContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/currently unavailable/i)
    expect(result.summary).toMatch(/finance and funnel/i)
  })

  it("still provides a redirect to reports", async () => {
    const tool = ADMIN_TOOLS["operations_report"]
    const result = await tool.execute({}, adminContext, SESSION_TOKEN)
    expect(result.redirectTo).toBeTruthy()
  })
})

describe("stuck_deals", () => {
  it("reports count of stuck deals", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 3 }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const tool = ADMIN_TOOLS["stuck_deals"]
    const result = await tool.execute({}, adminContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/3 deal/i)
    expect(result.summary).toMatch(/72 hours/i)
  })

  it("reports zero stuck deals gracefully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 0 }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const tool = ADMIN_TOOLS["stuck_deals"]
    const result = await tool.execute({}, adminContext, SESSION_TOKEN)
    expect(result.summary).toMatch(/no deals.*stuck/i)
  })
})

describe("cron_status", () => {
  it("navigates to cron system page", async () => {
    const tool = ADMIN_TOOLS["cron_status"]
    const result = await tool.execute({}, adminContext, SESSION_TOKEN)
    expect(result.redirectTo).toContain("cron")
  })
})

describe("logAdminCopilotAction", () => {
  it("logs a structured ADMIN_COPILOT_ACTION event", () => {
    logAdminCopilotAction("admin-001", "LOOKUP_DEAL", "/admin/deals")

    expect(logger.info).toHaveBeenCalledWith(
      "ADMIN_COPILOT_ACTION",
      expect.objectContaining({
        type: "ADMIN_COPILOT_ACTION",
        actorId: "admin-001",
        intent: "LOOKUP_DEAL",
        route: "/admin/deals",
      }),
    )
  })

  it("includes timestamp in log", () => {
    logAdminCopilotAction("admin-001", "FINANCE_REPORT", "/admin/reports")
    expect(logger.info).toHaveBeenCalledWith(
      "ADMIN_COPILOT_ACTION",
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect.objectContaining({ timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/) }),
    )
  })
})

describe("compliance scrub on admin tool responses", () => {
  it("lookup_deal summary does not expose raw enums", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ deal: { status: "CONTRACT_REVIEW" } }),
    })
    vi.stubGlobal("fetch", mockFetch)

    const tool = ADMIN_TOOLS["lookup_deal"]
    const result = await tool.execute({ dealId: "d1" }, adminContext, SESSION_TOKEN)
    const scrubbed = scrubResponse(result.summary)
    expect(scrubbed).not.toContain("CONTRACT_REVIEW")
  })
})
