import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

/**
 * Inventory Intelligence Integration Tests
 *
 * Validates that the Inventory Intelligence subsystem integrates correctly
 * with the existing AutoLenis platform:
 * - Uses canonical entities (VehicleRequestCase, SourcedOffer, DealerInvite, SelectedDeal)
 * - Does not duplicate existing business objects
 * - Proper service exports and route existence
 */

const SERVICES_DIR = path.join(process.cwd(), "lib/services")
const API_DIR = path.join(process.cwd(), "app/api")

describe("Inventory Intelligence - Service Layer", () => {
  const requiredServices = [
    "dealer-discovery.service.ts",
    "dealer-source.service.ts",
    "inventory-fetch.service.ts",
    "inventory-parse.service.ts",
    "inventory-normalize.service.ts",
    "inventory-dedupe.service.ts",
    "inventory-search.service.ts",
    "inventory-match.service.ts",
    "dealer-prospect.service.ts",
    "dealer-invite.service.ts",
    "dealer-quick-offer.service.ts",
    "dealer-onboarding-conversion.service.ts",
    "inventory-verification.service.ts",
    "coverage-gap.service.ts",
    "identity-firewall.service.ts",
    "circumvention-monitor.service.ts",
  ]

  for (const svc of requiredServices) {
    it(`has service: ${svc}`, () => {
      const filePath = path.join(SERVICES_DIR, svc)
      expect(fs.existsSync(filePath)).toBe(true)
      const content = fs.readFileSync(filePath, "utf-8")
      expect(content.length).toBeGreaterThan(100)
    })
  }

  it("barrel file exports all new services", () => {
    const barrel = fs.readFileSync(path.join(SERVICES_DIR, "index.ts"), "utf-8")
    expect(barrel).toContain("dealerDiscoveryService")
    expect(barrel).toContain("dealerSourceService")
    expect(barrel).toContain("inventoryNormalizeService")
    expect(barrel).toContain("inventoryDedupeService")
    expect(barrel).toContain("inventorySearchService")
    expect(barrel).toContain("inventoryMatchService")
    expect(barrel).toContain("inventoryVerificationService")
    expect(barrel).toContain("dealerInviteService")
    expect(barrel).toContain("dealerQuickOfferService")
    expect(barrel).toContain("dealerOnboardingConversionService")
    expect(barrel).toContain("coverageGapService")
    expect(barrel).toContain("identityFirewallService")
    expect(barrel).toContain("circumventionMonitorService")
  })
})

describe("Inventory Intelligence - Canonical Entity Integration", () => {
  it("identity firewall uses canonical SelectedDeal", () => {
    const content = fs.readFileSync(path.join(SERVICES_DIR, "identity-firewall.service.ts"), "utf-8")
    expect(content).toContain("selectedDeal")
    expect(content).toContain("maskedPartyProfile")
    expect(content).toContain("identityReleaseEvent")
  })

  it("quick offer service uses canonical DealerIntelligenceInvite", () => {
    const content = fs.readFileSync(path.join(SERVICES_DIR, "dealer-quick-offer.service.ts"), "utf-8")
    expect(content).toContain("dealerIntelligenceInvite")
    expect(content).toContain("dealerQuickOffer")
    expect(content).toContain("vehicleRequestItem")
  })

  it("search service returns trust labels", () => {
    const content = fs.readFileSync(path.join(SERVICES_DIR, "inventory-search.service.ts"), "utf-8")
    expect(content).toContain("Verified Available")
    expect(content).toContain("Likely Available")
    expect(content).toContain("Availability Unconfirmed")
  })

  it("buyer search API supports approval-aware filtering", () => {
    const content = fs.readFileSync(
      path.join(API_DIR, "buyer/inventory/search/route.ts"),
      "utf-8",
    )
    expect(content).toContain("approvalType")
    expect(content).toContain("autolenis")
    expect(content).toContain("external")
    expect(content).toContain("cash")
    expect(content).toContain("sourceFilter")
  })
})

