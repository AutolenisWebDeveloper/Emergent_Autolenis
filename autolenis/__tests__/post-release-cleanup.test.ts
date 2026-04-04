import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

// ─── Post-Release Cleanup Tests ─────────────────────────────────────────────
// Validates cleanup work: canonical status imports in affiliate service,
// role constant usage in contract routes, session-version guard enhancement,
// and KPI integrity confirmation.
// ─────────────────────────────────────────────────────────────────────────────

const root = resolve(__dirname, "..")

function src(path: string): string {
  return readFileSync(resolve(root, path), "utf-8")
}

// ─── Task 1: Affiliate service uses canonical status constants ──────────────

describe("Task 1 · Affiliate Service Canonical Status Constants", () => {
  const affiliateSrc = src("lib/services/affiliate.service.ts")

  it("imports CommissionStatus from lib/constants/statuses", () => {
    expect(affiliateSrc).toContain('from "@/lib/constants/statuses"')
    expect(affiliateSrc).toContain("CommissionStatus")
  })

  it("imports PayoutStatus from lib/constants/statuses", () => {
    expect(affiliateSrc).toContain("PayoutStatus")
  })

  it("imports PaymentStatus from lib/constants/statuses", () => {
    expect(affiliateSrc).toContain("PaymentStatus")
  })

  describe("Commission lifecycle uses canonical constants", () => {
    it("creates commissions with CommissionStatus.PENDING", () => {
      expect(affiliateSrc).toContain("CommissionStatus.PENDING")
    })

    it("approves commissions with CommissionStatus.EARNED", () => {
      expect(affiliateSrc).toContain("CommissionStatus.EARNED")
    })

    it("marks paid commissions with CommissionStatus.PAID", () => {
      expect(affiliateSrc).toContain("CommissionStatus.PAID")
    })

    it("cancels commissions with CommissionStatus.CANCELLED", () => {
      expect(affiliateSrc).toContain("CommissionStatus.CANCELLED")
    })

    it("cancel filter uses canonical constants (not raw strings)", () => {
      // cancelCommissionsForPayment should filter by [PENDING, EARNED]
      expect(affiliateSrc).toContain("CommissionStatus.PENDING, CommissionStatus.EARNED")
    })
  })

  describe("Payout lifecycle uses canonical constants", () => {
    it("creates payouts with PayoutStatus.PENDING", () => {
      expect(affiliateSrc).toContain("PayoutStatus.PENDING")
    })

    it("completes payouts with PayoutStatus.COMPLETED", () => {
      expect(affiliateSrc).toContain("PayoutStatus.COMPLETED")
    })
  })

  describe("Dashboard stats queries use canonical constants", () => {
    it("pending commission stats use CommissionStatus.PENDING", () => {
      // getAffiliateDashboard aggregation queries
      expect(affiliateSrc).toContain("status: CommissionStatus.PENDING")
    })

    it("earned commission stats use CommissionStatus.EARNED", () => {
      expect(affiliateSrc).toContain("status: CommissionStatus.EARNED")
    })

    it("paid commission stats use CommissionStatus.PAID", () => {
      expect(affiliateSrc).toContain("status: CommissionStatus.PAID")
    })

    it("tree view commission stats use canonical constants", () => {
      // getAffiliateTree uses CommissionStatus for commission groupBy
      expect(affiliateSrc).toContain("s.status === CommissionStatus.PENDING")
      expect(affiliateSrc).toContain("s.status === CommissionStatus.EARNED")
      expect(affiliateSrc).toContain("s.status === CommissionStatus.PAID")
      expect(affiliateSrc).toContain("s.status === CommissionStatus.CANCELLED")
    })
  })

  describe("Payment status uses canonical PaymentStatus", () => {
    it("payment verification uses PaymentStatus.SUCCEEDED", () => {
      expect(affiliateSrc).toContain("PaymentStatus.SUCCEEDED")
    })

    it("preserves backward-compatible PAID alias alongside SUCCEEDED", () => {
      // Legacy systems may have used "PAID" — we keep both for backward compat
      expect(affiliateSrc).toContain('"PAID"')
    })
  })

  describe("No raw commission/payout status strings remain", () => {
    // Commission status raw strings should be replaced with constants
    it("does not use raw \"PENDING\" for commission status", () => {
      // Only remaining "PAID" should be for ServiceFeePayment legacy compat
      const lines = affiliateSrc.split("\n")
      for (const line of lines) {
        if (line.includes('status: "PENDING"') || line.includes('status: "EARNED"')) {
          // These should not exist — they've been replaced with constants
          expect(line).toContain("CommissionStatus")
        }
      }
    })

    it("does not use raw \"CANCELLED\" for commission status", () => {
      const lines = affiliateSrc.split("\n")
      for (const line of lines) {
        if (line.includes('status: "CANCELLED"')) {
          expect(line).toContain("CommissionStatus")
        }
      }
    })

    it("does not use raw \"COMPLETED\" for payout status", () => {
      const lines = affiliateSrc.split("\n")
      for (const line of lines) {
        if (line.includes('status: "COMPLETED"')) {
          expect(line).toContain("PayoutStatus")
        }
      }
    })
  })
})

// ─── Task 2: Contract routes use canonical role constants ───────────────────

