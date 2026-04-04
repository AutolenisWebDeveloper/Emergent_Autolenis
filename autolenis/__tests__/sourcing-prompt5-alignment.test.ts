import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

// ---------------------------------------------------------------------------
// Prompt 5 Alignment Regression Tests
//
// Ensures:
//   1. SOURCING_TABLES canonical mapping exists and covers all Prompt 5 objects
//   2. All sourcing route writes go through SourcingService (not raw Prisma)
//   3. Dashboard read-only queries use SOURCING_TABLES constants
//   4. No route handler bypasses the canonical service for sourcing mutations
//   5. Status route uses getCaseBuyerContact (not raw User lookup with buyerId)
//   6. Canonical views SQL file exists and covers all Prompt 5 objects
//   7. Sourcing service uses Prisma exclusively (no mixed Supabase writes)
// ---------------------------------------------------------------------------

const ROOT = join(__dirname, "..")

function readFile(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf-8")
}

describe("Prompt 5 Alignment — SOURCING_TABLES Canonical Mapping", () => {
  it("sourcing.service.ts exports SOURCING_TABLES with all Prompt 5 object mappings", () => {
    const content = readFile("lib/services/sourcing.service.ts")
    // Must export the SOURCING_TABLES constant
    expect(content).toContain("export const SOURCING_TABLES")
    // Must map all 6 canonical Prompt 5 objects
    expect(content).toContain("CASES:")
    expect(content).toContain('"VehicleRequestCase"')
    expect(content).toContain("DEALER_OUTREACH:")
    expect(content).toContain('"SourcingOutreachLog"')
    expect(content).toContain("OFFERS:")
    expect(content).toContain('"SourcedOffer"')
    expect(content).toContain("DEALER_INVITATIONS:")
    expect(content).toContain('"DealerInvite"')
    expect(content).toContain("COVERAGE_EVENTS:")
    expect(content).toContain('"DealerCoverageGapSignal"')
    expect(content).toContain("AUDIT_LOG:")
    expect(content).toContain('"CaseEventLog"')
  })

  it("sourcing.service.ts contains the Prompt 5 canonical mapping header", () => {
    const content = readFile("lib/services/sourcing.service.ts")
    expect(content).toContain("Prompt 5 Canonical Mapping")
    expect(content).toContain("sourcing_cases")
    expect(content).toContain("sourcing_dealer_outreach")
    expect(content).toContain("sourced_offers")
    expect(content).toContain("sourced_dealer_invitations")
    expect(content).toContain("network_coverage_events")
    expect(content).toContain("sourcing_audit_log")
    expect(content).toContain("sourcing_events_outbox")
    expect(content).toContain("log_coverage_from_request")
  })
})

