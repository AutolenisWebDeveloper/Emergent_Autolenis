/**
 * Dealer Dashboard Complete Audit Test Suite
 *
 * Validates the complete dealer portal:
 * - Route/page existence
 * - API route existence and auth
 * - Navigation completeness
 * - Search filter wiring
 * - Error handling (no empty catches)
 * - Loading state coverage
 * - Detail/edit page existence for links
 * - CSRF protection on mutations
 * - Remediation verification
 */
import { describe, expect, it } from "vitest"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(__dirname, "..")

// ─── A. Executive Verdict ───────────────────────────────────────────────────
// The dealer dashboard has been audited and remediated. This test suite
// validates production readiness for the dealer portal.
// ─────────────────────────────────────────────────────────────────────────────

// ─── B. Dealer Route Coverage Matrix ────────────────────────────────────────

const EXPECTED_DEALER_PAGES = [
  // Dashboard
  "app/dealer/dashboard/page.tsx",
  // Opportunities
  "app/dealer/requests/page.tsx",
  "app/dealer/requests/[requestId]/page.tsx",
  "app/dealer/auctions/page.tsx",
  "app/dealer/auctions/[id]/page.tsx",
  "app/dealer/auctions/invited/page.tsx",
  "app/dealer/auctions/offers/page.tsx",
  "app/dealer/opportunities/page.tsx",
  // Offer Management
  "app/dealer/offers/page.tsx",
  "app/dealer/offers/[offerId]/page.tsx",
  "app/dealer/offers/new/page.tsx",
  "app/dealer/deals/page.tsx",
  "app/dealer/deals/[dealId]/page.tsx",
  "app/dealer/deals/[dealId]/insurance/page.tsx",
  // Operations - Inventory
  "app/dealer/inventory/page.tsx",
  "app/dealer/inventory/[id]/page.tsx",
  "app/dealer/inventory/[id]/edit/page.tsx",
  "app/dealer/inventory/add/page.tsx",
  "app/dealer/inventory/bulk-upload/page.tsx",
  "app/dealer/inventory/column-mapping/page.tsx",
  "app/dealer/inventory/import-history/page.tsx",
  // Operations - Other
  "app/dealer/contracts/page.tsx",
  "app/dealer/contracts/[id]/page.tsx",
  "app/dealer/documents/page.tsx",
  "app/dealer/documents/[documentId]/page.tsx",
  "app/dealer/payments/page.tsx",
  "app/dealer/payments/success/page.tsx",
  "app/dealer/payments/cancel/page.tsx",
  "app/dealer/messages/page.tsx",
  "app/dealer/messages/[threadId]/page.tsx",
  "app/dealer/messages/new/page.tsx",
  "app/dealer/pickups/page.tsx",
  // Account
  "app/dealer/settings/page.tsx",
  "app/dealer/profile/page.tsx",
  // Onboarding
  "app/dealer/onboarding/page.tsx",
  "app/dealer/onboarding/agreement/page.tsx",
  "app/dealer/apply/page.tsx",
  "app/dealer/sign-in/page.tsx",
  // Leads
  "app/dealer/leads/page.tsx",
  "app/dealer/leads/[leadId]/page.tsx",
]

describe("B. Dealer Route Coverage — Page Existence", () => {
  for (const page of EXPECTED_DEALER_PAGES) {
    it(`${page} exists`, () => {
      expect(existsSync(resolve(ROOT, page))).toBe(true)
    })
  }
})

// ─── C. Dealer Feature Audit — API Route Coverage ──────────────────────────

const EXPECTED_API_ROUTES = [
  "app/api/dealer/dashboard/route.ts",
  "app/api/dealer/settings/route.ts",
  "app/api/dealer/profile/route.ts",
  "app/api/dealer/onboarding/route.ts",
  "app/api/dealer/auctions/route.ts",
  "app/api/dealer/inventory/route.ts",
  "app/api/dealer/inventory/[id]/route.ts",
  "app/api/dealer/inventory/bulk-upload/route.ts",
  "app/api/dealer/inventory/suggested/route.ts",
  "app/api/dealer/offers/route.ts",
  "app/api/dealer/deals/route.ts",
  "app/api/dealer/contracts/route.ts",
  "app/api/dealer/documents/route.ts",
  "app/api/dealer/documents/upload/route.ts",
  "app/api/dealer/payments/route.ts",
  "app/api/dealer/payments/checkout/route.ts",
  "app/api/dealer/messages/route.ts",
  "app/api/dealer/pickups/route.ts",
  "app/api/dealer/opportunities/route.ts",
  "app/api/dealer/requests/route.ts",
  "app/api/dealer/register/route.ts",
  "app/api/dealer/onboarding/upload-docs/route.ts",
  "app/api/dealer/onboarding/accept-agreement/route.ts",
  "app/api/dealer/onboarding/conversion-status/route.ts",
]

