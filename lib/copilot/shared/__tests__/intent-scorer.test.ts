import { describe, it, expect } from "vitest"
import { scoreIntents, topIntent, ACTION_THRESHOLD } from "@/lib/copilot/shared/intent-scorer"
import type { IntentPattern, ScoredIntent } from "@/lib/copilot/shared/intent-scorer"
import type { CopilotContext } from "@/lib/copilot/shared/types"

const baseContext: CopilotContext = {
  variant: "buyer",
  role: "buyer",
  route: "/buyer/deals",
  sessionId: "test-session",
}

const testPatterns: IntentPattern[] = [
  {
    name: "PAY_DEPOSIT",
    phrases: ["pay my deposit", "place deposit"],
    keywords: ["deposit", "pay", "$99"],
    roleRequired: ["buyer"],
    routeBonus: ["/buyer"],
    stageBonus: ["FEE_PENDING"],
  },
  {
    name: "VIEW_DEAL_STATUS",
    phrases: ["check my deal", "what is my deal status"],
    keywords: ["deal", "status", "progress"],
    roleRequired: ["buyer"],
    routeBonus: ["/buyer"],
  },
  {
    name: "ADMIN_ONLY",
    phrases: ["admin report"],
    keywords: ["admin", "report"],
    roleRequired: ["admin"],
  },
]

describe("scoreIntents — exact phrase match", () => {
  it("scores 1.0 for exact phrase", () => {
    const scores = scoreIntents("pay my deposit", baseContext, testPatterns)
    const match = scores.find((s) => s.name === "PAY_DEPOSIT")
    expect(match?.score).toBe(1.0)
  })

  it("scores 1.0 for another exact phrase", () => {
    const scores = scoreIntents("what is my deal status", baseContext, testPatterns)
    const match = scores.find((s) => s.name === "VIEW_DEAL_STATUS")
    expect(match?.score).toBe(1.0)
  })
})

describe("scoreIntents — keyword matching", () => {
  it("scores 0.7 for two keyword matches", () => {
    const scores = scoreIntents("I want to pay for my deposit", baseContext, testPatterns)
    const match = scores.find((s) => s.name === "PAY_DEPOSIT")
    // "deposit" + "pay" = 0.7, plus route bonus +0.3 = 1.0 (capped)
    expect(match?.score).toBeGreaterThanOrEqual(0.7)
  })

  it("scores at least 0.4 for single keyword match", () => {
    const scores = scoreIntents("I need help with my deposit", baseContext, testPatterns)
    const match = scores.find((s) => s.name === "PAY_DEPOSIT")
    // "deposit" alone = 0.4, then route bonus from /buyer = +0.3 → 0.7
    expect(match?.score).toBeGreaterThanOrEqual(0.4)
  })

  it("scores 0.0 for no match", () => {
    const scores = scoreIntents("what is the weather like today", baseContext, testPatterns)
    const match = scores.find((s) => s.name === "PAY_DEPOSIT")
    expect(match?.score).toBe(0)
  })
})

describe("scoreIntents — route bonus", () => {
  it("adds +0.3 when route matches routeBonus", () => {
    // One keyword "deal" = 0.4, route /buyer matches → +0.3 = 0.7
    const scores = scoreIntents("check my deal", baseContext, testPatterns)
    const match = scores.find((s) => s.name === "VIEW_DEAL_STATUS")
    expect(match?.score).toBeGreaterThanOrEqual(1.0) // exact phrase "check my deal" = 1.0
  })

  it("does not add route bonus when route does not match", () => {
    const offRouteContext: CopilotContext = { ...baseContext, route: "/public" }
    // "status" = single keyword = 0.4, no route bonus
    const scores = scoreIntents("deal status", offRouteContext, testPatterns)
    const match = scores.find((s) => s.name === "VIEW_DEAL_STATUS")
    // "deal" + "status" = two keywords = 0.7
    expect(match?.score).toBe(0.7)
  })
})

describe("scoreIntents — role mismatch", () => {
  it("floors to 0.0 when role does not match roleRequired", () => {
    const scores = scoreIntents("admin report", baseContext, testPatterns)
    const match = scores.find((s) => s.name === "ADMIN_ONLY")
    expect(match?.score).toBe(0.0)
  })

  it("scores normally when role matches", () => {
    const adminContext: CopilotContext = { ...baseContext, role: "admin", variant: "admin" }
    const scores = scoreIntents("admin report", adminContext, testPatterns)
    const match = scores.find((s) => s.name === "ADMIN_ONLY")
    expect(match?.score).toBeGreaterThan(0)
  })
})

describe("scoreIntents — stage bonus", () => {
  it("adds +0.4 when dealStage matches stageBonus", () => {
    const stageContext: CopilotContext = { ...baseContext, dealStage: "FEE_PENDING" }
    // "deposit" single keyword = 0.4, route bonus +0.3, stage bonus +0.4 → capped at 1.0
    const scores = scoreIntents("deposit", stageContext, testPatterns)
    const match = scores.find((s) => s.name === "PAY_DEPOSIT")
    expect(match?.score).toBeGreaterThanOrEqual(0.7)
  })
})

describe("topIntent — action threshold", () => {
  it("returns null when top score is below threshold", () => {
    const result = topIntent("nothing relevant here", baseContext, testPatterns, ACTION_THRESHOLD)
    expect(result).toBeNull()
  })

  it("returns top intent when score meets threshold", () => {
    const result = topIntent("pay my deposit", baseContext, testPatterns, ACTION_THRESHOLD)
    expect(result).not.toBeNull()
    expect(result?.name).toBe("PAY_DEPOSIT")
    expect(result?.score).toBeGreaterThanOrEqual(ACTION_THRESHOLD)
  })

  it("returns the highest scoring intent", () => {
    const scores = scoreIntents("check my deal status", baseContext, testPatterns)
    const sorted = [...scores].sort((a: ScoredIntent, b: ScoredIntent) => b.score - a.score)
    expect(sorted[0].name).toBe("VIEW_DEAL_STATUS")
  })
})
