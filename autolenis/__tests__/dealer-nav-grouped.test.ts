import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(__dirname, "..")

// ─── Grouped Nav Structure ──────────────────────────────────────────────────
// The dealer sidebar must use a grouped NavSection[] structure identical
// to the Buyer dashboard pattern. These tests enforce the exact grouping
// specified in the product requirements.
// ─────────────────────────────────────────────────────────────────────────────

// Must stay in sync with app/dealer/layout.tsx nav configuration
const EXPECTED_SECTIONS = [
  {
    label: undefined,
    items: ["/dealer/dashboard"],
  },
  {
    label: "Opportunities",
    items: [
      "/dealer/requests",
      "/dealer/auctions",
      "/dealer/auctions/invited",
      "/dealer/opportunities",
    ],
  },
  {
    label: "Offer Management",
    items: ["/dealer/auctions/offers", "/dealer/deals"],
  },
  {
    label: "Operations",
    items: [
      "/dealer/inventory",
      "/dealer/contracts",
      "/dealer/documents",
      "/dealer/payments",
      "/dealer/messages",
      "/dealer/pickups",
    ],
  },
  {
    label: "Account",
    items: ["/dealer/settings"],
  },
]

describe("Dealer Nav — Grouped NavSection[] structure", () => {
  const layoutSrc = readFileSync(resolve(ROOT, "app/dealer/layout.tsx"), "utf-8")

  it("imports NavSection type from layout-client", () => {
    expect(layoutSrc).toContain("NavSection")
    expect(layoutSrc).toContain('from "./layout-client"')
  })

  it("declares nav as NavSection[]", () => {
    expect(layoutSrc).toMatch(/const\s+nav:\s*NavSection\[\]/)
  })

  for (const section of EXPECTED_SECTIONS) {
    if (section.label) {
      it(`has section labeled "${section.label}"`, () => {
        expect(layoutSrc).toContain(`label: "${section.label}"`)
      })
    }

    for (const href of section.items) {
      it(`includes route ${href}`, () => {
        expect(layoutSrc).toContain(`href: "${href}"`)
      })
    }
  }
})

// ─── Icon Map Completeness ──────────────────────────────────────────────────
// Every icon name referenced in the nav config must be present in the
// layout-client iconMap to avoid silent fallback to LayoutDashboard.
// ─────────────────────────────────────────────────────────────────────────────

describe("Dealer Nav — Icon map completeness", () => {
  const layoutSrc = readFileSync(resolve(ROOT, "app/dealer/layout.tsx"), "utf-8")
  const clientSrc = readFileSync(resolve(ROOT, "app/dealer/layout-client.tsx"), "utf-8")

  // Extract all icon names from nav config
  const iconNames = [...layoutSrc.matchAll(/icon:\s*"(\w+)"/g)].map((m) => m[1])

  it("nav config references at least 10 icons", () => {
    expect(iconNames.length).toBeGreaterThanOrEqual(10)
  })

  for (const iconName of iconNames) {
    it(`iconMap includes "${iconName}"`, () => {
      // The icon must appear as a key in the iconMap object
      expect(clientSrc).toContain(iconName)
    })
  }
})

// ─── Layout Client exports NavSection ───────────────────────────────────────
describe("Dealer Layout Client — exports NavSection type", () => {
  const clientSrc = readFileSync(resolve(ROOT, "app/dealer/layout-client.tsx"), "utf-8")

  it("exports NavSection interface", () => {
    expect(clientSrc).toMatch(/export\s+interface\s+NavSection/)
  })

  it("exports NavItem interface", () => {
    expect(clientSrc).toMatch(/export\s+interface\s+NavItem/)
  })

  it("DealerLayoutClient accepts NavSection[] for nav prop", () => {
    expect(clientSrc).toContain("nav: NavSection[]")
  })

  it("uses SidebarNav component for rendering", () => {
    expect(clientSrc).toContain("SidebarNav")
  })

  it("has aria-label on navigation", () => {
    expect(clientSrc).toContain('aria-label="Main navigation"')
  })

  it("has aria-current for active state", () => {
    expect(clientSrc).toContain('aria-current={active ? "page" : undefined}')
  })

  it("has proper mobile drawer structure", () => {
    expect(clientSrc).toContain('role="dialog"')
    expect(clientSrc).toContain('aria-modal="true"')
  })

  it("uses LucideIcon typed iconMap (not any)", () => {
    expect(clientSrc).toContain("Record<string, LucideIcon>")
  })
})
