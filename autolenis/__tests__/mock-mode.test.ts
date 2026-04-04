import { describe, expect, it } from "vitest"
import { mockDb, mockSelectors } from "@/lib/mocks/mockStore"
import { isTestWorkspace } from "@/lib/app-mode"

describe("mock mode data", () => {
  it("maps session users based on path", () => {
    expect(mockSelectors.sessionUser("/admin/dashboard").role).toBe("ADMIN")
    expect(mockSelectors.sessionUser("/dealer/dashboard").role).toBe("DEALER")
    expect(mockSelectors.sessionUser("/buyer/dashboard").role).toBe("BUYER")
  })

  it("session user includes workspace_mode TEST and workspace_id", () => {
    const buyer = mockSelectors.sessionUser("/buyer/documents")
    expect(buyer.workspace_mode).toBe("TEST")
    expect(buyer.workspace_id).toBe("ws_test_001")
    expect(isTestWorkspace(buyer)).toBe(true)
  })

  it("dealDocuments seed data exists and is scoped to buyer", () => {
    expect(mockDb.dealDocuments.length).toBeGreaterThanOrEqual(2)
    const buyer = mockSelectors.sessionUser("/buyer/documents")
    const buyerDocs = mockDb.dealDocuments.filter(
      (doc: any) => doc.ownerUserId === buyer.userId,
    )
    expect(buyerDocs.length).toBeGreaterThan(0)
    expect(buyerDocs[0].workspaceId).toBe("ws_test_001")
  })

  it("derives admin dashboard stats from mock entities", () => {
    const dashboard = mockSelectors.adminDashboard()
    expect(dashboard.stats.totalDealers).toBe(mockDb.dealerProfiles.length)
    expect(dashboard.topDealers.length).toBe(mockDb.dealerProfiles.length)
  })

  it("returns buyer dashboard data for the golden deal", () => {
    const dashboard = mockSelectors.buyerDashboard()
    expect(dashboard.profile?.email).toBe(mockDb.buyerProfiles[0].email)
    expect(dashboard.preQual?.creditTier).toBeDefined()
    expect(dashboard.stats.completedDeals).toBeGreaterThan(0)
  })

  it("builds finance reports from ledger entries", () => {
    const report = mockSelectors.financeReport({})
    expect(report.ledger.length).toBeGreaterThan(0)
    expect(report.summary.platformFees).toBeGreaterThan(0)
  })

  it("returns insurance data for the golden deal", () => {
    const insurance = mockSelectors.adminDealInsurance("deal_gold_001")
    expect(insurance?.policies?.length).toBeGreaterThan(0)
    expect(insurance?.quotes?.length).toBeGreaterThan(0)
  })

  it("returns admin deal detail for the golden deal", () => {
    const deal = mockSelectors.adminDealDetail("deal_gold_001")
    expect(deal?.id).toBe("deal_gold_001")
    expect(deal?.buyerName).toBeDefined()
    expect(deal?.dealerName).toBeDefined()
  })
})
