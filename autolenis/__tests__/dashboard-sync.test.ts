import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

// ─── Cross-Portal Dashboard Synchronization Tests ───────────────────────
// Validates that all four dashboards (Buyer, Admin, Dealer, Affiliate) are
// properly linked, use consistent navigation patterns, and operate as one
// unified system via the shared PortalSwitcher component.
// ─────────────────────────────────────────────────────────────────────────

const portalSwitcherSrc = readFileSync(
  resolve(__dirname, "../components/portal-switcher.tsx"),
  "utf-8",
)

const buyerLayoutSrc = readFileSync(
  resolve(__dirname, "../app/buyer/layout.tsx"),
  "utf-8",
)

const buyerClientSrc = readFileSync(
  resolve(__dirname, "../app/buyer/layout-client.tsx"),
  "utf-8",
)

const adminLayoutSrc = readFileSync(
  resolve(__dirname, "../app/admin/layout.tsx"),
  "utf-8",
)

const adminClientSrc = readFileSync(
  resolve(__dirname, "../app/admin/layout-client.tsx"),
  "utf-8",
)

const dealerLayoutSrc = readFileSync(
  resolve(__dirname, "../app/dealer/layout.tsx"),
  "utf-8",
)

const dealerClientSrc = readFileSync(
  resolve(__dirname, "../app/dealer/layout-client.tsx"),
  "utf-8",
)

const affiliateLayoutSrc = readFileSync(
  resolve(__dirname, "../app/affiliate/portal/layout.tsx"),
  "utf-8",
)

const affiliateClientSrc = readFileSync(
  resolve(__dirname, "../app/affiliate/portal/layout-client.tsx"),
  "utf-8",
)

describe("PortalSwitcher — Shared Component", () => {
  it("exports PortalSwitcher component", () => {
    expect(portalSwitcherSrc).toContain("export function PortalSwitcher")
  })

  it("exports PortalId type", () => {
    expect(portalSwitcherSrc).toContain("export type PortalId")
  })

  it("exports PortalLink interface", () => {
    expect(portalSwitcherSrc).toContain("export interface PortalLink")
  })

  it("exports PortalSwitcherProps interface", () => {
    expect(portalSwitcherSrc).toContain("export interface PortalSwitcherProps")
  })

  it("supports all four portal types", () => {
    expect(portalSwitcherSrc).toContain('"buyer"')
    expect(portalSwitcherSrc).toContain('"dealer"')
    expect(portalSwitcherSrc).toContain('"admin"')
    expect(portalSwitcherSrc).toContain('"affiliate"')
  })

  it("has both header and mobile variants", () => {
    expect(portalSwitcherSrc).toContain('"header"')
    expect(portalSwitcherSrc).toContain('"mobile"')
  })

  it("renders nothing when no portals available", () => {
    expect(portalSwitcherSrc).toContain("if (availablePortals.length === 0) return null")
  })

  it("uses accessible test IDs", () => {
    expect(portalSwitcherSrc).toContain("data-testid")
    expect(portalSwitcherSrc).toContain("portal-switcher-header")
    expect(portalSwitcherSrc).toContain("portal-switcher-mobile")
  })

  it("includes icons for all portal types", () => {
    expect(portalSwitcherSrc).toContain("portalIcons")
    expect(portalSwitcherSrc).toContain("buyer: Car")
    expect(portalSwitcherSrc).toContain("dealer: Building2")
    expect(portalSwitcherSrc).toContain("admin: LayoutDashboard")
    expect(portalSwitcherSrc).toContain("affiliate: Users")
  })
})

describe("Buyer Portal — Portal Synchronization", () => {
  it("imports PortalSwitcher and PortalLink", () => {
    expect(buyerClientSrc).toContain("PortalSwitcher")
    expect(buyerLayoutSrc).toContain("PortalLink")
  })

  it("server layout builds portalLinks for buyer-affiliates", () => {
    expect(buyerLayoutSrc).toContain("portalLinks")
    expect(buyerLayoutSrc).toContain("is_affiliate")
    expect(buyerLayoutSrc).toContain("/affiliate/portal/dashboard")
  })

  it("passes portalLinks prop to client layout", () => {
    expect(buyerLayoutSrc).toContain("portalLinks={portalLinks}")
    expect(buyerClientSrc).toContain("portalLinks")
  })

  it("renders PortalSwitcher in header", () => {
    expect(buyerClientSrc).toContain('currentPortal="buyer"')
    expect(buyerClientSrc).toContain("availablePortals={portalLinks}")
  })

  it("renders PortalSwitcher in mobile drawer", () => {
    expect(buyerClientSrc).toContain('variant="mobile"')
  })
})