describe("C. Dealer Feature Audit — API Route Existence", () => {
  for (const route of EXPECTED_API_ROUTES) {
    it(`${route} exists`, () => {
      expect(existsSync(resolve(ROOT, route))).toBe(true)
    })
  }
})

// ─── D. Inventory Detail/Edit — Dead Link Remediation ──────────────────────

describe("D. Inventory Detail/Edit — Dead Link Remediation", () => {
  it("inventory detail page exists at [id]/page.tsx", () => {
    expect(existsSync(resolve(ROOT, "app/dealer/inventory/[id]/page.tsx"))).toBe(true)
  })

  it("inventory edit page exists at [id]/edit/page.tsx", () => {
    expect(existsSync(resolve(ROOT, "app/dealer/inventory/[id]/edit/page.tsx"))).toBe(true)
  })

  it("inventory detail page fetches from /api/dealer/inventory/{id}", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/inventory/[id]/page.tsx"), "utf-8")
    expect(src).toContain("/api/dealer/inventory/")
    expect(src).toContain("useSWR")
  })

  it("inventory edit page uses CSRF headers on PATCH", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/inventory/[id]/edit/page.tsx"), "utf-8")
    expect(src).toContain("csrfHeaders")
    expect(src).toContain("PATCH")
  })

  it("inventory detail page has loading state", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/inventory/[id]/page.tsx"), "utf-8")
    expect(src).toContain("isLoading")
  })

  it("inventory detail page has error state", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/inventory/[id]/page.tsx"), "utf-8")
    expect(src).toContain("AlertCircle")
    expect(src).toContain("Failed to load")
  })

  it("inventory edit page has error state", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/inventory/[id]/edit/page.tsx"), "utf-8")
    expect(src).toContain("AlertCircle")
    expect(src).toContain("Failed to load")
  })

  it("inventory [id] API route has GET handler", () => {
    const src = readFileSync(resolve(ROOT, "app/api/dealer/inventory/[id]/route.ts"), "utf-8")
    expect(src).toMatch(/export\s+async\s+function\s+GET/)
  })

  it("inventory [id] API route has PATCH handler", () => {
    const src = readFileSync(resolve(ROOT, "app/api/dealer/inventory/[id]/route.ts"), "utf-8")
    expect(src).toMatch(/export\s+async\s+function\s+PATCH/)
  })

  it("inventory [id] API route has DELETE handler", () => {
    const src = readFileSync(resolve(ROOT, "app/api/dealer/inventory/[id]/route.ts"), "utf-8")
    expect(src).toMatch(/export\s+async\s+function\s+DELETE/)
  })

  it("inventory detail page links to edit page", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/inventory/[id]/page.tsx"), "utf-8")
    expect(src).toContain("/edit")
  })

  it("inventory edit page has back link to detail page", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/inventory/[id]/edit/page.tsx"), "utf-8")
    expect(src).toContain(`/dealer/inventory/`)
  })
})

// ─── E. Search Filter Wiring Verification ──────────────────────────────────

describe("E. Search Filter Wiring — No Unbound Inputs", () => {
  const PAGES_WITH_SEARCH = [
    { path: "app/dealer/inventory/page.tsx", name: "Inventory" },
    { path: "app/dealer/leads/page.tsx", name: "Leads" },
    { path: "app/dealer/offers/page.tsx", name: "Offers" },
  ]

  for (const { path, name } of PAGES_WITH_SEARCH) {
    it(`${name} search input has value binding`, () => {
      const src = readFileSync(resolve(ROOT, path), "utf-8")
      // Search input must have value={search} or value={...}
      expect(src).toMatch(/value=\{search/)
    })

    it(`${name} search input has onChange binding`, () => {
      const src = readFileSync(resolve(ROOT, path), "utf-8")
      expect(src).toMatch(/onChange=/)
    })

    it(`${name} uses useState for search state`, () => {
      const src = readFileSync(resolve(ROOT, path), "utf-8")
      expect(src).toContain("useState")
      expect(src).toContain("setSearch")
    })
  }

  it("inventory search filters on item fields directly (not item.vehicle)", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/inventory/page.tsx"), "utf-8")
    // The search should access item.make, not item.vehicle.make
    expect(src).toContain("item.make?")
    expect(src).toContain("item.model?")
    expect(src).not.toContain("vehicle.make")
    expect(src).not.toContain("vehicle.model")
  })
})

