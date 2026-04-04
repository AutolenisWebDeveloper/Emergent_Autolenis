import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

// ─── Production-Hardening Sprint Tests ──────────────────────────────────────
// Validates canonical status governance, session security, KPI integrity,
// workspace isolation, and cross-dashboard lifecycle flows.
// ─────────────────────────────────────────────────────────────────────────────

const root = resolve(__dirname, "..")

function src(path: string): string {
  return readFileSync(resolve(root, path), "utf-8")
}

// ─── P1: Canonical Status Governance ────────────────────────────────────────

describe("P1 · Canonical Status Governance", () => {
  const statusesSrc = src("lib/constants/statuses.ts")

  describe("Canonical statuses module exists and is complete", () => {
    it("lib/constants/statuses.ts exists", () => {
      expect(existsSync(resolve(root, "lib/constants/statuses.ts"))).toBe(true)
    })

    it("exports AuctionStatus matching Prisma enum", () => {
      expect(statusesSrc).toContain("AuctionStatus")
      for (const val of ["PENDING_DEPOSIT", "ACTIVE", "CLOSED", "COMPLETED", "CANCELLED"]) {
        expect(statusesSrc).toContain(val)
      }
    })

    it("re-exports DealStatus from deal/types.ts", () => {
      expect(statusesSrc).toContain('DealStatus')
      expect(statusesSrc).toContain('from "@/lib/services/deal/types"')
    })

    it("exports PaymentStatus matching Prisma enum", () => {
      expect(statusesSrc).toContain("PaymentStatus")
      for (const val of ["PENDING", "PROCESSING", "SUCCEEDED", "FAILED", "REFUNDED"]) {
        expect(statusesSrc).toContain(val)
      }
    })

    it("exports PickupStatus matching Prisma enum", () => {
      expect(statusesSrc).toContain("PickupStatus")
      for (const val of ["SCHEDULED", "CONFIRMED", "BUYER_ARRIVED", "COMPLETED", "CANCELLED"]) {
        expect(statusesSrc).toContain(val)
      }
    })

    it("exports ContractStatus matching Prisma enum", () => {
      expect(statusesSrc).toContain("ContractStatus")
      for (const val of ["UPLOADED", "SCANNING", "ISSUES_FOUND", "PASSED", "FAILED"]) {
        expect(statusesSrc).toContain(val)
      }
    })

    it("exports CommissionStatus for affiliate engine", () => {
      expect(statusesSrc).toContain("CommissionStatus")
      for (const val of ["PENDING", "EARNED", "PAID", "CANCELLED"]) {
        expect(statusesSrc).toContain(val)
      }
    })

    it("exports PayoutStatus for affiliate payouts", () => {
      expect(statusesSrc).toContain("PayoutStatus")
    })

    it("re-exports BuyerCaseStatus from sourcing.service.ts", () => {
      expect(statusesSrc).toContain("BuyerCaseStatus")
      expect(statusesSrc).toContain('from "@/lib/services/sourcing.service"')
    })

    it("exports CLOSED_CASE_STATUSES convenience array", () => {
      expect(statusesSrc).toContain("CLOSED_CASE_STATUSES")
      expect(statusesSrc).toContain("CLOSED_WON")
      expect(statusesSrc).toContain("CLOSED_LOST")
      expect(statusesSrc).toContain("CLOSED_CANCELLED")
    })

    it("exports ACTIVE_CASE_STATUSES convenience array", () => {
      expect(statusesSrc).toContain("ACTIVE_CASE_STATUSES")
      expect(statusesSrc).toContain("SOURCING")
      expect(statusesSrc).toContain("OFFERS_AVAILABLE")
      expect(statusesSrc).toContain("DEALER_INVITED")
    })
  })

  describe("Services import canonical constants (no raw string literals)", () => {
    it("buyer.service.ts imports from constants/statuses", () => {
      const svc = src("lib/services/buyer.service.ts")
      expect(svc).toContain('from "@/lib/constants/statuses"')
      expect(svc).toContain("AuctionStatus")
      expect(svc).toContain("DealStatus")
      expect(svc).toContain("PickupStatus")
      expect(svc).toContain("BuyerCaseStatus")
      expect(svc).toContain("CLOSED_CASE_STATUSES")
    })

    it("admin.service.ts imports from constants/statuses", () => {
      const svc = src("lib/services/admin.service.ts")
      expect(svc).toContain('from "@/lib/constants/statuses"')
      expect(svc).toContain("AuctionStatus")
      expect(svc).toContain("DealStatus")
      expect(svc).toContain("PaymentStatus")
      expect(svc).toContain("BuyerCaseStatus")
      expect(svc).toContain("ACTIVE_CASE_STATUSES")
    })

    it("dealer.service.ts imports from constants/statuses", () => {
      const svc = src("lib/services/dealer.service.ts")
      expect(svc).toContain('from "@/lib/constants/statuses"')
      expect(svc).toContain("AuctionStatus")
      expect(svc).toContain("DealStatus")
      expect(svc).toContain("ContractStatus")
      expect(svc).toContain("PickupStatus")
    })

    it("buyer.service.ts uses constant references not raw strings for key statuses", () => {
      const svc = src("lib/services/buyer.service.ts")
      expect(svc).toContain("AuctionStatus.ACTIVE")
      expect(svc).toContain("AuctionStatus.PENDING_DEPOSIT")
      expect(svc).toContain("DealStatus.COMPLETED")
      expect(svc).toContain("DealStatus.CANCELLED")
      expect(svc).toContain("PickupStatus.SCHEDULED")
      expect(svc).toContain("BuyerCaseStatus.OFFERS_AVAILABLE")
    })

    it("admin.service.ts uses constant references not raw strings for key statuses", () => {
      const svc = src("lib/services/admin.service.ts")
      expect(svc).toContain("AuctionStatus.ACTIVE")
      expect(svc).toContain("DealStatus.COMPLETED")
      expect(svc).toContain("PaymentStatus.SUCCEEDED")
      expect(svc).toContain("PaymentStatus.PENDING")
      expect(svc).toContain("PayoutStatus.COMPLETED")
      expect(svc).toContain("BuyerCaseStatus.SUBMITTED")
    })

    it("dealer.service.ts uses constant references not raw strings for key statuses", () => {
      const svc = src("lib/services/dealer.service.ts")
      expect(svc).toContain("AuctionStatus.ACTIVE")
      expect(svc).toContain("DealStatus.COMPLETED")
      expect(svc).toContain("ContractStatus.ISSUES_FOUND")
      expect(svc).toContain("PickupStatus.SCHEDULED")
      expect(svc).toContain("PickupStatus.BUYER_ARRIVED")
      expect(svc).toContain("PickupStatus.COMPLETED")
    })
  })

  describe("Canonical statuses match Prisma schema enums", () => {
    const schema = src("prisma/schema.prisma")

    it("AuctionStatus values match Prisma enum", () => {
      const prismaEnum = schema.match(/enum AuctionStatus \{([^}]+)\}/)?.[1] ?? ""
      const values = prismaEnum.split(/\s+/).filter(Boolean)
      // Each Prisma value must be in our canonical constant
      for (const v of values) {
        expect(statusesSrc).toContain(`${v}: "${v}"`)
      }
    })

    it("PaymentStatus values match Prisma enum", () => {
      const prismaEnum = schema.match(/enum PaymentStatus \{([^}]+)\}/)?.[1] ?? ""
      const values = prismaEnum.split(/\s+/).filter(Boolean)
      for (const v of values) {
        expect(statusesSrc).toContain(`${v}: "${v}"`)
      }
    })

    it("PickupStatus values match Prisma enum", () => {
      const prismaEnum = schema.match(/enum PickupStatus \{([^}]+)\}/)?.[1] ?? ""
      const values = prismaEnum.split(/\s+/).filter(Boolean)
      for (const v of values) {
        expect(statusesSrc).toContain(`${v}: "${v}"`)
      }
    })

    it("ContractStatus values match Prisma enum", () => {
      const prismaEnum = schema.match(/enum ContractStatus \{([^}]+)\}/)?.[1] ?? ""
      const values = prismaEnum.split(/\s+/).filter(Boolean)
      for (const v of values) {
        expect(statusesSrc).toContain(`${v}: "${v}"`)
      }
    })

    it("DealStatus values match Prisma enum (via deal/types.ts)", () => {
      const prismaEnum = schema.match(/enum DealStatus \{([^}]+)\}/)?.[1] ?? ""
      const values = prismaEnum.split(/\s+/).filter(Boolean)
      const dealTypes = src("lib/services/deal/types.ts")
      for (const v of values) {
        expect(dealTypes).toContain(`${v}: "${v}"`)
      }
    })
  })
})

