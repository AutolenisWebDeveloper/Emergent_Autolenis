/**
 * Tests for NormalizedPrequal DTO contract, provider abstraction,
 * and consent/compliance model presence.
 *
 * These tests validate the structural integrity of the prequal integration
 * hardening program without requiring a running database.
 */
import { describe, it, expect } from "vitest"
import path from "path"
import fs from "fs"

const ROOT = path.resolve(__dirname, "..")

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf-8")
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath))
}

// ─── NormalizedPrequal DTO contract ────────────────────────────

describe("NormalizedPrequal DTO contract", () => {
  it("lib/dto/prequal.dto.ts exists", () => {
    expect(fileExists("lib/dto/prequal.dto.ts")).toBe(true)
  })

  it("exports normalizePrequal function", () => {
    const source = readSource("lib/dto/prequal.dto.ts")
    expect(source).toContain("export function normalizePrequal")
  })

  it("NormalizedPrequalResult type defined in lib/types/index.ts", () => {
    const types = readSource("lib/types/index.ts")
    expect(types).toContain("NormalizedPrequalResult")
  })

  it("NormalizedPrequalResult includes required fields", () => {
    const types = readSource("lib/types/index.ts")
    expect(types).toContain("status: string")
    expect(types).toContain("sourceType: string")
    expect(types).toContain("provider: string")
    expect(types).toContain("creditTier: string")
    expect(types).toContain("disclosuresAccepted")
    expect(types).toContain("forwardingAuthorized")
  })

  it("DTO normalizer defines status values locally", () => {
    const source = readSource("lib/dto/prequal.dto.ts")
    expect(source).toContain("PENDING")
    expect(source).toContain("ACTIVE")
    expect(source).toContain("EXPIRED")
    expect(source).toContain("REVOKED")
    expect(source).toContain("FAILED")
  })

  it("DTO normalizer defines source type values locally", () => {
    const source = readSource("lib/dto/prequal.dto.ts")
    expect(source).toContain("providerBacked")
    expect(source).toContain("manualExternal")
    expect(source).toContain("internalHeuristic")
  })

  it("DTO normalizer defines provider values locally", () => {
    const source = readSource("lib/dto/prequal.dto.ts")
    expect(source).toContain("MICROBILT_EXPERIAN")
    expect(source).toContain("IPREDICT")
    expect(source).toContain("MANUAL_EXTERNAL")
    expect(source).toContain("INTERNAL")
  })

  it("CreditTier type includes DECLINED", () => {
    const types = readSource("lib/types/index.ts")
    const creditTierLine = types.split("\n").find((l: string) => l.includes("export type CreditTier"))
    expect(creditTierLine).toBeDefined()
    expect(creditTierLine).toContain("DECLINED")
  })

  it("PreQualSource type includes MICROBILT and IPREDICT", () => {
    const types = readSource("lib/types/index.ts")
    const prequalSourceLine = types.split("\n").find((l: string) => l.includes("export type PreQualSource"))
    expect(prequalSourceLine).toBeDefined()
    expect(prequalSourceLine).toContain("MICROBILT")
    expect(prequalSourceLine).toContain("IPREDICT")
  })

  it("normalizer converts cents to dollars for display fields", () => {
    const source = readSource("lib/dto/prequal.dto.ts")
    expect(source).toContain("maxOtdAmountCents")
    expect(source).toContain("/ 100")
  })

  it("normalizer maps source to sourceType", () => {
    const source = readSource("lib/dto/prequal.dto.ts")
    expect(source).toContain("SOURCE_TYPE_MAP")
    expect(source).toContain("internalHeuristic")
    expect(source).toContain("manualExternal")
    expect(source).toContain("providerBacked")
  })
})

// ─── Provider abstraction contract ─────────────────────────────