// ─── F. Error Handling — No Empty Catch Blocks ─────────────────────────────

describe("F. Error Handling — No Empty Catch Blocks on Mutations", () => {
  it("apply page handlers have toast error feedback", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/apply/page.tsx"), "utf-8")
    expect(src).toContain("useToast")
    expect(src).toContain('toast({')
    // Must not have an empty catch with only a comment
    expect(src).not.toMatch(/catch\s*\{\s*\n\s*\/\/ handle error\s*\n\s*\}/)
  })

  it("inventory page has toast for delete failure", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/inventory/page.tsx"), "utf-8")
    expect(src).toContain("Failed to remove vehicle")
  })

  it("inventory add page has toast for submission failure", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/inventory/add/page.tsx"), "utf-8")
    expect(src).toContain("useToast")
  })

  it("inventory edit page has toast for save failure", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/inventory/[id]/edit/page.tsx"), "utf-8")
    expect(src).toContain("useToast")
  })
})

// ─── G. Loading State Coverage ─────────────────────────────────────────────

describe("G. Loading State — Skeleton Coverage", () => {
  const DIRS_NEEDING_LOADING = [
    "app/dealer/dashboard",
    "app/dealer/auctions",
    "app/dealer/deals",
    "app/dealer/offers",
    "app/dealer/contracts",
    "app/dealer/documents",
    "app/dealer/inventory",
    "app/dealer/inventory/[id]",
    "app/dealer/inventory/[id]/edit",
    "app/dealer/messages",
    "app/dealer/payments",
    "app/dealer/pickups",
    "app/dealer/profile",
    "app/dealer/settings",
    "app/dealer/requests",
    "app/dealer/opportunities",
    "app/dealer/leads",
  ]

  for (const dir of DIRS_NEEDING_LOADING) {
    it(`${dir}/loading.tsx exists`, () => {
      expect(existsSync(resolve(ROOT, dir, "loading.tsx"))).toBe(true)
    })
  }

  it("inventory/loading.tsx returns actual skeleton (not null)", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/inventory/loading.tsx"), "utf-8")
    expect(src).not.toMatch(/return\s+null/)
    expect(src).toContain("Skeleton")
  })
})

// ─── H. Auth / RBAC / Guardrail Verification ──────────────────────────────

describe("H. Auth / RBAC — Dealer API Route Guards", () => {
  const DEALER_API_ROUTES = [
    "app/api/dealer/dashboard/route.ts",
    "app/api/dealer/settings/route.ts",
    "app/api/dealer/profile/route.ts",
    "app/api/dealer/onboarding/route.ts",
    "app/api/dealer/auctions/route.ts",
    "app/api/dealer/inventory/route.ts",
    "app/api/dealer/inventory/[id]/route.ts",
    "app/api/dealer/deals/route.ts",
    "app/api/dealer/contracts/route.ts",
    "app/api/dealer/documents/route.ts",
    "app/api/dealer/payments/route.ts",
    "app/api/dealer/messages/route.ts",
    "app/api/dealer/pickups/route.ts",
    "app/api/dealer/opportunities/route.ts",
    "app/api/dealer/requests/route.ts",
    "app/api/dealer/offers/route.ts",
  ]

  for (const route of DEALER_API_ROUTES) {
    it(`${route} checks for DEALER role`, () => {
      const src = readFileSync(resolve(ROOT, route), "utf-8")
      const checksRole =
        src.includes("DEALER") &&
        (src.includes("401") || src.includes("403") || src.includes("requireAuth"))
      expect(checksRole).toBe(true)
    })

    it(`${route} uses getSessionUser or requireAuth or getSession`, () => {
      const src = readFileSync(resolve(ROOT, route), "utf-8")
      const hasAuth = src.includes("getSessionUser") || src.includes("requireAuth") || src.includes("getSession")
      expect(hasAuth).toBe(true)
    })
  }

  it("dealer layout enforces DEALER or DEALER_USER role", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/layout.tsx"), "utf-8")
    expect(src).toContain("DEALER")
    expect(src).toContain("DEALER_USER")
    expect(src).toContain("redirect")
  })

  it("dealer layout requires email verification", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/layout.tsx"), "utf-8")
    expect(src).toContain("requireEmailVerification")
  })
})

// ─── I. Navigation Coverage — All Sidebar Links Point to Existing Pages ────