describe("Task 2 · Contract Routes Use Canonical Role Constants", () => {
  describe("contract/fix/route.ts", () => {
    const fixRoute = src("app/api/contract/fix/route.ts")

    it("imports DEALER_ROLES from guard", () => {
      expect(fixRoute).toContain("DEALER_ROLES")
      expect(fixRoute).toContain('from "@/lib/authz/guard"')
    })

    it("does not use inline role arrays", () => {
      expect(fixRoute).not.toContain('["DEALER", "DEALER_USER", "ADMIN", "SUPER_ADMIN"]')
    })
  })

  describe("contract/list/route.ts", () => {
    const listRoute = src("app/api/contract/list/route.ts")

    it("imports DEALER_ROLES from guard", () => {
      expect(listRoute).toContain("DEALER_ROLES")
      expect(listRoute).toContain('from "@/lib/authz/guard"')
    })

    it("does not use inline role arrays", () => {
      expect(listRoute).not.toContain('["DEALER", "DEALER_USER", "ADMIN", "SUPER_ADMIN"]')
    })
  })

  describe("contract/scan/[id]/route.ts", () => {
    const scanRoute = src("app/api/contract/scan/[id]/route.ts")

    it("imports DEALER_ROLES from guard", () => {
      expect(scanRoute).toContain("DEALER_ROLES")
      expect(scanRoute).toContain('from "@/lib/authz/guard"')
    })

    it("does not use inline role arrays", () => {
      expect(scanRoute).not.toContain('["DEALER", "DEALER_USER", "ADMIN", "SUPER_ADMIN"]')
    })

    it("uses isAdminRole helper instead of raw role comparison for admin check", () => {
      expect(scanRoute).toContain("isAdminRole(role)")
      expect(scanRoute).not.toContain('role === "ADMIN" || role === "SUPER_ADMIN"')
    })
  })
})

// ─── Task 3: Session-version guard enhancement ─────────────────────────────

describe("Task 3 · Session-Version Guard Enhancement", () => {
  const guardSrc = src("lib/authz/guard.ts")

  it("GuardOptions includes requireSessionVersion option", () => {
    expect(guardSrc).toContain("requireSessionVersion")
  })

  it("withAuth checks session_version against DB when requireSessionVersion is true", () => {
    expect(guardSrc).toContain("requireSessionVersion")
    expect(guardSrc).toContain("session_version")
    // Must compare token version to DB version
    expect(guardSrc).toContain("tokenVersion < dbVersion")
  })

  it("returns SESSION_STALE error when token version is outdated", () => {
    expect(guardSrc).toContain("SESSION_STALE")
    expect(guardSrc).toContain("Session has been superseded")
  })

  it("degrades gracefully if DB check fails", () => {
    // Should catch errors and log, not block
    expect(guardSrc).toContain("Session-version DB check failed")
  })

  it("imports supabase for DB lookups", () => {
    expect(guardSrc).toContain('from "@/lib/db"')
    expect(guardSrc).toContain("supabase")
  })

  it("queries User table for session_version", () => {
    expect(guardSrc).toContain('.from("User")')
    expect(guardSrc).toContain('.select("session_version")')
  })
})

// ─── Task 4: KPI integrity confirmation ────────────────────────────────────

describe("Task 4 · KPI Integrity Confirmation", () => {
  it("buyer.service.ts totalSavings is null (no synthetic formula)", () => {
    const svc = src("lib/services/buyer.service.ts")
    expect(svc).toContain("totalSavings: null")
    expect(svc).not.toContain("completedDeals * 2500")
    expect(svc).not.toContain("completedDeals * 2_500")
  })

  it("admin.service.ts derives all stats from DB queries", () => {
    const svc = src("lib/services/admin.service.ts")
    // Must query actual tables, not use synthetic math
    expect(svc).toContain('.from("User")')
    expect(svc).toContain('.from("Auction")')
    expect(svc).toContain('.from("SelectedDeal")')
    expect(svc).toContain('.from("ServiceFeePayment")')
  })

  it("affiliate dashboard stats come from DB aggregation (not hardcoded)", () => {
    const svc = src("lib/services/affiliate.service.ts")
    // Dashboard stats use prisma aggregation, not synthetic math
    expect(svc).toContain("prisma.commission.aggregate")
    expect(svc).toContain("prisma.click.count")
    expect(svc).toContain("prisma.referral.count")
  })

  it("no synthetic savings, estimation or placeholder formulas in services", () => {
    const services = [
      "lib/services/buyer.service.ts",
      "lib/services/admin.service.ts",
      "lib/services/dealer.service.ts",
      "lib/services/affiliate.service.ts",
    ]
    for (const path of services) {
      const svc = src(path)
      // No arbitrary multiplier-based KPIs
      expect(svc).not.toContain("* 2500")
      expect(svc).not.toContain("* 2_500")
      expect(svc).not.toMatch(/completedDeals\s*\*\s*\d/)
    }
  })
})

// ─── Regression: Existing canonical status tests still pass ─────────────────

describe("Regression · Canonical Status Constants Integrity", () => {
  const statusesSrc = src("lib/constants/statuses.ts")

  it("CommissionStatus has all required lifecycle values", () => {
    for (const val of ["PENDING", "EARNED", "PAID", "CANCELLED"]) {
      expect(statusesSrc).toContain(`${val}: "${val}"`)
    }
  })

  it("PayoutStatus has all required lifecycle values", () => {
    for (const val of ["PENDING", "PROCESSING", "COMPLETED", "FAILED"]) {
      expect(statusesSrc).toContain(`${val}: "${val}"`)
    }
  })

  it("PaymentStatus has all required lifecycle values", () => {
    for (const val of ["PENDING", "PROCESSING", "SUCCEEDED", "FAILED", "REFUNDED"]) {
      expect(statusesSrc).toContain(`${val}: "${val}"`)
    }
  })

  it("CommissionStatus values are consistent with affiliate engine behavior", () => {
    // The affiliate engine uses these exact values in Prisma queries
    expect(statusesSrc).toContain('PENDING: "PENDING"')
    expect(statusesSrc).toContain('EARNED: "EARNED"')
    expect(statusesSrc).toContain('PAID: "PAID"')
    expect(statusesSrc).toContain('CANCELLED: "CANCELLED"')
  })
})