// ─── P2: Session Security Hardening ─────────────────────────────────────────

describe("P2 · Session Security Hardening", () => {
  describe("session_version in JWT infrastructure", () => {
    it("SessionUser interface includes session_version", () => {
      const authTs = src("lib/auth.ts")
      expect(authTs).toContain("session_version")
    })

    it("createSession includes session_version in JWT payload", () => {
      const authTs = src("lib/auth.ts")
      expect(authTs).toContain("session_version: user.session_version")
    })

    it("verifySession defaults session_version to 0 for legacy tokens", () => {
      const authTs = src("lib/auth.ts")
      expect(authTs).toContain("session.session_version === undefined")
    })
  })

  describe("Password change invalidates prior sessions", () => {
    it("change-password route increments session_version", () => {
      const route = src("app/api/auth/change-password/route.ts")
      expect(route).toContain("session_version")
      // Must increment the version
      expect(route).toMatch(/session_version.*\+\s*1/)
    })

    it("change-password route re-issues session cookie with new version", () => {
      const route = src("app/api/auth/change-password/route.ts")
      expect(route).toContain("createSession")
      expect(route).toContain("setSessionCookie")
      expect(route).toContain("newSessionVersion")
    })

    it("change-password fetches current session_version from DB", () => {
      const route = src("app/api/auth/change-password/route.ts")
      expect(route).toContain("session_version")
      // Must select session_version from the user record
      expect(route).toMatch(/select.*session_version/)
    })
  })

  describe("Password reset also invalidates prior sessions", () => {
    it("password-reset.service.ts increments session_version", () => {
      const svc = src("lib/services/password-reset.service.ts")
      expect(svc).toContain("session_version")
    })
  })

  describe("User schema supports session versioning", () => {
    it("Prisma schema has session_version on User model", () => {
      const schema = src("prisma/schema.prisma")
      expect(schema).toContain("session_version")
      expect(schema).toContain("@default(0)")
    })
  })

  describe("AuthContext exposes sessionVersion", () => {
    it("guard.ts AuthContext includes sessionVersion", () => {
      const guard = src("lib/authz/guard.ts")
      expect(guard).toContain("sessionVersion")
    })

    it("withAuth passes session_version to AuthContext", () => {
      const guard = src("lib/authz/guard.ts")
      expect(guard).toContain("session.session_version")
    })
  })
})

