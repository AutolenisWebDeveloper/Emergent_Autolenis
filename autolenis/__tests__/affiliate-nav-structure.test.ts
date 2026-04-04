import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

// ─── Affiliate Nav Structure Validation ────────────────────────────────────
// Ensures the Affiliate sidebar uses the exact grouped structure required:
//   Dashboard (top-level, no label)
//   Growth: My Referral Link, Analytics, All Referrals, Referred Buyers, Referred Affiliates
//   Earnings: Commissions & Earnings, Payout Settings
//   Resources: Promo Assets, Documents
//   Account: Account & Settings
// ──────────────────────────────────────────────────────────────────────────

const layoutSrc = readFileSync(
  resolve(__dirname, "../app/affiliate/portal/layout.tsx"),
  "utf-8",
)

const layoutClientSrc = readFileSync(
  resolve(__dirname, "../app/affiliate/portal/layout-client.tsx"),
  "utf-8",
)

describe("Affiliate Nav — Grouped Section Structure", () => {
  it("uses NavSection[] type (not flat NavItem[])", () => {
    expect(layoutSrc).toContain("NavSection[]")
    expect(layoutSrc).toContain("import")
    expect(layoutSrc).toContain("NavSection")
  })

  it("layout-client exports NavSection interface", () => {
    expect(layoutClientSrc).toContain("export interface NavSection")
  })

  it("defines Dashboard as a top-level item without section label", () => {
    // First section should have no label and contain Dashboard
    expect(layoutSrc).toMatch(/items:\s*\[\s*\{\s*href:\s*"\/affiliate\/portal\/dashboard"/)
  })

  it("defines Growth section with required items", () => {
    expect(layoutSrc).toContain('label: "Growth"')
    expect(layoutSrc).toContain('label: "My Referral Link"')
    expect(layoutSrc).toContain('label: "Analytics"')
    expect(layoutSrc).toContain('label: "All Referrals"')
    expect(layoutSrc).toContain('label: "Referred Buyers"')
    expect(layoutSrc).toContain('label: "Referred Affiliates"')
  })

  it("defines Earnings section with required items", () => {
    expect(layoutSrc).toContain('label: "Earnings"')
    expect(layoutSrc).toContain('label: "Commissions & Earnings"')
    expect(layoutSrc).toContain('label: "Payout Settings"')
  })

  it("defines Resources section with required items", () => {
    expect(layoutSrc).toContain('label: "Resources"')
    expect(layoutSrc).toContain('label: "Promo Assets"')
    expect(layoutSrc).toContain('label: "Documents"')
  })

  it("defines Account section with required items", () => {
    expect(layoutSrc).toContain('label: "Account"')
    expect(layoutSrc).toContain('label: "Account & Settings"')
  })

  it("preserves all existing routes", () => {
    const routes = [
      "/affiliate/portal/dashboard",
      "/affiliate/portal/link",
      "/affiliate/portal/analytics",
      "/affiliate/portal/referrals",
      "/affiliate/portal/referrals/buyers",
      "/affiliate/portal/referrals/affiliates",
      "/affiliate/portal/commissions",
      "/affiliate/portal/payouts",
      "/affiliate/portal/assets",
      "/affiliate/portal/documents",
      "/affiliate/portal/settings",
    ]
    for (const route of routes) {
      expect(layoutSrc).toContain(route)
    }
  })
})

describe("Affiliate Nav — Layout Client Quality", () => {
  it("uses Image component for logo (matches Buyer pattern)", () => {
    expect(layoutClientSrc).toContain('import Image from "next/image"')
    expect(layoutClientSrc).toContain('src="/images/auto-20lenis.png"')
  })

  it("renders section labels via semantic markup", () => {
    expect(layoutClientSrc).toContain("section.label")
    expect(layoutClientSrc).toContain("tracking-widest uppercase")
  })

  it("has proper ARIA landmarks", () => {
    expect(layoutClientSrc).toContain('role="banner"')
    expect(layoutClientSrc).toContain('role="main"')
    expect(layoutClientSrc).toContain('role="navigation"')
    expect(layoutClientSrc).toContain('role="dialog"')
    expect(layoutClientSrc).toContain('aria-modal="true"')
  })

  it("has keyboard-accessible focus states", () => {
    expect(layoutClientSrc).toContain("focus-visible:outline-none")
    expect(layoutClientSrc).toContain("focus-visible:ring-2")
    expect(layoutClientSrc).toContain("focus-ring")
  })

  it("includes aria-current for active page", () => {
    expect(layoutClientSrc).toContain('aria-current={active ? "page" : undefined}')
  })

  it("uses card-wrapped desktop sidebar (matches Buyer pattern)", () => {
    expect(layoutClientSrc).toContain("rounded-xl border border-border/60")
    expect(layoutClientSrc).toContain("sticky top-24")
  })

  it("has mobile drawer with constrained width", () => {
    expect(layoutClientSrc).toContain("w-[min(320px,88vw)]")
  })

  it("locks body scroll when mobile menu is open", () => {
    expect(layoutClientSrc).toContain('document.body.style.overflow = "hidden"')
    expect(layoutClientSrc).toContain('document.body.style.overflow = ""')
  })

  it("preserves RBAC — auth/role checks unchanged", () => {
    // Layout server must still check affiliate role
    expect(layoutSrc).toContain("getSessionUser")
    expect(layoutSrc).toContain("AFFILIATE")
    expect(layoutSrc).toContain("AFFILIATE_ONLY")
    expect(layoutSrc).toContain("is_affiliate")
    expect(layoutSrc).toContain('redirect("/affiliate?signin=required")')
    expect(layoutSrc).toContain("requireEmailVerification")
  })

  it("supports buyer-affiliate portal switching", () => {
    expect(layoutSrc).toContain("isBuyerAffiliate")
    expect(layoutSrc).toContain("/buyer/dashboard")
    expect(layoutSrc).toContain("portalLinks")
    expect(layoutClientSrc).toContain("PortalSwitcher")
    expect(layoutClientSrc).toContain("portalLinks")
  })
})

describe("Affiliate Dashboard — Premium Widget Sections", () => {
  const dashSrc = readFileSync(
    resolve(__dirname, "../app/affiliate/portal/dashboard/page.tsx"),
    "utf-8",
  )

  it("has Growth widgets section", () => {
    expect(dashSrc).toContain("Growth")
    expect(dashSrc).toContain("/affiliate/portal/referrals/buyers")
    expect(dashSrc).toContain("/affiliate/portal/referrals/affiliates")
    expect(dashSrc).toContain("/affiliate/portal/analytics")
  })

  it("has Earnings widgets section", () => {
    expect(dashSrc).toContain("Earnings")
    expect(dashSrc).toContain("Pending Commissions")
    expect(dashSrc).toContain("Approved Earnings")
    expect(dashSrc).toContain("Paid Earnings")
    expect(dashSrc).toContain("Payout Settings")
  })

  it("has Resources widgets section", () => {
    expect(dashSrc).toContain("Resources")
    expect(dashSrc).toContain("Promo Assets")
    expect(dashSrc).toContain("Documents")
  })

  it("preserves KPI cards", () => {
    expect(dashSrc).toContain("kpiCards")
    expect(dashSrc).toContain("Total Clicks")
    expect(dashSrc).toContain("Sign-ups")
    expect(dashSrc).toContain("Pending")
    expect(dashSrc).toContain("Total Earned")
  })

  it("preserves commission structure display", () => {
    expect(dashSrc).toContain("Commission Structure")
    expect(dashSrc).toContain("LEVEL_META")
    expect(dashSrc).toContain("20% Total")
  })

  it("preserves click chart", () => {
    expect(dashSrc).toContain("Click Activity")
    expect(dashSrc).toContain("AreaChart")
  })

  it("preserves referral link bar", () => {
    expect(dashSrc).toContain("Your Referral Link")
    expect(dashSrc).toContain("affiliate?.referralLink")
  })
})
