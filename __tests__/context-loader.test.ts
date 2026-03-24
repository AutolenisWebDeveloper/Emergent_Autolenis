/**
 * Tests for the Context Loader.
 *
 * Validates the type contracts and serialization logic.
 * DB-dependent tests are skipped (Prisma not available in test env).
 */

import { describe, expect, it } from "vitest"
import {
  serializeConciergeContext,
  type ConciergeContext,
} from "@/lib/ai/context-loader"

// ---------------------------------------------------------------------------
// serializeConciergeContext
// ---------------------------------------------------------------------------

describe("serializeConciergeContext", () => {
  it("serializes public context", () => {
    const ctx: ConciergeContext = {
      userId: "anon",
      role: "public",
      workspaceId: null,
      workspaceMode: "LIVE",
      buyer: null,
      dealer: null,
      affiliate: null,
      admin: null,
    }
    const result = serializeConciergeContext(ctx)
    expect(result).toContain("ROLE: public")
    expect(result).toContain("WORKSPACE: LIVE")
    expect(result).not.toContain("BUYER LIFECYCLE")
  })

  it("serializes buyer context with prequal", () => {
    const ctx: ConciergeContext = {
      userId: "user_1",
      role: "buyer",
      workspaceId: "ws_1",
      workspaceMode: "LIVE",
      buyer: {
        prequal: { exists: true, creditTier: "GOOD", softPullCompleted: true, consentGiven: true },
        shortlist: { count: 2 },
        auction: { id: "auc_1", status: "ACTIVE", offerCount: 3, endsAt: "2026-03-01T00:00:00Z" },
        deal: null,
        payments: { depositStatus: "SUCCEEDED", serviceFeeStatus: null },
        insurance: { status: null },
        contractShield: { status: null, issuesFound: false },
        esign: { status: null },
        pickup: { status: null, scheduledDate: null },
      },
      dealer: null,
      affiliate: null,
      admin: null,
    }
    const result = serializeConciergeContext(ctx)
    expect(result).toContain("BUYER LIFECYCLE")
    expect(result).toContain("Prequal: tier=GOOD")
    expect(result).toContain("Shortlist: 2 vehicle(s)")
    expect(result).toContain("Auction: status=ACTIVE, offers=3")
    expect(result).toContain("Deposit: SUCCEEDED")
  })

  it("serializes buyer context without prequal", () => {
    const ctx: ConciergeContext = {
      userId: "user_1",
      role: "buyer",
      workspaceId: "ws_1",
      workspaceMode: "LIVE",
      buyer: {
        prequal: { exists: false, creditTier: null, softPullCompleted: false, consentGiven: false },
        shortlist: { count: 0 },
        auction: null,
        deal: null,
        payments: { depositStatus: null, serviceFeeStatus: null },
        insurance: { status: null },
        contractShield: { status: null, issuesFound: false },
        esign: { status: null },
        pickup: { status: null, scheduledDate: null },
      },
      dealer: null,
      affiliate: null,
      admin: null,
    }
    const result = serializeConciergeContext(ctx)
    expect(result).toContain("Prequal: not started")
    expect(result).toContain("Shortlist: 0 vehicle(s)")
  })

  it("serializes dealer context", () => {
    const ctx: ConciergeContext = {
      userId: "user_d",
      role: "dealer",
      workspaceId: "ws_1",
      workspaceMode: "LIVE",
      buyer: null,
      dealer: { activeAuctions: 5, pendingBids: 5, pendingPickups: 2, pendingContractFixes: 0 },
      affiliate: null,
      admin: null,
    }
    const result = serializeConciergeContext(ctx)
    expect(result).toContain("DEALER DASHBOARD")
    expect(result).toContain("Active Auctions: 5")
    expect(result).toContain("Pending Pickups: 2")
  })

  it("serializes affiliate context", () => {
    const ctx: ConciergeContext = {
      userId: "user_a",
      role: "affiliate",
      workspaceId: "ws_1",
      workspaceMode: "LIVE",
      buyer: null,
      dealer: null,
      affiliate: { totalClicks: 200, totalSignups: 15, pendingCommissions: 450, totalPaid: 1200 },
      admin: null,
    }
    const result = serializeConciergeContext(ctx)
    expect(result).toContain("AFFILIATE DASHBOARD")
    expect(result).toContain("Clicks: 200")
    expect(result).toContain("Pending Commissions: $450")
    expect(result).toContain("Total Paid: $1200")
  })

  it("serializes admin context", () => {
    const ctx: ConciergeContext = {
      userId: "user_admin",
      role: "admin",
      workspaceId: "ws_1",
      workspaceMode: "TEST",
      buyer: null,
      dealer: null,
      affiliate: null,
      admin: { activeDeals: 25, pendingAuctions: 4, pendingPayouts: 3 },
    }
    const result = serializeConciergeContext(ctx)
    expect(result).toContain("WORKSPACE: TEST")
    expect(result).toContain("ADMIN OPS")
    expect(result).toContain("Active Deals: 25")
    expect(result).toContain("Pending Payouts: 3")
  })

  it("includes contract shield issues when detected", () => {
    const ctx: ConciergeContext = {
      userId: "user_1",
      role: "buyer",
      workspaceId: "ws_1",
      workspaceMode: "LIVE",
      buyer: {
        prequal: { exists: true, creditTier: "FAIR", softPullCompleted: true, consentGiven: true },
        shortlist: { count: 1 },
        auction: null,
        deal: { id: "deal_1", status: "CONTRACT_REVIEW", vehicleSummary: "2024 Honda Civic" },
        payments: { depositStatus: "SUCCEEDED", serviceFeeStatus: "SUCCEEDED" },
        insurance: { status: "POLICY_BOUND" },
        contractShield: { status: "ISSUES_FOUND", issuesFound: true },
        esign: { status: null },
        pickup: { status: null, scheduledDate: null },
      },
      dealer: null,
      affiliate: null,
      admin: null,
    }
    const result = serializeConciergeContext(ctx)
    expect(result).toContain("Contract Shield: ISSUES_FOUND (issues found)")
    expect(result).toContain("vehicle=2024 Honda Civic")
  })
})