// ─── P3: Workspace Isolation ────────────────────────────────────────────────

describe("P3 · Workspace Isolation", () => {
  describe("Workspace-scoping infrastructure", () => {
    it("JWT payload includes workspace_id", () => {
      const authTs = src("lib/auth.ts")
      expect(authTs).toContain("workspace_id")
    })

    it("guard.ts supports requireWorkspace option", () => {
      const guard = src("lib/authz/guard.ts")
      expect(guard).toContain("requireWorkspace")
      expect(guard).toContain("NO_WORKSPACE")
    })

    it("AuthContext includes workspaceId field", () => {
      const guard = src("lib/authz/guard.ts")
      expect(guard).toContain("workspaceId")
    })

    it("workspace-scope module exists", () => {
      expect(existsSync(resolve(root, "lib/workspace-scope.ts"))).toBe(true)
    })
  })

  describe("Session workspace propagation", () => {
    it("getCurrentUser returns workspace_id", () => {
      const authServer = src("lib/auth-server.ts")
      expect(authServer).toContain("workspace_id: session.workspace_id")
    })

    it("createSession embeds workspace_id in token", () => {
      const authTs = src("lib/auth.ts")
      expect(authTs).toContain("workspace_id: user.workspace_id")
    })
  })
})

// ─── P4: KPI and Dashboard Calculation Integrity ────────────────────────────

describe("P4 · KPI & Dashboard Calculation Integrity", () => {
  describe("No synthetic/arbitrary metrics", () => {
    it("buyer.service.ts does NOT use placeholder savings formula", () => {
      const svc = src("lib/services/buyer.service.ts")
      // The old synthetic formula: completedDeals * 2500
      expect(svc).not.toContain("completedDeals * 2500")
      expect(svc).not.toContain("completedDeals * 2_500")
    })

    it("totalSavings returns null (not arbitrary number) until real data source exists", () => {
      const svc = src("lib/services/buyer.service.ts")
      expect(svc).toContain("totalSavings: null")
    })

    it("buyer dashboard page type accepts null for totalSavings", () => {
      const page = src("app/buyer/dashboard/page.tsx")
      expect(page).toContain("totalSavings")
      // Should use nullish coalescing for display
      expect(page).toContain("totalSavings ?? 0")
    })
  })

  describe("Dashboard stats derived from source-of-truth queries", () => {
    it("admin stats derive from database queries (not local math)", () => {
      const svc = src("lib/services/admin.service.ts")
      // Admin service queries actual database tables
      expect(svc).toContain('.from("User")')
      expect(svc).toContain('.from("Auction")')
      expect(svc).toContain('.from("SelectedDeal")')
      expect(svc).toContain('.from("ServiceFeePayment")')
      expect(svc).toContain('.from("Payout")')
    })

    it("buyer stats derive from database queries (not local math)", () => {
      const svc = src("lib/services/buyer.service.ts")
      expect(svc).toContain('.from("Auction")')
      expect(svc).toContain('.from("SelectedDeal")')
      expect(svc).toContain('.from("PickupAppointment")')
    })
  })
})

