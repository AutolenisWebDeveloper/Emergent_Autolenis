import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

// ─── Cross-Dashboard Systems Integration Audit ──────────────────────────────
// Validates that Buyer, Admin, Dealer, and Affiliate dashboards operate as one
// fully synchronized production system: RBAC, entity sync, KPIs, notifications,
// workflow states, and cross-portal contracts.
// ─────────────────────────────────────────────────────────────────────────────

const root = resolve(__dirname, "..")

function src(path: string): string {
  return readFileSync(resolve(root, path), "utf-8")
}

// ─── 1. Identity & Role Synchronization ─────────────────────────────────────

describe("1 · Identity & Role Synchronization", () => {
  const rolesSrc = src("lib/authz/roles.ts")
  const guardSrc = src("lib/authz/guard.ts")
  const authServerSrc = src("lib/auth-server.ts")

  describe("Canonical role source of truth", () => {
    it("roles.ts defines all 8 canonical roles", () => {
      const expected = ["BUYER", "DEALER", "DEALER_USER", "ADMIN", "SUPER_ADMIN", "AFFILIATE", "AFFILIATE_ONLY", "SYSTEM_AGENT"]
      for (const role of expected) {
        expect(rolesSrc).toContain(`"${role}"`)
      }
    })

    it("roles.ts exports isAdminRole helper", () => {
      expect(rolesSrc).toContain("export function isAdminRole")
    })

    it("roles.ts exports isUserAffiliate helper for user-object checks", () => {
      expect(rolesSrc).toContain("export function isUserAffiliate")
    })

    it("roles.ts exports portalForRole mapping all roles to portals", () => {
      expect(rolesSrc).toContain("export function portalForRole")
      expect(rolesSrc).toContain('"/admin"')
      expect(rolesSrc).toContain('"/dealer"')
      expect(rolesSrc).toContain('"/affiliate/portal"')
      expect(rolesSrc).toContain('"/buyer"')
    })
  })

  describe("No duplicate role implementations", () => {
    it("auth-server.ts re-exports isAdminRole from canonical roles.ts (no local impl)", () => {
      // auth-server.ts should re-export, not define its own
      expect(authServerSrc).toContain('isAdminRole')
      expect(authServerSrc).toContain('from "@/lib/authz/roles"')
      // Should NOT contain a local function definition
      expect(authServerSrc).not.toMatch(/export function isAdminRole\(/)
    })

    it("auth-server.ts re-exports isAffiliateRole from canonical roles.ts (no local impl)", () => {
      expect(authServerSrc).toContain('isAffiliateRole')
      expect(authServerSrc).toContain('from "@/lib/authz/roles"')
      // Should NOT contain a local function definition
      expect(authServerSrc).not.toMatch(/export function isAffiliateRole\(/)
    })
  })

  describe("guard.ts role constants are documented", () => {
    it("guard.ts ADMIN_ROLES matches canonical", () => {
      expect(guardSrc).toContain('"ADMIN", "SUPER_ADMIN"')
    })

    it("guard.ts DEALER_ROLES includes admin for oversight (documented)", () => {
      expect(guardSrc).toContain('"DEALER", "DEALER_USER", "ADMIN", "SUPER_ADMIN"')
      expect(guardSrc).toContain("admin oversight")
    })

    it("guard.ts BUYER_ROLES includes admin for oversight (documented)", () => {
      expect(guardSrc).toContain('"BUYER", "ADMIN", "SUPER_ADMIN"')
      expect(guardSrc).toContain("admin oversight")
    })

    it("guard.ts imports isAdminRole from canonical roles.ts", () => {
      expect(guardSrc).toContain('import { isAdminRole } from "@/lib/authz/roles"')
    })
  })

  describe("Multi-role user handling", () => {
    it("isUserAffiliate recognises buyer-affiliates (BUYER + is_affiliate)", () => {
      expect(rolesSrc).toContain('user.role === Roles.BUYER && user.is_affiliate === true')
    })

    it("affiliate portal layout checks buyer-affiliate state", () => {
      const affiliateLayout = src("app/affiliate/portal/layout.tsx")
      expect(affiliateLayout).toContain("is_affiliate")
      expect(affiliateLayout).toContain("isBuyerAffiliate")
    })

    it("buyer portal layout passes portalLinks for buyer-affiliates", () => {
      const buyerLayout = src("app/buyer/layout.tsx")
      expect(buyerLayout).toContain("portalLinks")
      expect(buyerLayout).toContain("is_affiliate")
    })
  })

  describe("Auth/session continuity across portals", () => {
    it("all portal layouts use getSessionUser for session", () => {
      const portals = [
        "app/buyer/layout.tsx",
        "app/dealer/layout.tsx",
        "app/admin/layout.tsx",
        "app/affiliate/portal/layout.tsx",
      ]
      for (const path of portals) {
        expect(src(path)).toContain("getSessionUser")
      }
    })

    it("all portal layouts enforce email verification", () => {
      const portals = [
        "app/buyer/layout.tsx",
        "app/dealer/layout.tsx",
        "app/admin/layout.tsx",
        "app/affiliate/portal/layout.tsx",
      ]
      for (const path of portals) {
        expect(src(path)).toContain("requireEmailVerification")
      }
    })

    it("all portal layouts redirect unauthenticated users", () => {
      const portals = [
        "app/buyer/layout.tsx",
        "app/dealer/layout.tsx",
        "app/admin/layout.tsx",
        "app/affiliate/portal/layout.tsx",
      ]
      for (const path of portals) {
        expect(src(path)).toContain("redirect(")
      }
    })
  })
})

// ─── 2. Cross-Dashboard Entity Synchronization ──────────────────────────────

describe("2 · Cross-Dashboard Entity Synchronization", () => {
  describe("Sourcing entity consistency", () => {
    it("buyer and admin use SOURCING_TABLES constant (not raw strings)", () => {
      const buyerSvc = src("lib/services/buyer.service.ts")
      const adminSvc = src("lib/services/admin.service.ts")
      expect(buyerSvc).toContain("SOURCING_TABLES.CASES")
      expect(adminSvc).toContain("SOURCING_TABLES.CASES")
    })

    it("SOURCING_TABLES maps all canonical names", () => {
      const sourcingSvc = src("lib/services/sourcing.service.ts")
      expect(sourcingSvc).toContain("CASES")
      expect(sourcingSvc).toContain("DEALER_OUTREACH")
      expect(sourcingSvc).toContain("OFFERS")
      expect(sourcingSvc).toContain("DEALER_INVITATIONS")
      expect(sourcingSvc).toContain("AUDIT_LOG")
    })
  })

  describe("Auction status alignment", () => {
    it("dealer service uses canonical AuctionStatus constant for auction queries", () => {
      const dealerSvc = src("lib/services/dealer.service.ts")
      // Should NOT use non-existent "OPEN" status for auction queries
      expect(dealerSvc).not.toMatch(/\.eq\(["']auction\.status["'],\s*["']OPEN["']\)/)
      // Should import from canonical constants
      expect(dealerSvc).toContain("AuctionStatus")
    })

    it("admin service uses canonical AuctionStatus constant for auction queries", () => {
      const adminSvc = src("lib/services/admin.service.ts")
      expect(adminSvc).toContain("AuctionStatus.ACTIVE")
    })

    it("buyer service uses canonical AuctionStatus for auction counts", () => {
      const buyerSvc = src("lib/services/buyer.service.ts")
      expect(buyerSvc).toContain("AuctionStatus.ACTIVE")
      expect(buyerSvc).toContain("AuctionStatus.PENDING_DEPOSIT")
    })
  })

  describe("Deal status alignment", () => {
    it("all services use DealStatus.COMPLETED for completed deal counts", () => {
      const buyerSvc = src("lib/services/buyer.service.ts")
      const dealerSvc = src("lib/services/dealer.service.ts")
      const adminSvc = src("lib/services/admin.service.ts")
      expect(buyerSvc).toContain("DealStatus.COMPLETED")
      expect(dealerSvc).toContain("DealStatus.COMPLETED")
      expect(adminSvc).toContain("DealStatus.COMPLETED")
    })
  })

  describe("Prisma schema enum consistency", () => {
    it("AuctionStatus enum contains canonical values", () => {
      const schema = src("prisma/schema.prisma")
      expect(schema).toContain("enum AuctionStatus")
      expect(schema).toContain("PENDING_DEPOSIT")
      expect(schema).toContain("ACTIVE")
      expect(schema).toContain("CLOSED")
      expect(schema).toContain("COMPLETED")
      expect(schema).toContain("CANCELLED")
    })
  })
})

// ─── 3. Core Workflow Validation ─────────────────────────────────────────────

describe("3 · Core Workflow Validation", () => {
  describe("Buyer prequal workflow", () => {
    it("prequal service exists and is importable", () => {
      expect(existsSync(resolve(root, "lib/services/prequal.service.ts"))).toBe(true)
    })

    it("prequal API route exists", () => {
      expect(existsSync(resolve(root, "app/api/buyer/prequal/route.ts"))).toBe(true)
    })

    it("buyer qualification view unifies native + external", () => {
      const prequalRoute = src("app/api/buyer/prequal/route.ts")
      expect(prequalRoute).toContain("buyer_qualification_active")
    })
  })

  describe("External preapproval workflow", () => {
    it("external preapproval service exists", () => {
      expect(existsSync(resolve(root, "lib/services/external-preapproval.service.ts"))).toBe(true)
    })

    it("admin review route exists", () => {
      expect(existsSync(resolve(root, "app/api/admin/external-preapprovals"))).toBe(true)
    })
  })

  describe("Vehicle request workflow", () => {
    it("sourcing service exists with case lifecycle methods", () => {
      const sourcingSvc = src("lib/services/sourcing.service.ts")
      expect(sourcingSvc).toContain("getCaseBuyerContact")
      expect(sourcingSvc).toContain("getOfferBuyerContact")
    })
  })

  describe("Dealer onboarding workflow", () => {
    it("dealer approval service exists", () => {
      expect(existsSync(resolve(root, "lib/services/dealer-approval.service.ts"))).toBe(true)
    })

    it("admin dealer approval route exists", () => {
      expect(existsSync(resolve(root, "app/api/admin/dealers"))).toBe(true)
    })
  })

  describe("Affiliate commission workflow", () => {
    it("affiliate service exists with commission methods", () => {
      const affiliateSvc = src("lib/services/affiliate.service.ts")
      expect(affiliateSvc).toContain("commission")
    })

    it("affiliate engine instructions enforce reversal semantics", () => {
      const instructions = src(".github/instructions/affiliate-engine.instructions.md")
      expect(instructions).toContain("Refunds must reverse commissions")
      expect(instructions).toContain("no self-referrals")
    })
  })

  describe("Payment/contract/pickup workflow", () => {
    it("payment service exists", () => {
      expect(existsSync(resolve(root, "lib/services/payment.service.ts"))).toBe(true)
    })

    it("esign service exists", () => {
      expect(existsSync(resolve(root, "lib/services/esign.service.ts"))).toBe(true)
    })

    it("pickup service exists", () => {
      expect(existsSync(resolve(root, "lib/services/pickup.service.ts"))).toBe(true)
    })
  })
})

// ─── 4. Cross-Dashboard Visibility Contract ─────────────────────────────────

describe("4 · Cross-Dashboard Visibility Contract", () => {
  describe("Buyer data isolation", () => {
    it("buyer service queries filter by buyerId or userId", () => {
      const buyerSvc = src("lib/services/buyer.service.ts")
      expect(buyerSvc).toContain('.eq("buyerId", buyerId)')
      expect(buyerSvc).toContain('.eq("userId", userId)')
    })
  })

  describe("Dealer data isolation", () => {
    it("dealer service queries filter by dealerId", () => {
      const dealerSvc = src("lib/services/dealer.service.ts")
      expect(dealerSvc).toContain('.eq("dealerId", dealerId)')
    })
  })

  describe("Affiliate data isolation", () => {
    it("affiliate API routes verify affiliate role", () => {
      const commissions = src("app/api/affiliate/commissions/route.ts")
      expect(commissions).toContain("isAffiliateRole")
    })
  })

  describe("Admin has oversight access", () => {
    it("admin dashboard queries are unscoped (platform-wide)", () => {
      const adminSvc = src("lib/services/admin.service.ts")
      // Admin queries count all users, not filtered to specific user
      expect(adminSvc).toContain('.from("User")')
      expect(adminSvc).toContain('.from("Dealer")')
      expect(adminSvc).toContain('.from("Auction")')
    })

    it("admin API routes check admin role", () => {
      const adminDashboard = src("app/api/admin/dashboard/route.ts")
      expect(adminDashboard).toContain("isAdminRole")
    })

    it("guard.ts DEALER_ROLES includes admin for cross-portal access", () => {
      const guardSrc = src("lib/authz/guard.ts")
      expect(guardSrc).toContain('"DEALER", "DEALER_USER", "ADMIN", "SUPER_ADMIN"')
    })
  })
})

// ─── 5. Dashboard KPI & Reporting Consistency ────────────────────────────────

describe("5 · Dashboard KPI & Reporting Consistency", () => {
  describe("Auction KPI alignment", () => {
    it("buyer and admin use same canonical AuctionStatus for active auction counts", () => {
      const buyerSvc = src("lib/services/buyer.service.ts")
      const adminSvc = src("lib/services/admin.service.ts")
      // Both should import AuctionStatus from canonical constants
      expect(buyerSvc).toContain("AuctionStatus.ACTIVE")
      expect(adminSvc).toContain("AuctionStatus.ACTIVE")
    })

    it("dealer uses canonical AuctionStatus for auction queries (not OPEN)", () => {
      const dealerSvc = src("lib/services/dealer.service.ts")
      expect(dealerSvc).toContain("AuctionStatus.ACTIVE")
      expect(dealerSvc).not.toMatch(/\.eq\(["']auction\.status["'],\s*["']OPEN["']\)/)
    })
  })

  describe("Deal completion KPI alignment", () => {
    it("all three portals count COMPLETED deals via canonical DealStatus constant", () => {
      const buyerSvc = src("lib/services/buyer.service.ts")
      const dealerSvc = src("lib/services/dealer.service.ts")
      const adminSvc = src("lib/services/admin.service.ts")
      // All should use canonical DealStatus.COMPLETED
      expect(buyerSvc).toContain("DealStatus.COMPLETED")
      expect(dealerSvc).toContain("DealStatus.COMPLETED")
      expect(adminSvc).toContain("DealStatus.COMPLETED")
    })
  })

  describe("Sourcing KPI alignment", () => {
    it("admin sourcing stats use canonical BuyerCaseStatus and ACTIVE_CASE_STATUSES", () => {
      const adminSvc = src("lib/services/admin.service.ts")
      expect(adminSvc).toContain("BuyerCaseStatus.SUBMITTED")
      expect(adminSvc).toContain("ACTIVE_CASE_STATUSES")
    })

    it("buyer sourcing stats use canonical CLOSED_CASE_STATUSES", () => {
      const buyerSvc = src("lib/services/buyer.service.ts")
      expect(buyerSvc).toContain("CLOSED_CASE_STATUSES")
      expect(buyerSvc).toContain("BuyerCaseStatus.OFFERS_AVAILABLE")
    })
  })

  describe("KPI integrity", () => {
    it("buyer totalSavings does NOT use synthetic placeholder calculation", () => {
      const buyerSvc = src("lib/services/buyer.service.ts")
      // Must NOT contain the old placeholder `completedDeals * 2500`
      expect(buyerSvc).not.toContain("completedDeals * 2500")
      // Should return null until backed by real data
      expect(buyerSvc).toContain("totalSavings: null")
    })
  })
})

// ─── 6. Notification & Email Synchronization ────────────────────────────────

describe("6 · Notification & Email Synchronization", () => {
  it("email service exists with dealer invite method", () => {
    const emailSvc = src("lib/services/email.service.tsx")
    expect(emailSvc).toContain("sendDealerInviteEmail")
  })

  it("email service has sourced-offer notification", () => {
    const emailSvc = src("lib/services/email.service.tsx")
    expect(emailSvc).toContain("sendSourcedOfferPresentedEmail")
  })

  it("admin notification bell exists", () => {
    expect(existsSync(resolve(root, "components/admin/notification-bell.tsx"))).toBe(true)
  })

  it("sourcing invite route sends dealer invite email", () => {
    const inviteRoute = src("app/api/admin/sourcing/cases/[caseId]/invite-dealer/route.ts")
    expect(inviteRoute).toContain("sendDealerInviteEmail")
  })
})

// ─── 7. Exception & Failure-State Handling ──────────────────────────────────

describe("7 · Exception & Failure-State Handling", () => {
  describe("Error response contract", () => {
    it("guard.ts returns structured error with correlationId", () => {
      const guardSrc = src("lib/authz/guard.ts")
      expect(guardSrc).toContain("correlationId")
      expect(guardSrc).toContain("UNAUTHENTICATED")
      expect(guardSrc).toContain("FORBIDDEN")
    })
  })

  describe("Buyer service handles missing data gracefully", () => {
    it("buyer service returns default data when no profile found", () => {
      const buyerSvc = src("lib/services/buyer.service.ts")
      expect(buyerSvc).toContain("getDefaultDashboardData()")
      expect(buyerSvc).toContain("isDatabaseConfigured")
    })

    it("buyer service catches errors and returns defaults", () => {
      const buyerSvc = src("lib/services/buyer.service.ts")
      expect(buyerSvc).toContain("catch (error)")
      expect(buyerSvc).toContain("return getDefaultDashboardData()")
    })
  })

  describe("CSRF enforcement", () => {
    it("guard.ts validates CSRF by default", () => {
      const guardSrc = src("lib/authz/guard.ts")
      expect(guardSrc).toContain("validateCsrf")
      expect(guardSrc).toContain("CSRF_INVALID")
    })
  })
})

// ─── 8. Portal Switcher Integration ─────────────────────────────────────────

describe("8 · Portal Switcher Integration (Cross-Portal Navigation)", () => {
  it("shared PortalSwitcher component exists", () => {
    expect(existsSync(resolve(root, "components/portal-switcher.tsx"))).toBe(true)
  })

  it("PortalSwitcher supports all four portal types", () => {
    const switcher = src("components/portal-switcher.tsx")
    expect(switcher).toContain('"buyer"')
    expect(switcher).toContain('"dealer"')
    expect(switcher).toContain('"admin"')
    expect(switcher).toContain('"affiliate"')
  })

  it("all four portals render PortalSwitcher", () => {
    const portals = [
      "app/buyer/layout-client.tsx",
      "app/admin/layout-client.tsx",
      "app/dealer/layout-client.tsx",
      "app/affiliate/portal/layout-client.tsx",
    ]
    for (const path of portals) {
      expect(src(path)).toContain("PortalSwitcher")
    }
  })

  it("admin layout links to all three other portals", () => {
    const adminLayout = src("app/admin/layout.tsx")
    expect(adminLayout).toContain("/buyer/dashboard")
    expect(adminLayout).toContain("/dealer/dashboard")
    expect(adminLayout).toContain("/affiliate/portal/dashboard")
  })
})

// ─── 9. Shared Infrastructure ───────────────────────────────────────────────

describe("9 · Shared Infrastructure Consistency", () => {
  it("all portals use the same logo file", () => {
    const portals = [
      "app/buyer/layout-client.tsx",
      "app/admin/layout-client.tsx",
      "app/dealer/layout-client.tsx",
      "app/affiliate/portal/layout-client.tsx",
    ]
    for (const path of portals) {
      expect(src(path)).toContain("/images/auto-20lenis.png")
    }
  })

  it("all portals use SessionStatusBanner", () => {
    const portals = [
      "app/buyer/layout-client.tsx",
      "app/admin/layout-client.tsx",
      "app/dealer/layout-client.tsx",
      "app/affiliate/portal/layout-client.tsx",
    ]
    for (const path of portals) {
      expect(src(path)).toContain("SessionStatusBanner")
    }
  })

  it("all portals use AuthDebugDrawer", () => {
    const portals = [
      "app/buyer/layout-client.tsx",
      "app/admin/layout-client.tsx",
      "app/dealer/layout-client.tsx",
      "app/affiliate/portal/layout-client.tsx",
    ]
    for (const path of portals) {
      expect(src(path)).toContain("AuthDebugDrawer")
    }
  })

  it("all portals include ChatWidget", () => {
    const portals = [
      "app/buyer/layout.tsx",
      "app/admin/layout.tsx",
      "app/dealer/layout.tsx",
      "app/affiliate/portal/layout.tsx",
    ]
    for (const path of portals) {
      expect(src(path)).toContain("ChatWidget")
    }
  })
})