describe("Admin Portal — Portal Synchronization", () => {
  it("imports PortalSwitcher and PortalLink", () => {
    expect(adminClientSrc).toContain("PortalSwitcher")
    expect(adminLayoutSrc).toContain("PortalLink")
  })

  it("server layout provides links to all three other portals", () => {
    expect(adminLayoutSrc).toContain("/buyer/dashboard")
    expect(adminLayoutSrc).toContain("/dealer/dashboard")
    expect(adminLayoutSrc).toContain("/affiliate/portal/dashboard")
  })

  it("labels portal links consistently", () => {
    expect(adminLayoutSrc).toContain('"Buyer Portal"')
    expect(adminLayoutSrc).toContain('"Dealer Portal"')
    expect(adminLayoutSrc).toContain('"Affiliate Portal"')
  })

  it("passes portalLinks prop to client layout", () => {
    expect(adminLayoutSrc).toContain("portalLinks={portalLinks}")
    expect(adminClientSrc).toContain("portalLinks")
  })

  it("renders PortalSwitcher in header", () => {
    expect(adminClientSrc).toContain('currentPortal="admin"')
    expect(adminClientSrc).toContain("availablePortals={portalLinks}")
  })

  it("renders PortalSwitcher in mobile drawer", () => {
    expect(adminClientSrc).toContain('variant="mobile"')
  })
})

describe("Dealer Portal — Portal Synchronization", () => {
  it("imports PortalSwitcher and PortalLink", () => {
    expect(dealerClientSrc).toContain("PortalSwitcher")
    expect(dealerLayoutSrc).toContain("PortalLink")
  })

  it("server layout initializes portalLinks", () => {
    expect(dealerLayoutSrc).toContain("portalLinks")
  })

  it("passes portalLinks prop to client layout", () => {
    expect(dealerLayoutSrc).toContain("portalLinks={portalLinks}")
    expect(dealerClientSrc).toContain("portalLinks")
  })

  it("renders PortalSwitcher in header", () => {
    expect(dealerClientSrc).toContain('currentPortal="dealer"')
    expect(dealerClientSrc).toContain("availablePortals={portalLinks}")
  })

  it("renders PortalSwitcher in mobile drawer", () => {
    expect(dealerClientSrc).toContain('variant="mobile"')
  })
})

describe("Affiliate Portal — Portal Synchronization", () => {
  it("imports PortalSwitcher and PortalLink", () => {
    expect(affiliateClientSrc).toContain("PortalSwitcher")
    expect(affiliateLayoutSrc).toContain("PortalLink")
  })

  it("server layout builds portalLinks for buyer-affiliates", () => {
    expect(affiliateLayoutSrc).toContain("portalLinks")
    expect(affiliateLayoutSrc).toContain("isBuyerAffiliate")
    expect(affiliateLayoutSrc).toContain("/buyer/dashboard")
  })

  it("passes portalLinks prop to client layout", () => {
    expect(affiliateLayoutSrc).toContain("portalLinks={portalLinks}")
    expect(affiliateClientSrc).toContain("portalLinks")
  })

  it("renders PortalSwitcher in header", () => {
    expect(affiliateClientSrc).toContain('currentPortal="affiliate"')
    expect(affiliateClientSrc).toContain("availablePortals={portalLinks}")
  })

  it("renders PortalSwitcher in mobile drawer", () => {
    expect(affiliateClientSrc).toContain('variant="mobile"')
  })
})

describe("Cross-Portal — Consistent Patterns", () => {
  const allClients = [buyerClientSrc, adminClientSrc, dealerClientSrc, affiliateClientSrc]
  const allLayouts = [buyerLayoutSrc, adminLayoutSrc, dealerLayoutSrc, affiliateLayoutSrc]

  it("all portals use the same logo", () => {
    for (const src of allClients) {
      expect(src).toContain("/images/auto-20lenis.png")
    }
  })

  it("all portals use SessionStatusBanner", () => {
    for (const src of allClients) {
      expect(src).toContain("SessionStatusBanner")
    }
  })

  it("all portals use AuthDebugDrawer", () => {
    for (const src of allClients) {
      expect(src).toContain("AuthDebugDrawer")
    }
  })

  it("all portals have ARIA banner and main roles", () => {
    for (const src of allClients) {
      expect(src).toContain('role="banner"')
      expect(src).toContain('role="main"')
    }
  })

  it("all portals have mobile drawer", () => {
    for (const src of allClients) {
      expect(src).toContain('role="dialog"')
      expect(src).toContain('aria-modal="true"')
    }
  })

  it("all portals use PortalSwitcher component", () => {
    for (const src of allClients) {
      expect(src).toContain("PortalSwitcher")
    }
  })

  it("all server layouts use PortalLink type", () => {
    for (const src of allLayouts) {
      expect(src).toContain("PortalLink")
    }
  })

  it("all server layouts require authentication", () => {
    for (const src of allLayouts) {
      expect(src).toContain("getSessionUser")
      expect(src).toContain("redirect")
    }
  })

  it("all server layouts check email verification", () => {
    for (const src of allLayouts) {
      expect(src).toContain("requireEmailVerification")
    }
  })

  it("all portals include ChatWidget", () => {
    for (const src of allLayouts) {
      expect(src).toContain("ChatWidget")
    }
  })
})