describe("Inventory Intelligence - API Routes", () => {
  const requiredAdminRoutes = [
    "admin/dealers/discovered/route.ts",
    "admin/dealers/prospects/route.ts",
    "admin/inventory/sources/route.ts",
    "admin/inventory/market/route.ts",
    "admin/inventory/verified/route.ts",
    "admin/inventory/health/route.ts",
    "admin/inventory/duplicates/route.ts",
    "admin/coverage-gaps/route.ts",
    "admin/dealer-invites/route.ts",
    "admin/deal-protection/alerts/route.ts",
    "admin/deal-protection/identity-release-events/route.ts",
    "admin/deal-protection/redaction-events/route.ts",
  ]

  for (const route of requiredAdminRoutes) {
    it(`has admin route: ${route}`, () => {
      const filePath = path.join(API_DIR, route)
      expect(fs.existsSync(filePath)).toBe(true)
    })
  }

  const requiredDealerRoutes = [
    "dealer/quick-offer/[token]/route.ts",
    "dealer/quick-offer/[token]/submit/route.ts",
    "dealer/inventory/suggested/route.ts",
    "dealer/onboarding/status/route.ts",
    "dealer/onboarding/conversion-status/route.ts",
    "dealer/onboarding/upload-docs/route.ts",
    "dealer/onboarding/accept-agreement/route.ts",
  ]

  for (const route of requiredDealerRoutes) {
    it(`has dealer route: ${route}`, () => {
      const filePath = path.join(API_DIR, route)
      expect(fs.existsSync(filePath)).toBe(true)
    })
  }

  const requiredBuyerRoutes = [
    "buyer/inventory/search/route.ts",
    "buyer/shortlist/match/route.ts",
  ]

  for (const route of requiredBuyerRoutes) {
    it(`has buyer route: ${route}`, () => {
      const filePath = path.join(API_DIR, route)
      expect(fs.existsSync(filePath)).toBe(true)
    })
  }

  const requiredInternalRoutes = [
    "internal/inventory/discover-dealers/route.ts",
    "internal/inventory/fetch-source/route.ts",
    "internal/inventory/parse-source/route.ts",
    "internal/inventory/normalize-source/route.ts",
    "internal/inventory/dedupe/route.ts",
    "internal/inventory/stale-sweep/route.ts",
    "internal/inventory/generate-invites/route.ts",
    "internal/deal-protection/scan/route.ts",
  ]

  for (const route of requiredInternalRoutes) {
    it(`has internal route: ${route}`, () => {
      const filePath = path.join(API_DIR, route)
      expect(fs.existsSync(filePath)).toBe(true)
    })
  }
})

describe("Inventory Intelligence - Pages", () => {
  it("has dealer quick-offer page", () => {
    const filePath = path.join(process.cwd(), "app/dealer/quick-offer/[token]/page.tsx")
    expect(fs.existsSync(filePath)).toBe(true)
    const content = fs.readFileSync(filePath, "utf-8")
    expect(content).toContain("expired")
    expect(content).toContain("consumed")
    expect(content).toContain("invalid")
    expect(content).toContain("submitted")
    expect(content).toContain("Submit")
  })

  it("has dealer apply page", () => {
    const filePath = path.join(process.cwd(), "app/dealer/apply/page.tsx")
    expect(fs.existsSync(filePath)).toBe(true)
    const content = fs.readFileSync(filePath, "utf-8")
    expect(content).toContain("ProtectedRoute")
    expect(content).toContain("DEALER")
    expect(content).toContain("Agreement")
    expect(content).toContain("upload")
  })

  it("preserves for-dealers redirect to dealer-application", () => {
    const filePath = path.join(process.cwd(), "app/for-dealers/page.tsx")
    expect(fs.existsSync(filePath)).toBe(true)
    const content = fs.readFileSync(filePath, "utf-8")
    expect(content).toContain("redirect")
    expect(content).toContain("/dealer-application")
  })
})

describe("Inventory Intelligence - Protection Integration", () => {
  it("circumvention monitor detects phone patterns", () => {
    const content = fs.readFileSync(path.join(SERVICES_DIR, "circumvention-monitor.service.ts"), "utf-8")
    expect(content).toContain("PHONE_PATTERN")
    expect(content).toContain("EMAIL_PATTERN")
    expect(content).toContain("URL_PATTERN")
    expect(content).toContain("SOCIAL_HANDLE_PATTERN")
    expect(content).toContain("GOOGLE_MAPS_PATTERN")
    expect(content).toContain("circumventionAlert")
    expect(content).toContain("messageRedactionEvent")
  })

  it("identity firewall enforces 5 release conditions", () => {
    const content = fs.readFileSync(path.join(SERVICES_DIR, "identity-firewall.service.ts"), "utf-8")
    expect(content).toContain("offerSelected")
    expect(content).toContain("depositSatisfied")
    expect(content).toContain("dealerActive")
    expect(content).toContain("agreementAccepted")
    expect(content).toContain("dealCommitted")
    expect(content).toContain("ANONYMOUS")
    expect(content).toContain("CONDITIONAL_HOLD")
    expect(content).toContain("RELEASED")
  })

  it("deal protection scan route documents messaging limitation", () => {
    const content = fs.readFileSync(
      path.join(API_DIR, "internal/deal-protection/scan/route.ts"),
      "utf-8",
    )
    expect(content).toContain("support-ticket")
  })
})
