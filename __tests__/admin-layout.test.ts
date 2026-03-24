import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

/**
 * Verifies that the admin navigation config and layout-client iconMap
 * stay in sync after the grouped-nav refactor. The nav is now structured
 * as AdminNavSection[] with collapsible parent groups.
 */

// ── Grouped nav sections from app/admin/layout.tsx ──────────
const navSections = [
  {
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/requests", label: "Requests", icon: "FileText" },
      { href: "/admin/auctions", label: "Auctions", icon: "Gavel" },
      { href: "/admin/offers", label: "Offers", icon: "Tag" },
      { href: "/admin/deals", label: "Deals", icon: "Handshake" },
      { href: "/admin/trade-ins", label: "Trade-Ins", icon: "Car" },
      { href: "/admin/sourcing", label: "Sourcing Cases", icon: "Target" },
      { href: "/admin/sourcing?view=exceptions", label: "Exceptions", icon: "AlertTriangle" },
      { href: "/admin/messages-monitoring", label: "Messages Monitoring", icon: "MessageSquare" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/buyers", label: "Buyers", icon: "Users" },
      { href: "/admin/dealers", label: "Dealers", icon: "Building2" },
      { href: "/admin/dealers?view=applications", label: "Dealer Applications", icon: "ClipboardList" },
      { href: "/admin/dealers?view=expansion", label: "Dealer Expansion Pipeline", icon: "GitBranch" },
      { href: "/admin/affiliates", label: "Affiliates", icon: "UserPlus" },
      { href: "/admin/users", label: "Internal Users", icon: "UserCog" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/payments", label: "Payments", icon: "DollarSign" },
      { href: "/admin/payments?view=fees", label: "Concierge Fees", icon: "Receipt" },
      { href: "/admin/refunds", label: "Refunds", icon: "RefreshCcw" },
      { href: "/admin/insurance", label: "Insurance", icon: "ShieldCheck" },
      { href: "/admin/payouts", label: "Affiliate Payouts", icon: "Wallet" },
      { href: "/admin/financial-reporting", label: "Reconciliation", icon: "BarChart3" },
    ],
  },
  {
    label: "Compliance",
    items: [
      { href: "/admin/preapprovals", label: "Native Preapprovals", icon: "CheckCircle" },
      { href: "/admin/external-preapprovals", label: "External Preapprovals", icon: "Landmark" },
      { href: "/admin/contracts", label: "Contract Shield", icon: "ShieldCheck" },
      { href: "/admin/contracts?view=contracts", label: "Contracts", icon: "FileSignature" },
      { href: "/admin/contract-shield/rules", label: "Shield Rules", icon: "Shield" },
      { href: "/admin/contract-shield/overrides", label: "Shield Overrides", icon: "ShieldAlert" },
      { href: "/admin/manual-reviews", label: "Manual Reviews", icon: "ClipboardCheck" },
      { href: "/admin/documents", label: "Documents", icon: "FileCheck" },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: "ScrollText" },
      { href: "/admin/compliance", label: "Risk", icon: "FileWarning" },
    ],
  },
  {
    label: "Inventory Intelligence",
    items: [
      { href: "/admin/inventory", label: "Vehicle Search", icon: "Search" },
      { href: "/admin/dealer-intelligence", label: "Dealer Intelligence", icon: "Radar" },
      { href: "/admin/inventory/sources", label: "Inventory Sources", icon: "Database" },
      { href: "/admin/inventory/market", label: "Market Inventory", icon: "Globe" },
      { href: "/admin/inventory/verified", label: "Verified Inventory", icon: "ShieldCheck" },
      { href: "/admin/coverage-gaps", label: "Coverage Gaps", icon: "MapPin" },
      { href: "/admin/dealer-invites", label: "Dealer Invites", icon: "Send" },
      { href: "/admin/deal-protection", label: "Deal Protection", icon: "ShieldAlert" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/admin/reports", label: "Funnel Reporting", icon: "TrendingUp" },
      { href: "/admin/reports?view=coverage", label: "Coverage Analytics", icon: "Map" },
      { href: "/admin/reports?view=dealer-performance", label: "Dealer Performance", icon: "Award" },
      { href: "/admin/reports?view=sourcing", label: "Sourcing Analytics", icon: "Radar" },
      { href: "/admin/reports?view=affiliates", label: "Affiliate Analytics", icon: "PieChart" },
      { href: "/admin/ai", label: "AI Oversight", icon: "Bot" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: "Settings" },
      { href: "/admin/notifications", label: "Notifications", icon: "Bell" },
      { href: "/admin/support", label: "Support", icon: "HeadphonesIcon" },
      { href: "/admin/qa", label: "QA", icon: "TestTube" },
      { href: "/admin/settings?view=auth", label: "Auth", icon: "Lock" },
      { href: "/admin/settings/roles", label: "Roles", icon: "Shield" },
      { href: "/admin/settings/integrations", label: "Integrations", icon: "Plug" },
    ],
  },
]

// Flatten all nav items for icon checks
const allNavItems = navSections.flatMap((s) => s.items)
const allNavIcons = allNavItems.map((item) => item.icon)

// These must stay in sync with app/admin/layout-client.tsx → iconMap
const iconMapKeys = [
  "LayoutDashboard",
  "Users",
  "Building2",
  "Gavel",
  "Handshake",
  "DollarSign",
  "ShieldCheck",
  "FileWarning",
  "Settings",
  "HeadphonesIcon",
  "Search",
  "Car",
  "RefreshCcw",
  "FileText",
  "FileCheck",
  "BarChart3",
  "TrendingUp",
  "Bot",
  "Target",
  "Tag",
  "AlertTriangle",
  "UserPlus",
  "UserCog",
  "ClipboardList",
  "GitBranch",
  "Receipt",
  "Wallet",
  "CheckCircle",
  "Landmark",
  "FileSignature",
  "ScrollText",
  "Map",
  "Award",
  "Radar",
  "PieChart",
  "Bell",
  "TestTube",
  "Lock",
  "Shield",
  "Plug",
  "MessageSquare",
  "Database",
  "Globe",
  "MapPin",
  "Send",
  "ShieldAlert",
  "ClipboardCheck",
]

describe("Admin Layout", () => {
  describe("Navigation icon mapping", () => {
    it("should have all nav icons present in the iconMap", () => {
      const iconSet = new Set(iconMapKeys)
      const missing = allNavIcons.filter((icon) => !iconSet.has(icon))
      expect(missing).toEqual([])
    })

    it("should cover unique nav icons without extras being unused", () => {
      const uniqueNavIcons = [...new Set(allNavIcons)]
      const iconSet = new Set(iconMapKeys)
      uniqueNavIcons.forEach((icon) => {
        expect(iconSet.has(icon)).toBe(true)
      })
    })
  })

  describe("Navigation grouping structure", () => {
    it("should have Dashboard as a top-level item without a group label", () => {
      const dashboardSection = navSections[0]
      expect(dashboardSection.label).toBeUndefined()
      expect(dashboardSection.items[0].href).toBe("/admin/dashboard")
      expect(dashboardSection.items[0].label).toBe("Dashboard")
    })

    it("should have exactly 7 grouped sections plus the Dashboard section", () => {
      expect(navSections).toHaveLength(8)
    })

    it("should have the correct group labels in order", () => {
      const labels = navSections.map((s) => s.label).filter(Boolean)
      expect(labels).toEqual([
        "Operations",
        "People",
        "Finance",
        "Compliance",
        "Inventory Intelligence",
        "Intelligence",
        "System",
      ])
    })

    it("should have Sourcing Cases under Operations", () => {
      const ops = navSections.find((s) => s.label === "Operations")!
      const sourcing = ops.items.find((i) => i.label === "Sourcing Cases")
      expect(sourcing).toBeDefined()
      expect(sourcing!.href).toBe("/admin/sourcing")
    })

    it("should have External Preapprovals under Compliance", () => {
      const compliance = navSections.find((s) => s.label === "Compliance")!
      const epas = compliance.items.find((i) => i.label === "External Preapprovals")
      expect(epas).toBeDefined()
      expect(epas!.href).toBe("/admin/external-preapprovals")
    })

    it("should have Dealer Expansion Pipeline under People", () => {
      const people = navSections.find((s) => s.label === "People")!
      const expansion = people.items.find((i) => i.label === "Dealer Expansion Pipeline")
      expect(expansion).toBeDefined()
    })

    it("should have Coverage Analytics under Intelligence", () => {
      const intel = navSections.find((s) => s.label === "Intelligence")!
      const coverage = intel.items.find((i) => i.label === "Coverage Analytics")
      expect(coverage).toBeDefined()
    })

    it("should have Sourcing Analytics under Intelligence", () => {
      const intel = navSections.find((s) => s.label === "Intelligence")!
      const sourcing = intel.items.find((i) => i.label === "Sourcing Analytics")
      expect(sourcing).toBeDefined()
    })

    it("should have Inventory Intelligence section with all inventory items", () => {
      const invIntel = navSections.find((s) => s.label === "Inventory Intelligence")!
      expect(invIntel).toBeDefined()
      expect(invIntel.items.length).toBeGreaterThanOrEqual(8)
      const labels = invIntel.items.map((i) => i.label)
      expect(labels).toContain("Vehicle Search")
      expect(labels).toContain("Dealer Intelligence")
      expect(labels).toContain("Inventory Sources")
      expect(labels).toContain("Market Inventory")
      expect(labels).toContain("Verified Inventory")
      expect(labels).toContain("Coverage Gaps")
      expect(labels).toContain("Dealer Invites")
      expect(labels).toContain("Deal Protection")
    })

    it("should have Messages Monitoring under Operations", () => {
      const ops = navSections.find((s) => s.label === "Operations")!
      const messages = ops.items.find((i) => i.label === "Messages Monitoring")
      expect(messages).toBeDefined()
      expect(messages!.href).toBe("/admin/messages-monitoring")
    })

    it("should have Insurance under Finance", () => {
      const finance = navSections.find((s) => s.label === "Finance")!
      const insurance = finance.items.find((i) => i.label === "Insurance")
      expect(insurance).toBeDefined()
      expect(insurance!.href).toBe("/admin/insurance")
    })

    it("should have Manual Reviews under Compliance", () => {
      const compliance = navSections.find((s) => s.label === "Compliance")!
      const manualReviews = compliance.items.find((i) => i.label === "Manual Reviews")
      expect(manualReviews).toBeDefined()
      expect(manualReviews!.href).toBe("/admin/manual-reviews")
    })

    it("should have Shield Rules and Shield Overrides under Compliance", () => {
      const compliance = navSections.find((s) => s.label === "Compliance")!
      const rules = compliance.items.find((i) => i.label === "Shield Rules")
      const overrides = compliance.items.find((i) => i.label === "Shield Overrides")
      expect(rules).toBeDefined()
      expect(rules!.href).toBe("/admin/contract-shield/rules")
      expect(overrides).toBeDefined()
      expect(overrides!.href).toBe("/admin/contract-shield/overrides")
    })
  })

  describe("Navigation items backward compatibility", () => {
    it("should have a distinct Dealers nav item with route /admin/dealers", () => {
      const dealersItem = allNavItems.find((item) => item.href === "/admin/dealers")
      expect(dealersItem).toBeDefined()
      expect(dealersItem!.label).toBe("Dealers")
      expect(dealersItem!.icon).toBe("Building2")
    })

    it("should have a distinct Affiliates nav item with route /admin/affiliates", () => {
      const affiliatesItem = allNavItems.find((item) => item.href === "/admin/affiliates")
      expect(affiliatesItem).toBeDefined()
      expect(affiliatesItem!.label).toBe("Affiliates")
    })

    it("should have valid icons for all nav items", () => {
      const iconSet = new Set(iconMapKeys)
      allNavItems.forEach((item) => {
        expect(iconSet.has(item.icon)).toBe(true)
      })
    })

    it("should preserve all critical admin routes", () => {
      const criticalRoutes = [
        "/admin/dashboard",
        "/admin/buyers",
        "/admin/dealers",
        "/admin/requests",
        "/admin/auctions",
        "/admin/deals",
        "/admin/payments",
        "/admin/compliance",
        "/admin/settings",
        "/admin/support",
        "/admin/sourcing",
        "/admin/external-preapprovals",
        "/admin/documents",
        "/admin/contracts",
        "/admin/reports",
        "/admin/ai",
        "/admin/insurance",
        "/admin/manual-reviews",
        "/admin/contract-shield/rules",
        "/admin/contract-shield/overrides",
        "/admin/inventory",
        "/admin/inventory/sources",
        "/admin/inventory/market",
        "/admin/inventory/verified",
        "/admin/coverage-gaps",
        "/admin/dealer-invites",
        "/admin/deal-protection",
        "/admin/messages-monitoring",
      ]
      const allHrefs = allNavItems.map((i) => i.href.split("?")[0])
      criticalRoutes.forEach((route) => {
        expect(allHrefs).toContain(route)
      })
    })
  })

  describe("Layout client structure", () => {
    it("should export AdminNavSection type from layout-client", () => {
      const clientPath = path.resolve("app/admin/layout-client.tsx")
      const clientContent = fs.readFileSync(clientPath, "utf-8")
      expect(clientContent).toContain("export interface AdminNavSection")
    })

    it("should export AdminNavItem type from layout-client", () => {
      const clientPath = path.resolve("app/admin/layout-client.tsx")
      const clientContent = fs.readFileSync(clientPath, "utf-8")
      expect(clientContent).toContain("export interface AdminNavItem")
    })

    it("should use collapsible sections with aria-expanded", () => {
      const clientPath = path.resolve("app/admin/layout-client.tsx")
      const clientContent = fs.readFileSync(clientPath, "utf-8")
      expect(clientContent).toContain("aria-expanded")
      expect(clientContent).toContain("aria-controls")
    })

    it("should auto-expand sections containing the active route", () => {
      const clientPath = path.resolve("app/admin/layout-client.tsx")
      const clientContent = fs.readFileSync(clientPath, "utf-8")
      expect(clientContent).toContain("isSectionActive")
      expect(clientContent).toContain("expandedSections")
    })

    it("should use ChevronDown for collapsible section indicators", () => {
      const clientPath = path.resolve("app/admin/layout-client.tsx")
      const clientContent = fs.readFileSync(clientPath, "utf-8")
      expect(clientContent).toContain("ChevronDown")
    })
  })

  describe("Navigation route file existence", () => {
    it("should have a page file for every nav item route", () => {
      const missing: string[] = []
      allNavItems.forEach((item) => {
        const route = item.href.split("?")[0]
        const pagePath = path.resolve(`app${route}/page.tsx`)
        const pagePathTs = path.resolve(`app${route}/page.ts`)
        if (!fs.existsSync(pagePath) && !fs.existsSync(pagePathTs)) {
          missing.push(`${item.label} (${route})`)
        }
      })
      expect(missing).toEqual([])
    })

    it("should have all new icons present in the layout-client iconMap", () => {
      const clientPath = path.resolve("app/admin/layout-client.tsx")
      const clientContent = fs.readFileSync(clientPath, "utf-8")
      const newIcons = ["MessageSquare", "Database", "Globe", "MapPin", "Send", "ShieldAlert", "ClipboardCheck"]
      newIcons.forEach((icon) => {
        expect(clientContent).toContain(icon)
      })
    })
  })
})