describe("Provider abstraction contract", () => {
  it("prequal-provider.ts exists with interface", () => {
    expect(fileExists("lib/services/providers/prequal-provider.ts")).toBe(true)
    const source = readSource("lib/services/providers/prequal-provider.ts")
    expect(source).toContain("export interface PrequalProvider")
    expect(source).toContain("prequalify")
    expect(source).toContain("isAvailable")
    expect(source).toContain("providerName")
  })

  it("MicroBilt provider adapter exists", () => {
    expect(fileExists("lib/services/providers/microbilt-provider.ts")).toBe(true)
    const source = readSource("lib/services/providers/microbilt-provider.ts")
    expect(source).toContain("MicroBiltPrequalProvider")
    expect(source).toContain("implements PrequalProvider")
    expect(source).toContain("MICROBILT_EXPERIAN")
  })

  it("iPredict provider adapter exists", () => {
    expect(fileExists("lib/services/providers/ipredict-provider.ts")).toBe(true)
    const source = readSource("lib/services/providers/ipredict-provider.ts")
    expect(source).toContain("IPredictRiskProvider")
    expect(source).toContain("implements PrequalProvider")
    expect(source).toContain("IPREDICT")
  })

  it("providers require env vars to be available", () => {
    const microbilt = readSource("lib/services/providers/microbilt-provider.ts")
    const ipredict = readSource("lib/services/providers/ipredict-provider.ts")
    expect(microbilt).toContain("MICROBILT_API_KEY")
    expect(microbilt).toContain("MICROBILT_API_URL")
    expect(ipredict).toContain("IPREDICT_API_KEY")
    expect(ipredict).toContain("IPREDICT_API_URL")
  })

  it("provider registry functions exist", () => {
    const source = readSource("lib/services/providers/prequal-provider.ts")
    expect(source).toContain("export function registerProvider")
    expect(source).toContain("export function getProvider")
    expect(source).toContain("export function getAvailableProviders")
  })
})

// ─── Prisma schema consent/compliance models ───────────────────

describe("Prisma schema — consent and compliance models", () => {
  const schema = readSource("prisma/schema.prisma")

  it("PrequalConsentVersion model exists", () => {
    expect(schema).toContain("model PrequalConsentVersion")
    expect(schema).toContain("bodyText")
    expect(schema).toContain("effectiveAt")
  })

  it("PrequalConsentArtifact model exists with required fields", () => {
    expect(schema).toContain("model PrequalConsentArtifact")
    expect(schema).toContain("consentText")
    expect(schema).toContain("consentGiven")
    expect(schema).toContain("consentDate")
    expect(schema).toContain("fingerprintHash")
  })

  it("PrequalSession model exists", () => {
    expect(schema).toContain("model PrequalSession")
  })

  it("PrequalProviderEvent model exists", () => {
    expect(schema).toContain("model PrequalProviderEvent")
    expect(schema).toContain("requestPayload")
    expect(schema).toContain("responsePayload")
  })

  it("ConsumerAuthorizationArtifact model exists", () => {
    expect(schema).toContain("model ConsumerAuthorizationArtifact")
    expect(schema).toContain("authorizationType")
    expect(schema).toContain("authorizationText")
  })

  it("ConsentVersion model exists (non-prefixed consent store)", () => {
    expect(schema).toContain("model ConsentVersion")
    expect(schema).toContain("model ConsentArtifact")
  })

  it("PermissiblePurposeLog model exists", () => {
    expect(schema).toContain("model PermissiblePurposeLog")
    expect(schema).toContain("permissiblePurpose")
    expect(schema).toContain("providerName")
  })

  it("PreQualSource enum includes PROVIDER_BACKED", () => {
    expect(schema).toContain("PROVIDER_BACKED")
  })

  it("PrequalSession has workspaceId for tenant isolation", () => {
    // Set B PrequalSession model includes workspaceId
    const sessionBlock = schema.slice(
      schema.indexOf("model PrequalSession"),
      schema.indexOf("}", schema.indexOf("model PrequalSession")) + 1,
    )
    expect(sessionBlock).toContain("workspaceId")
  })

  it("PreQualification has consent artifact relations", () => {
    expect(schema).toContain("consentArtifactId")
    expect(schema).toContain("consumerAuthorizationArtifactId")
  })
})

// ─── Credit tier alignment ─────────────────────────────────────