describe("Prompt 5 Alignment — Dashboard Read Queries Use Canonical Constants", () => {
  it("buyer.service.ts imports SOURCING_TABLES and uses it for VehicleRequestCase queries", () => {
    const content = readFile("lib/services/buyer.service.ts")
    expect(content).toContain('import { SOURCING_TABLES }')
    expect(content).toContain("SOURCING_TABLES.CASES")
    // Must NOT use raw string "VehicleRequestCase" for Supabase .from() calls
    expect(content).not.toMatch(/\.from\(["']VehicleRequestCase["']\)/)
  })

  it("admin.service.ts imports SOURCING_TABLES and uses it for VehicleRequestCase queries", () => {
    const content = readFile("lib/services/admin.service.ts")
    expect(content).toContain('import { SOURCING_TABLES }')
    expect(content).toContain("SOURCING_TABLES.CASES")
    // Must NOT use raw string "VehicleRequestCase" for Supabase .from() calls
    expect(content).not.toMatch(/\.from\(["']VehicleRequestCase["']\)/)
  })
})

describe("Prompt 5 Alignment — Route Handlers Use SourcingService (No Direct Prisma)", () => {
  const SOURCING_ROUTES = [
    "app/api/dealer/opportunities/route.ts",
    "app/api/admin/sourcing/cases/[caseId]/status/route.ts",
    "app/api/admin/sourcing/cases/[caseId]/invite-dealer/route.ts",
    "app/api/admin/sourcing/cases/[caseId]/outreach/route.ts",
  ]

  for (const route of SOURCING_ROUTES) {
    it(`${route} must not import @/lib/db directly for sourcing mutations`, () => {
      const content = readFile(route)
      // Route should import sourcingService, not prisma directly for mutations
      expect(content).toContain("sourcingService")
      // Must not import prisma for direct VehicleRequestCase access
      const lines = content.split("\n")
      for (const line of lines) {
        // Allow import from sourcing.service.ts
        if (line.includes("sourcing.service")) continue
        // Allow comments
        if (line.trimStart().startsWith("//")) continue
        if (line.trimStart().startsWith("*")) continue
        // Must not contain direct prisma.vehicleRequestCase access
        expect(line).not.toMatch(/prisma\.vehicleRequestCase/)
      }
    })
  }
})

describe("Prompt 5 Alignment — Status Route Buyer Contact Resolution", () => {
  it("status/route.ts uses getCaseBuyerContact (not raw User lookup with buyerId)", () => {
    const content = readFile("app/api/admin/sourcing/cases/[caseId]/status/route.ts")
    // Must use the canonical service method
    expect(content).toContain("getCaseBuyerContact")
    // Must NOT look up User by buyerId (buyerId is BuyerProfile.id, not User.id)
    expect(content).not.toContain("prisma.user.findUnique")
    expect(content).not.toContain("where: { id: caseData.buyerId }")
  })
})

describe("Prompt 5 Alignment — Sourcing Service Has Required Methods", () => {
  it("SourcingService has getCaseBuyerContact method", () => {
    const content = readFile("lib/services/sourcing.service.ts")
    expect(content).toContain("async getCaseBuyerContact")
  })

  it("SourcingService has getOfferBuyerContact method", () => {
    const content = readFile("lib/services/sourcing.service.ts")
    expect(content).toContain("async getOfferBuyerContact")
  })

  it("SourcingService has listOpenCasesForDealer method", () => {
    const content = readFile("lib/services/sourcing.service.ts")
    expect(content).toContain("async listOpenCasesForDealer")
  })

  it("SourcingService has checkDealerCoverage (maps to log_coverage_from_request)", () => {
    const content = readFile("lib/services/sourcing.service.ts")
    expect(content).toContain("async checkDealerCoverage")
  })
})

describe("Prompt 5 Alignment — Dealer Opportunities Route", () => {
  it("dealer/opportunities/route.ts uses sourcingService.listOpenCasesForDealer", () => {
    const content = readFile("app/api/dealer/opportunities/route.ts")
    expect(content).toContain("sourcingService.listOpenCasesForDealer")
    // Must not directly import prisma
    expect(content).not.toContain('from "@/lib/db"')
  })
})

// ---------------------------------------------------------------------------
// Canonical Views SQL — Deployment Readiness
// ---------------------------------------------------------------------------

describe("Prompt 5 Alignment — Canonical Views SQL Exists", () => {
  it("scripts/sourcing-canonical-views.sql file exists", () => {
    const exists = existsSync(join(ROOT, "scripts/sourcing-canonical-views.sql"))
    expect(exists).toBe(true)
  })

  it("canonical views SQL covers all 6 Prompt 5 named objects", () => {
    const sql = readFile("scripts/sourcing-canonical-views.sql")
    expect(sql).toContain("public.sourcing_cases")
    expect(sql).toContain("public.sourcing_dealer_outreach")
    expect(sql).toContain("public.sourced_offers")
    expect(sql).toContain("public.sourced_dealer_invitations")
    expect(sql).toContain("public.network_coverage_events")
    expect(sql).toContain("public.sourcing_audit_log")
  })

  it("canonical views SQL maps to correct Prisma table names", () => {
    const sql = readFile("scripts/sourcing-canonical-views.sql")
    expect(sql).toContain('"VehicleRequestCase"')
    expect(sql).toContain('"SourcingOutreachLog"')
    expect(sql).toContain('"SourcedOffer"')
    expect(sql).toContain('"DealerInvite"')
    expect(sql).toContain('"DealerCoverageGapSignal"')
    expect(sql).toContain('"CaseEventLog"')
  })
})

// ---------------------------------------------------------------------------
// Service Boundary — Sourcing Service uses Prisma exclusively for mutations
// ---------------------------------------------------------------------------

describe("Prompt 5 Alignment — Sourcing Service Uses Prisma (Single Access Layer)", () => {
  it("sourcing.service.ts imports prisma from @/lib/db", () => {
    const content = readFile("lib/services/sourcing.service.ts")
    expect(content).toContain('import { prisma } from "@/lib/db"')
  })

  it("sourcing.service.ts does NOT use supabase for mutations", () => {
    const content = readFile("lib/services/sourcing.service.ts")
    // The sourcing service should not import the supabase client
    expect(content).not.toMatch(/import\s.*supabase.*from\s/)
    // No supabase.from() calls should exist (all access is via Prisma)
    expect(content).not.toMatch(/supabase\.from\(/)
    expect(content).not.toMatch(/supabase\.rpc\(/)
  })
})

// ---------------------------------------------------------------------------
// Alignment Document — Honest Integration Status
// ---------------------------------------------------------------------------

describe("Prompt 5 Alignment — Documentation Accuracy", () => {
  it("alignment doc exists at docs/SOURCING_PROMPT5_ALIGNMENT.md", () => {
    const exists = existsSync(join(ROOT, "docs/SOURCING_PROMPT5_ALIGNMENT.md"))
    expect(exists).toBe(true)
  })

  it("alignment doc reports honest integration status (not misleadingly 'fully aligned')", () => {
    const doc = readFile("docs/SOURCING_PROMPT5_ALIGNMENT.md")
    // Must contain honest integration status
    expect(doc).toContain("Indirectly integrated")
    // Must acknowledge named objects don't exist yet
    expect(doc).toContain("do not yet exist")
    // Must reference the canonical views SQL as deployment path
    expect(doc).toContain("sourcing-canonical-views.sql")
  })
})
