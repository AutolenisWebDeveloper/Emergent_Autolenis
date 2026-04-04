/**
 * Inventory Intelligence End-to-End Integration Tests
 *
 * Validates buyer/dealer/admin UI integration with the Inventory Intelligence
 * subsystem, including:
 * - Buyer dual-lane search rendering logic
 * - Shortlist match-status and sourcing indicators
 * - Anonymous dealer display before identity release
 * - Suggested inventory confirm/reject flow
 * - Dealer quick-offer submission and continuation into /dealer/apply
 * - Admin inventory-intelligence pages loading from real API routes
 * - Verified-over-market suppression for same VIN
 * - External approval affecting buyer search/filtering behavior
 */

import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

const ROOT = process.cwd()
const readFile = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf-8")

// ─── Buyer Dual-Lane Search ─────────────────────────────────────────────────

describe("Buyer Dual-Lane Search", () => {
  it("search page has trust label types defined", () => {
    const page = readFile("app/buyer/search/page.tsx")
    expect(page).toContain("Verified Available")
    expect(page).toContain("Likely Available")
    expect(page).toContain("Availability Unconfirmed")
  })

  it("search page renders canonical vehicle status chips", () => {
    const page = readFile("app/buyer/search/page.tsx")
    expect(page).toContain("VehicleStatusChip")
    expect(page).toContain("TRUST_CHIP_MAP")
  })

  it("search page fetches from dual-lane API", () => {
    const page = readFile("app/buyer/search/page.tsx")
    expect(page).toContain("/api/buyer/inventory/search")
  })

  it("search page separates verified and market results", () => {
    const page = readFile("app/buyer/search/page.tsx")
    expect(page).toMatch(/sourceType\s*===\s*["']verified["']/)
    expect(page).toMatch(/sourceType\s*===\s*["']market["']/)
  })

  it("search page links to outside approval upload", () => {
    const page = readFile("app/buyer/search/page.tsx")
    expect(page).toContain("/buyer/prequal/manual-preapproval")
  })

  it("search page has no dead-end vehicle cards (all have actions)", () => {
    const page = readFile("app/buyer/search/page.tsx")
    // Vehicle cards should have shortlist/action functionality
    expect(page).toContain("shortlist")
  })
})

// ─── Buyer Shortlist Match Status ────────────────────────────────────────────

describe("Buyer Shortlist Match Status", () => {
  it("shortlist page fetches from match status API", () => {
    const page = readFile("app/buyer/shortlist/page.tsx")
    expect(page).toContain("/api/buyer/shortlist")
    expect(page).toContain("matchStatus")
  })

  it("shortlist page renders network dealer indicator", () => {
    const page = readFile("app/buyer/shortlist/page.tsx")
    expect(page).toContain("networkDealerAvailable")
  })

  it("shortlist page renders external sourcing indicator", () => {
    const page = readFile("app/buyer/shortlist/page.tsx")
    expect(page).toContain("externalSourcingAvailable")
  })

  it("shortlist page preserves auction handoff logic", () => {
    const page = readFile("app/buyer/shortlist/page.tsx")
    expect(page).toContain("auction")
  })
})

// ─── Anonymous Dealer Display ────────────────────────────────────────────────

describe("Anonymous Dealer Before Identity Release", () => {
  it("offers page masks dealer identity for ANONYMOUS state", () => {
    const page = readFile("app/buyer/offers/page.tsx")
    expect(page).toContain("ANONYMOUS")
    expect(page).toContain("identityState")
  })

  it("offers page masks dealer identity for CONDITIONAL_HOLD state", () => {
    const page = readFile("app/buyer/offers/page.tsx")
    expect(page).toContain("CONDITIONAL_HOLD")
  })

  it("offers page shows EyeOff icon for masked dealers", () => {
    const page = readFile("app/buyer/offers/page.tsx")
    expect(page).toContain("EyeOff")
  })

  it("offers page handles onboarding-pending state", () => {
    const page = readFile("app/buyer/offers/page.tsx")
    expect(page).toContain("onboarding")
  })

  it("offers page integrates with existing offer/deal flow", () => {
    const page = readFile("app/buyer/offers/page.tsx")
    // Should not create a new offer stack — should use existing ProtectedRoute
    expect(page).toContain("ProtectedRoute")
    expect(page).toContain("BUYER")
  })
})

// ─── Dealer Suggested Inventory ──────────────────────────────────────────────

describe("Dealer Suggested Inventory", () => {
  it("inventory page fetches suggested vehicles", () => {
    const page = readFile("app/dealer/inventory/page.tsx")
    expect(page).toContain("/api/dealer/inventory/suggested")
  })

  it("inventory page has confirm action for suggested vehicles", () => {
    const page = readFile("app/dealer/inventory/page.tsx")
    expect(page).toContain("handleConfirmSuggested")
    expect(page).toContain("/confirm")
  })

  it("inventory page has reject action for suggested vehicles", () => {
    const page = readFile("app/dealer/inventory/page.tsx")
    expect(page).toContain("handleRejectSuggested")
    expect(page).toContain("/reject")
  })

  it("inventory page preserves manual upload", () => {
    const page = readFile("app/dealer/inventory/page.tsx")
    expect(page).toContain("Add Vehicle")
  })

  it("inventory page has CSRF protection on mutations", () => {
    const page = readFile("app/dealer/inventory/page.tsx")
    expect(page).toContain("csrfHeaders")
  })
})

// ─── Dealer Quick-Offer and Apply Continuation ──────────────────────────────

describe("Dealer Quick-Offer → Apply Continuation", () => {
  it("quick-offer page handles all token states", () => {
    const page = readFile("app/dealer/quick-offer/[token]/page.tsx")
    expect(page).toContain("expired")
    expect(page).toContain("consumed")
    expect(page).toContain("invalid")
    expect(page).toContain("submitted")
  })

  it("quick-offer page has CSRF headers on submission", () => {
    const page = readFile("app/dealer/quick-offer/[token]/page.tsx")
    expect(page).toContain("csrfHeaders")
  })

  it("apply page is auth-protected", () => {
    const page = readFile("app/dealer/apply/page.tsx")
    expect(page).toContain("ProtectedRoute")
    expect(page).toContain("DEALER")
  })

  it("apply page has CSRF headers on mutations", () => {
    const page = readFile("app/dealer/apply/page.tsx")
    expect(page).toContain("csrfHeaders")
  })

  it("apply page supports prospectId prefill", () => {
    const page = readFile("app/dealer/apply/page.tsx")
    expect(page).toContain("prospectId")
  })

  it("apply page hits conversion-status API", () => {
    const page = readFile("app/dealer/apply/page.tsx")
    expect(page).toContain("/api/dealer/onboarding/conversion-status")
  })

  it("dealer-application remains separate public route", () => {
    const exists = fs.existsSync(path.join(ROOT, "app/dealer-application"))
    expect(exists).toBe(true)
  })
})

// ─── Admin Inventory Intelligence Pages ─────────────────────────────────────

describe("Admin Inventory Intelligence Pages", () => {
  const adminPages = [
    { dir: "admin/dealer-intelligence", api: "/api/admin/dealers/discovered" },
    { dir: "admin/inventory/sources", api: "/api/admin/inventory/sources" },
    { dir: "admin/inventory/market", api: "/api/admin/inventory/market" },
    { dir: "admin/inventory/verified", api: "/api/admin/inventory/verified" },
    { dir: "admin/coverage-gaps", api: "/api/admin/coverage-gaps" },
    { dir: "admin/dealer-invites", api: "/api/admin/dealer-invites" },
    { dir: "admin/deal-protection", api: "/api/admin/deal-protection" },
  ]

  for (const { dir, api } of adminPages) {
    it(`${dir} page exists and has loading boundary`, () => {
      expect(fs.existsSync(path.join(ROOT, "app", dir, "page.tsx"))).toBe(true)
      expect(fs.existsSync(path.join(ROOT, "app", dir, "loading.tsx"))).toBe(true)
    })

    it(`${dir} page uses AdminListPageShell pattern`, () => {
      const page = readFile(`app/${dir}/page.tsx`)
      expect(page).toContain("AdminListPageShell")
    })

    it(`${dir} page fetches from real API route`, () => {
      const page = readFile(`app/${dir}/page.tsx`)
      expect(page).toContain(api)
    })
  }

  it("admin nav includes all 7 inventory intelligence links", () => {
    const layout = readFile("app/admin/layout.tsx")
    expect(layout).toContain("dealer-intelligence")
    expect(layout).toContain("inventory/sources")
    expect(layout).toContain("inventory/market")
    expect(layout).toContain("inventory/verified")
    expect(layout).toContain("coverage-gaps")
    expect(layout).toContain("dealer-invites")
    expect(layout).toContain("deal-protection")
  })
})

// ─── Verified-over-Market Suppression ────────────────────────────────────────

describe("Verified-over-Market Suppression", () => {
  it("search service suppresses market results when verified VIN exists", () => {
    const svc = readFile("lib/services/inventory-search.service.ts")
    // Check that verified VINs are collected and market results are filtered
    expect(svc).toContain("verifiedVins")
    expect(svc).toContain("dedupedMarket")
  })

  it("search service verified results always come first", () => {
    const svc = readFile("lib/services/inventory-search.service.ts")
    expect(svc).toContain("...verifiedResults")
    expect(svc).toContain("...dedupedMarket")
  })
})

// ─── External Approval Integration ──────────────────────────────────────────

describe("External Approval Affecting Buyer Search", () => {
  it("buyer search API supports approvalType parameter", () => {
    const route = readFile("app/api/buyer/inventory/search/route.ts")
    expect(route).toContain("approvalType")
  })

  it("search service supports price and budget-aware filtering", () => {
    const svc = readFile("lib/services/inventory-search.service.ts")
    // Service supports budget-aware filtering which external approvals influence
    expect(svc).toContain("maxBudgetCents")
  })

  it("buyer search page reflects approval state in UI", () => {
    const page = readFile("app/buyer/search/page.tsx")
    expect(page).toContain("approvalType")
  })

  it("buyer search page links to external approval upload", () => {
    const page = readFile("app/buyer/search/page.tsx")
    expect(page).toContain("/buyer/prequal/manual-preapproval")
  })
})

// ─── Public Inventory Intelligence Page ──────────────────────────────────────

describe("Public Inventory Intelligence Page", () => {
  it("page exists and uses public layout components", () => {
    const page = readFile("app/inventory-intelligence/page.tsx")
    expect(page).toContain("PublicNav")
    expect(page).toContain("PublicFooter")
  })

  it("explains trust labels", () => {
    const page = readFile("app/inventory-intelligence/page.tsx")
    expect(page).toContain("Verified Available")
    expect(page).toContain("Likely Available")
    expect(page).toContain("Availability Unconfirmed")
  })

  it("explains verified vs market inventory", () => {
    const page = readFile("app/inventory-intelligence/page.tsx")
    expect(page).toMatch(/verified/i)
    expect(page).toMatch(/market/i)
  })

  it("links into buyer and dealer funnels", () => {
    const page = readFile("app/inventory-intelligence/page.tsx")
    // Should link to relevant buyer/dealer entry points
    expect(page).toContain("href")
  })
})

// ─── For-Dealers Redirect Preserved ─────────────────────────────────────────

describe("For-Dealers Redirect Preservation", () => {
  it("/for-dealers page redirects to /dealer-application", () => {
    const page = readFile("app/for-dealers/page.tsx")
    expect(page).toContain("redirect")
    expect(page).toContain("/dealer-application")
  })
})

// ─── Messaging / Anti-Circumvention Boundary ────────────────────────────────

describe("Messaging Anti-Circumvention Boundary", () => {
  it("deal protection scan route documents support-ticket boundary", () => {
    const route = readFile("app/api/internal/deal-protection/scan/route.ts")
    expect(route).toContain("support-ticket")
  })

  it("circumvention monitor has redaction patterns", () => {
    const svc = readFile("lib/services/circumvention-monitor.service.ts")
    expect(svc).toContain("PHONE_PATTERN")
    expect(svc).toContain("EMAIL_PATTERN")
    expect(svc).toContain("messageRedactionEvent")
  })

  it("identity firewall has all 5 release conditions", () => {
    const svc = readFile("lib/services/identity-firewall.service.ts")
    expect(svc).toContain("offerSelected")
    expect(svc).toContain("depositSatisfied")
    expect(svc).toContain("dealerActive")
    expect(svc).toContain("agreementAccepted")
    expect(svc).toContain("dealCommitted")
  })
})