describe("Credit tier alignment — service uses valid DB enum values", () => {
  const serviceSource = readSource("lib/services/prequal.service.ts")

  it("service does NOT use PRIME as a credit tier", () => {
    // Extract the scoring block between tier assignment and return
    const scoringBlock = serviceSource.slice(
      serviceSource.indexOf("// Determine credit tier"),
      serviceSource.indexOf("// Calculate max monthly payment"),
    )
    expect(scoringBlock).not.toContain('"PRIME"')
  })

  it("service does NOT use NEAR_PRIME as a credit tier", () => {
    const scoringBlock = serviceSource.slice(
      serviceSource.indexOf("// Determine credit tier"),
      serviceSource.indexOf("// Calculate max monthly payment"),
    )
    expect(scoringBlock).not.toContain('"NEAR_PRIME"')
  })

  it("service does NOT use SUBPRIME as a credit tier", () => {
    const scoringBlock = serviceSource.slice(
      serviceSource.indexOf("// Determine credit tier"),
      serviceSource.indexOf("// Calculate max monthly payment"),
    )
    expect(scoringBlock).not.toContain('"SUBPRIME"')
  })

  it("service uses GOOD instead of PRIME", () => {
    expect(serviceSource).toContain('creditTier = "GOOD"')
  })

  it("service uses FAIR instead of NEAR_PRIME", () => {
    expect(serviceSource).toContain('creditTier = "FAIR"')
  })

  it("service uses POOR instead of SUBPRIME", () => {
    expect(serviceSource).toContain('creditTier = "POOR"')
  })

  it("toValidCreditTier function validates against DB-aligned values", () => {
    expect(serviceSource).toContain("VALID_CREDIT_TIERS")
    expect(serviceSource).toContain('"DECLINED"')
  })
})

// ─── API route structure ───────────────────────────────────────

describe("PreQual API route structure", () => {
  it("buyer consent route exists", () => {
    expect(fileExists("app/api/buyer/prequal/consent/route.ts")).toBe(true)
  })

  it("buyer session route exists", () => {
    expect(fileExists("app/api/buyer/prequal/session/route.ts")).toBe(true)
  })

  it("buyer offers route exists", () => {
    expect(fileExists("app/api/buyer/prequal/offers/route.ts")).toBe(true)
  })

  it("buyer authorize-forwarding route exists", () => {
    expect(fileExists("app/api/buyer/prequal/authorize-forwarding/route.ts")).toBe(true)
  })

  it("admin consents route exists", () => {
    expect(fileExists("app/api/admin/prequal/consents/route.ts")).toBe(true)
  })

  it("admin prequal events route exists", () => {
    expect(fileExists("app/api/admin/prequal/[id]/events/route.ts")).toBe(true)
  })

  it("admin ux-version route exists", () => {
    expect(fileExists("app/api/admin/prequal/ux-version/route.ts")).toBe(true)
  })

  it("admin export route exists", () => {
    expect(fileExists("app/api/admin/prequal/export/route.ts")).toBe(true)
  })

  it("buyer consent route requires BUYER auth", () => {
    const source = readSource("app/api/buyer/prequal/consent/route.ts")
    expect(source).toContain('requireAuth(["BUYER"])')
  })

  it("buyer authorize-forwarding route uses Zod validation", () => {
    const source = readSource("app/api/buyer/prequal/authorize-forwarding/route.ts")
    expect(source).toContain("z.object")
    expect(source).toContain("safeParse")
  })

  it("admin routes require admin role", () => {
    const consents = readSource("app/api/admin/prequal/consents/route.ts")
    const events = readSource("app/api/admin/prequal/[id]/events/route.ts")
    const uxVersion = readSource("app/api/admin/prequal/ux-version/route.ts")
    const exportRoute = readSource("app/api/admin/prequal/export/route.ts")

    expect(consents).toContain("isAdminRole")
    expect(events).toContain("isAdminRole")
    expect(uxVersion).toContain("isAdminRole")
    expect(exportRoute).toContain("isAdminRole")
  })

  it("buyer offers route uses normalizePrequal from canonical DTO", () => {
    const source = readSource("app/api/buyer/prequal/offers/route.ts")
    expect(source).toContain('from "@/lib/dto/prequal.dto"')
    expect(source).toContain("normalizePrequal")
  })
})