// ─── P5: Cross-Dashboard Lifecycle Flows ────────────────────────────────────

describe("P5 · Cross-Dashboard Lifecycle Flows", () => {
  describe("Buyer prequal → request → deal lifecycle", () => {
    it("prequal service exists with scoring logic", () => {
      const svc = src("lib/services/prequal.service.ts")
      expect(svc).toContain("PreQualStatus")
    })

    it("buyer qualification view unifies native + external prequal", () => {
      const route = src("app/api/buyer/prequal/route.ts")
      expect(route).toContain("buyer_qualification_active")
    })

    it("deal service has canonical status transitions", () => {
      const types = src("lib/services/deal/types.ts")
      expect(types).toContain("VALID_TRANSITIONS")
      expect(types).toContain("normalizeDealStatus")
    })

    it("sourcing handles case→offer→deal flow", () => {
      const svc = src("lib/services/sourcing.service.ts")
      expect(svc).toContain("BuyerCaseStatus")
      expect(svc).toContain("SourcedOfferStatus")
    })
  })

  describe("Dealer offer lifecycle", () => {
    it("dealer can submit offers through auction participation", () => {
      const svc = src("lib/services/dealer.service.ts")
      expect(svc).toContain("AuctionOffer")
      expect(svc).toContain("submitOffer")
    })

    it("dealer can manage inventory", () => {
      const svc = src("lib/services/dealer.service.ts")
      expect(svc).toContain("addVehicleToInventory")
    })

    it("dealer can handle pickups with status transitions", () => {
      const svc = src("lib/services/dealer.service.ts")
      expect(svc).toContain("PickupStatus.BUYER_ARRIVED")
      expect(svc).toContain("PickupStatus.COMPLETED")
    })
  })

  describe("Admin oversight of shared objects", () => {
    it("admin can see all auctions/deals/payments", () => {
      const svc = src("lib/services/admin.service.ts")
      expect(svc).toContain('.from("Auction")')
      expect(svc).toContain('.from("SelectedDeal")')
      expect(svc).toContain('.from("ServiceFeePayment")')
    })

    it("admin sourcing uses canonical constants", () => {
      const svc = src("lib/services/admin.service.ts")
      expect(svc).toContain("SOURCING_TABLES")
      expect(svc).toContain("ACTIVE_CASE_STATUSES")
    })

    it("admin guard includes admin roles for oversight access", () => {
      const guard = src("lib/authz/guard.ts")
      // DEALER_ROLES in guard includes admin for oversight
      expect(guard).toContain('"DEALER", "DEALER_USER", "ADMIN", "SUPER_ADMIN"')
    })
  })

  describe("Affiliate attribution → commission lifecycle", () => {
    it("affiliate service handles commission creation", () => {
      const svc = src("lib/services/affiliate.service.ts")
      expect(svc).toContain("commission")
      expect(svc).toContain("PENDING")
      expect(svc).toContain("EARNED")
    })

    it("affiliate engine instructions enforce reversal semantics", () => {
      const instructions = src(".github/instructions/affiliate-engine.instructions.md")
      expect(instructions).toContain("Refunds must reverse commissions")
      expect(instructions).toContain("no self-referrals")
    })

    it("affiliate service has payout handling", () => {
      const svc = src("lib/services/affiliate.service.ts")
      expect(svc).toContain("payout")
    })
  })
})

// ─── Regression Guards ──────────────────────────────────────────────────────

describe("Regression Guards", () => {
  it("DealStatus in deal/types.ts has valid status transitions map", () => {
    const types = src("lib/services/deal/types.ts")
    expect(types).toContain("VALID_TRANSITIONS")
    expect(types).toContain("COMPLETED: []")
    expect(types).toContain("CANCELLED: []")
  })

  it("SOURCING_TABLES constant maps all canonical names", () => {
    const svc = src("lib/services/sourcing.service.ts")
    expect(svc).toContain("CASES")
    expect(svc).toContain("DEALER_OUTREACH")
    expect(svc).toContain("OFFERS")
    expect(svc).toContain("DEALER_INVITATIONS")
    expect(svc).toContain("AUDIT_LOG")
  })

  it("all portal layouts use consistent auth patterns", () => {
    const portals = [
      "app/buyer/layout.tsx",
      "app/dealer/layout.tsx",
      "app/admin/layout.tsx",
      "app/affiliate/portal/layout.tsx",
    ]
    for (const path of portals) {
      const content = src(path)
      expect(content).toContain("getSessionUser")
      expect(content).toContain("redirect(")
    }
  })
})