describe("I. Navigation — Sidebar Link Coverage", () => {
  const NAV_LINKS = [
    { href: "/dealer/dashboard", label: "Dashboard" },
    { href: "/dealer/requests", label: "Buyer Requests" },
    { href: "/dealer/auctions", label: "Auctions" },
    { href: "/dealer/auctions/invited", label: "Invited Auctions" },
    { href: "/dealer/opportunities", label: "Sourcing Opportunities" },
    { href: "/dealer/auctions/offers", label: "Offers Submitted" },
    { href: "/dealer/deals", label: "My Deals" },
    { href: "/dealer/inventory", label: "Inventory" },
    { href: "/dealer/contracts", label: "Contracts & Contract Shield" },
    { href: "/dealer/documents", label: "Documents" },
    { href: "/dealer/payments", label: "Payments & Fees" },
    { href: "/dealer/messages", label: "Messages" },
    { href: "/dealer/pickups", label: "Pickups" },
    { href: "/dealer/settings", label: "Dealer Settings" },
  ]

  for (const { href, label } of NAV_LINKS) {
    it(`sidebar link "${label}" (${href}) has a corresponding page.tsx`, () => {
      const pagePath = resolve(ROOT, `app${href}/page.tsx`)
      expect(existsSync(pagePath)).toBe(true)
    })
  }

  it("layout.tsx defines all expected nav items", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/layout.tsx"), "utf-8")
    for (const { href } of NAV_LINKS) {
      expect(src).toContain(href)
    }
  })
})

// ─── J. CSRF Protection on Mutations ───────────────────────────────────────

describe("J. CSRF Protection — Mutation Pages", () => {
  const MUTATION_PAGES = [
    "app/dealer/inventory/add/page.tsx",
    "app/dealer/inventory/page.tsx",
    "app/dealer/inventory/[id]/edit/page.tsx",
    "app/dealer/inventory/bulk-upload/page.tsx",
    "app/dealer/apply/page.tsx",
    "app/dealer/auctions/[id]/page.tsx",
    "app/dealer/onboarding/page.tsx",
    "app/dealer/settings/page.tsx",
    "app/dealer/profile/page.tsx",
    "app/dealer/contracts/page.tsx",
    "app/dealer/contracts/[id]/page.tsx",
    "app/dealer/documents/page.tsx",
    "app/dealer/messages/new/page.tsx",
    "app/dealer/messages/[threadId]/page.tsx",
    "app/dealer/offers/new/page.tsx",
    "app/dealer/payments/page.tsx",
    "app/dealer/pickups/page.tsx",
  ]

  for (const page of MUTATION_PAGES) {
    it(`${page} imports csrfHeaders`, () => {
      const src = readFileSync(resolve(ROOT, page), "utf-8")
      const hasCsrf = src.includes("csrfHeaders") || src.includes("getCsrfToken")
      expect(hasCsrf).toBe(true)
    })
  }
})

// ─── K. Service Role Scanner ───────────────────────────────────────────────

describe("K. Security — No Service Role in Portal Routes", () => {
  const DEALER_API_ROUTES = [
    "app/api/dealer/dashboard/route.ts",
    "app/api/dealer/settings/route.ts",
    "app/api/dealer/profile/route.ts",
    "app/api/dealer/onboarding/route.ts",
    "app/api/dealer/auctions/route.ts",
    "app/api/dealer/inventory/route.ts",
    "app/api/dealer/inventory/[id]/route.ts",
    "app/api/dealer/deals/route.ts",
    "app/api/dealer/contracts/route.ts",
    "app/api/dealer/documents/route.ts",
    "app/api/dealer/payments/route.ts",
    "app/api/dealer/messages/route.ts",
    "app/api/dealer/pickups/route.ts",
    "app/api/dealer/opportunities/route.ts",
    "app/api/dealer/requests/route.ts",
  ]

  for (const route of DEALER_API_ROUTES) {
    it(`${route} does not use createAdminClient`, () => {
      const src = readFileSync(resolve(ROOT, route), "utf-8")
      expect(src).not.toContain("createAdminClient")
    })
  }
})

// ─── L. Remediation Verification ───────────────────────────────────────────

const DEFECT_BACKLOG = [
  {
    id: "DEF-D001",
    severity: "P0",
    description: "Inventory search filter uses item.vehicle (undefined property)",
    file: "app/dealer/inventory/page.tsx",
    status: "FIXED",
    verify: (src: string) => !src.includes("item.vehicle") && src.includes("item.make?"),
  },
  {
    id: "DEF-D002",
    severity: "P0",
    description: "Inventory detail page does not exist (dead View Details button)",
    file: "app/dealer/inventory/[id]/page.tsx",
    status: "FIXED",
    verify: (_src: string) => existsSync(resolve(ROOT, "app/dealer/inventory/[id]/page.tsx")),
  },
  {
    id: "DEF-D003",
    severity: "P0",
    description: "Inventory edit page does not exist (dead Edit button)",
    file: "app/dealer/inventory/[id]/edit/page.tsx",
    status: "FIXED",
    verify: (_src: string) => existsSync(resolve(ROOT, "app/dealer/inventory/[id]/edit/page.tsx")),
  },
  {
    id: "DEF-D004",
    severity: "P0",
    description: "Inventory API [id] GET handler missing",
    file: "app/api/dealer/inventory/[id]/route.ts",
    status: "FIXED",
    verify: (src: string) => /export\s+async\s+function\s+GET/.test(src),
  },
  {
    id: "DEF-D005",
    severity: "P1",
    description: "Leads search input unbound (no value/onChange)",
    file: "app/dealer/leads/page.tsx",
    status: "FIXED",
    verify: (src: string) => src.includes("value={search}") && src.includes("setSearch"),
  },
  {
    id: "DEF-D006",
    severity: "P1",
    description: "Offers search input unbound (no value/onChange)",
    file: "app/dealer/offers/page.tsx",
    status: "FIXED",
    verify: (src: string) => src.includes("value={search}") && src.includes("setSearch"),
  },
  {
    id: "DEF-D007",
    severity: "P1",
    description: "Apply page empty catch blocks — errors silently swallowed",
    file: "app/dealer/apply/page.tsx",
    status: "FIXED",
    verify: (src: string) => src.includes("useToast") && src.includes("toast({"),
  },
  {
    id: "DEF-D008",
    severity: "P2",
    description: "Inventory loading.tsx returns null instead of skeleton",
    file: "app/dealer/inventory/loading.tsx",
    status: "FIXED",
    verify: (src: string) => !src.match(/return\s+null/) && src.includes("Skeleton"),
  },
]

describe("L. Defect Remediation Verification", () => {
  for (const defect of DEFECT_BACKLOG) {
    it(`${defect.id} (${defect.severity}): ${defect.description} — ${defect.status}`, () => {
      if (existsSync(resolve(ROOT, defect.file))) {
        const src = readFileSync(resolve(ROOT, defect.file), "utf-8")
        expect(defect.verify(src)).toBe(true)
      } else {
        // If the file doesn't exist and the defect was about creating it, verify differently
        expect(defect.verify("")).toBe(true)
      }
    })
  }
})

// ─── M. Dynamic Export Guard ───────────────────────────────────────────────

describe("M. Dynamic Export Guard — No use client + force-dynamic conflict", () => {
  const CLIENT_PAGES = EXPECTED_DEALER_PAGES.filter((p) =>
    existsSync(resolve(ROOT, p))
  )

  for (const page of CLIENT_PAGES) {
    it(`${page} does not combine "use client" with export const dynamic`, () => {
      const src = readFileSync(resolve(ROOT, page), "utf-8")
      if (src.includes('"use client"') || src.includes("'use client'")) {
        expect(src).not.toMatch(/export\s+const\s+dynamic\s*=/)
      }
    })
  }
})

// ─── N. Final Readiness Score ──────────────────────────────────────────────

describe("N. Final Readiness Score", () => {
  it("documents route completeness", () => {
    let existCount = 0
    for (const page of EXPECTED_DEALER_PAGES) {
      if (existsSync(resolve(ROOT, page))) existCount++
    }
    const score = Math.round((existCount / EXPECTED_DEALER_PAGES.length) * 100)
    // Score must be at least 95% (we expect all pages to exist)
    expect(score).toBeGreaterThanOrEqual(95)
  })

  it("documents API route completeness", () => {
    let existCount = 0
    for (const route of EXPECTED_API_ROUTES) {
      if (existsSync(resolve(ROOT, route))) existCount++
    }
    const score = Math.round((existCount / EXPECTED_API_ROUTES.length) * 100)
    expect(score).toBe(100)
  })

  it("all 8 defects are remediated", () => {
    let fixedCount = 0
    for (const defect of DEFECT_BACKLOG) {
      if (existsSync(resolve(ROOT, defect.file))) {
        const src = readFileSync(resolve(ROOT, defect.file), "utf-8")
        if (defect.verify(src)) fixedCount++
      } else if (defect.verify("")) {
        fixedCount++
      }
    }
    expect(fixedCount).toBe(DEFECT_BACKLOG.length)
  })
})
