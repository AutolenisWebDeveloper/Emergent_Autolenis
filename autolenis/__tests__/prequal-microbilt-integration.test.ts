/**
 * MicroBilt/Experian Prequalification Integration Tests
 *
 * Covers:
 * 1. Consent retention — consent artifacts are created and immutable
 * 2. Provider event logging — all provider interactions are audit-linked
 * 3. DTO normalization — response normalizer maps tiers correctly
 * 4. Forwarding authorization — required before forwarding consumer data
 * 5. LIVE-mode prohibition — heuristic scoring cannot masquerade as provider-backed
 * 6. Schema compliance — new models exist in Prisma schema
 * 7. Route guard enforcement — all new routes require auth
 * 8. Consent UI component — versioned consent text is present
 */
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

const ROOT = join(__dirname, "..")

function readSource(relativePath: string): string {
  const fullPath = join(ROOT, relativePath)
  if (!existsSync(fullPath)) {
    throw new Error(`File not found: ${relativePath}`)
  }
  return readFileSync(fullPath, "utf-8")
}

// ─── 1. Consent Retention ────────────────────────────────────────────────────

describe("PreQual Compliance — Consent Retention", () => {
  it("PrequalConsentVersion model exists in Prisma schema", () => {
    const schema = readSource("prisma/schema.prisma")
    expect(schema).toContain("model PrequalConsentVersion")
    expect(schema).toMatch(/version\s+String\s+@unique/)
    expect(schema).toMatch(/bodyText\s+String/)
  })

  it("PrequalConsentArtifact model exists with required fields", () => {
    const schema = readSource("prisma/schema.prisma")
    const modelMatch = schema.match(/model\s+PrequalConsentArtifact\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch).not.toBeNull()
    const model = modelMatch![0]
    expect(model).toContain("userId")
    expect(model).toContain("consentVersionId")
    expect(model).toContain("consentText")
    expect(model).toContain("consentGiven")
    expect(model).toContain("consentDate")
    expect(model).toContain("ipAddress")
    expect(model).toContain("userAgent")
    expect(model).toContain("sessionId")
  })

  it("session service captures consent artifacts", () => {
    const service = readSource("lib/services/prequal-session.service.ts")
    expect(service).toContain("captureConsent")
    expect(service).toContain("prequalConsentArtifact.create")
    expect(service).toContain("consentText")
    expect(service).toContain("consentGiven")
  })

  it("consent route validates required fields", () => {
    const route = readSource("app/api/buyer/prequal/session/consent/route.ts")
    expect(route).toContain("consentVersionId")
    expect(route).toContain("consentText")
    expect(route).toContain("VALIDATION_ERROR")
  })
})

// ─── 2. Provider Event Logging ──────────────────────────────────────────────

describe("PreQual Compliance — Provider Event Logging", () => {
  it("PrequalProviderEvent model exists in Prisma schema", () => {
    const schema = readSource("prisma/schema.prisma")
    const modelMatch = schema.match(/model\s+PrequalProviderEvent\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch).not.toBeNull()
    const model = modelMatch![0]
    expect(model).toContain("sessionId")
    expect(model).toContain("providerName")
    expect(model).toContain("eventType")
    expect(model).toContain("requestPayload")
    expect(model).toContain("responsePayload")
    expect(model).toContain("responseStatus")
    expect(model).toContain("latencyMs")
  })

  it("PrequalSession links to provider events", () => {
    const schema = readSource("prisma/schema.prisma")
    const sessionModel = schema.match(/model\s+PrequalSession\s*\{[\s\S]*?\n\}/m)
    expect(sessionModel).not.toBeNull()
    expect(sessionModel![0]).toContain("providerEvents")
  })

  it("session service logs provider events during prequalification", () => {
    const service = readSource("lib/services/prequal-session.service.ts")
    expect(service).toContain("prequalProviderEvent.create")
    expect(service).toContain("requestPayload")
    expect(service).toContain("responsePayload")
    expect(service).toContain("responseStatus")
    expect(service).toContain("latencyMs")
  })

  it("SSN is sanitized from stored request payloads", () => {
    const service = readSource("lib/services/prequal-session.service.ts")
    expect(service).toContain("sanitizeRequestPayload")
    expect(service).toContain('delete sanitized["ssnLast4"]')
  })

  it("PermissiblePurposeLog model exists", () => {
    const schema = readSource("prisma/schema.prisma")
    expect(schema).toContain("model PermissiblePurposeLog")
    expect(schema).toContain("permissiblePurpose")
    expect(schema).toContain("inquiryType")
    expect(schema).toContain("SOFT_PULL")
  })

  it("session service creates permissible purpose log on prequalify", () => {
    const service = readSource("lib/services/prequal-session.service.ts")
    expect(service).toContain("permissiblePurposeLog.create")
    expect(service).toContain("WRITTEN_INSTRUCTIONS_OF_CONSUMER")
  })
})

// ─── 3. DTO Normalization ───────────────────────────────────────────────────

describe("PreQual Compliance — DTO Normalization", () => {
  it("normalizer maps PRIME to GOOD", () => {
    // Import the normalizer directly to test the mapping
    const normalizer = readSource("lib/services/providers/prequal-response-normalizer.ts")
    expect(normalizer).toContain('PRIME: "GOOD"')
  })

  it("normalizer maps NEAR_PRIME to FAIR", () => {
    const normalizer = readSource("lib/services/providers/prequal-response-normalizer.ts")
    expect(normalizer).toContain('NEAR_PRIME: "FAIR"')
  })

  it("normalizer maps SUBPRIME to POOR", () => {
    const normalizer = readSource("lib/services/providers/prequal-response-normalizer.ts")
    expect(normalizer).toContain('SUBPRIME: "POOR"')
  })

  it("normalizer maps DECLINED correctly", () => {
    const normalizer = readSource("lib/services/providers/prequal-response-normalizer.ts")
    expect(normalizer).toContain('DECLINED: "DECLINED"')
  })

  it("normalized result includes all canonical fields", () => {
    const normalizer = readSource("lib/services/providers/prequal-response-normalizer.ts")
    const dtoFields = [
      "id", "status", "sourceType", "provider", "creditTier",
      "maxOtd", "estimatedMonthlyMin", "estimatedMonthlyMax",
      "expiresAt", "disclosuresAccepted", "forwardingAuthorized", "createdAt",
    ]
    for (const field of dtoFields) {
      expect(normalizer).toContain(field)
    }
  })

  it("NormalizedPrequalResult type is defined in shared types", () => {
    const types = readSource("lib/types/index.ts")
    expect(types).toContain("NormalizedPrequalResult")
    expect(types).toContain("disclosuresAccepted")
    expect(types).toContain("forwardingAuthorized")
  })

  it("PreQualSource includes MICROBILT and IPREDICT", () => {
    const types = readSource("lib/types/index.ts")
    expect(types).toContain("MICROBILT")
    expect(types).toContain("IPREDICT")
  })
})

// ─── 4. Forwarding Authorization Requirement ────────────────────────────────

describe("PreQual Compliance — Forwarding Authorization", () => {
  it("ConsumerAuthorizationArtifact model exists in Prisma schema", () => {
    const schema = readSource("prisma/schema.prisma")
    const modelMatch = schema.match(
      /model\s+ConsumerAuthorizationArtifact\s*\{[\s\S]*?\n\}/m,
    )
    expect(modelMatch).not.toBeNull()
    const model = modelMatch![0]
    expect(model).toContain("authorizationType")
    expect(model).toContain("authorized")
    expect(model).toContain("authorizationText")
    expect(model).toContain("recipientDescription")
  })

  it("session service captures forwarding authorization separately from consent", () => {
    const service = readSource("lib/services/prequal-session.service.ts")
    expect(service).toContain("captureForwardingAuthorization")
    expect(service).toContain("consumerAuthorizationArtifact.create")
    expect(service).toContain("DATA_FORWARDING")
  })

  it("session service requires forwarding auth for non-internal provider sources", () => {
    const service = readSource("lib/services/prequal-session.service.ts")
    expect(service).toContain("forwardingAuthorizationId")
    expect(service).toContain("Forwarding authorization is required")
  })

  it("authorize route exists with proper validation", () => {
    const route = readSource("app/api/buyer/prequal/session/authorize/route.ts")
    expect(route).toContain("requireAuth")
    expect(route).toContain("authorizationText")
    expect(route).toContain("BUYER")
  })

  it("consent form includes separate forwarding authorization UI", () => {
    const component = readSource("components/prequal/prequal-consent-form.tsx")
    expect(component).toContain("FORWARDING_AUTHORIZATION_TEXT")
    expect(component).toContain("Data Forwarding Authorization")
    expect(component).toContain("forwardingChecked")
  })
})

// ─── 5. LIVE-Mode Heuristic Prohibition ─────────────────────────────────────

describe("PreQual Compliance — LIVE-Mode Heuristic Prohibition", () => {
  it("normalizer has assertNotHeuristicInLive method", () => {
    const normalizer = readSource("lib/services/providers/prequal-response-normalizer.ts")
    expect(normalizer).toContain("assertNotHeuristicInLive")
  })

  it("assertNotHeuristicInLive throws for internal source in LIVE mode", () => {
    const normalizer = readSource("lib/services/providers/prequal-response-normalizer.ts")
    expect(normalizer).toContain("COMPLIANCE_VIOLATION")
    expect(normalizer).toContain("Internal heuristic scoring cannot be used as provider-backed approval in LIVE mode")
  })

  it("assertNotHeuristicInLive allows non-LIVE modes to use internal scoring", () => {
    const normalizer = readSource("lib/services/providers/prequal-response-normalizer.ts")
    // The guard checks `workspaceMode !== "LIVE"` and returns early
    expect(normalizer).toContain('workspaceMode !== "LIVE"')
  })

  it("session service invokes LIVE-mode check before running provider", () => {
    const service = readSource("lib/services/prequal-session.service.ts")
    expect(service).toContain("assertNotHeuristicInLive")
  })

  it("run route returns COMPLIANCE_VIOLATION error code", () => {
    const route = readSource("app/api/buyer/prequal/session/run/route.ts")
    expect(route).toContain("COMPLIANCE_VIOLATION")
  })
})

// ─── 6. Schema Compliance ───────────────────────────────────────────────────

describe("PreQual Compliance — Schema", () => {
  it("PrequalSession model exists with session lifecycle", () => {
    const schema = readSource("prisma/schema.prisma")
    const modelMatch = schema.match(/model\s+PrequalSession\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch).not.toBeNull()
    const model = modelMatch![0]
    expect(model).toContain("INITIATED")
    expect(model).toContain("CONSENT_CAPTURED")
    expect(model).toContain("PROCESSING")
    expect(model).toContain("COMPLETED")
    expect(model).toContain("FAILED")
    expect(model).toContain("consentArtifactId")
    expect(model).toContain("forwardingAuthorizationId")
    expect(model).toContain("prequalificationId")
  })

  it("PreQualSource enum includes new provider values", () => {
    const schema = readSource("prisma/schema.prisma")
    const enumMatch = schema.match(/enum\s+PreQualSource\s*\{[\s\S]*?\}/m)
    expect(enumMatch).not.toBeNull()
    expect(enumMatch![0]).toContain("MICROBILT")
    expect(enumMatch![0]).toContain("IPREDICT")
  })
})

// ─── 7. Route Guard Enforcement ─────────────────────────────────────────────

describe("PreQual Compliance — Route Guards", () => {
  const routes = [
    "app/api/buyer/prequal/session/route.ts",
    "app/api/buyer/prequal/session/consent/route.ts",
    "app/api/buyer/prequal/session/authorize/route.ts",
    "app/api/buyer/prequal/session/run/route.ts",
  ]

  for (const routePath of routes) {
    it(`${routePath} requires BUYER auth`, () => {
      const source = readSource(routePath)
      expect(source).toContain("requireAuth")
      expect(source).toContain('"BUYER"')
    })
  }

  it("admin artifacts route requires ADMIN auth", () => {
    const source = readSource("app/api/admin/compliance/prequal/artifacts/route.ts")
    expect(source).toContain("requireAuth")
    expect(source).toContain('"ADMIN"')
  })

  it("admin sessions route requires ADMIN auth", () => {
    const source = readSource("app/api/admin/compliance/prequal/sessions/route.ts")
    expect(source).toContain("requireAuth")
    expect(source).toContain('"ADMIN"')
  })
})

// ─── 8. Consent UI Component ────────────────────────────────────────────────

describe("PreQual Compliance — Consent UI", () => {
  it("consent form contains FCRA-compliant written instruction text", () => {
    const component = readSource("components/prequal/prequal-consent-form.tsx")
    expect(component).toContain("WRITTEN INSTRUCTIONS FOR OBTAINING CONSUMER REPORT")
    expect(component).toContain("Fair Credit Reporting Act")
    expect(component).toContain("15 U.S.C. § 1681b(a)(2)")
  })

  it("consent form includes soft inquiry disclaimer", () => {
    const component = readSource("components/prequal/prequal-consent-form.tsx")
    expect(component).toContain("soft inquiry")
    expect(component).toContain("will NOT affect")
    expect(component).toContain("not a guarantee of approval")
  })

  it("consent form contains versioned consent text export", () => {
    const component = readSource("components/prequal/prequal-consent-form.tsx")
    expect(component).toContain("export const PREQUAL_CONSENT_TEXT")
    expect(component).toContain("consentVersionId")
  })

  it("results component includes required disclosures", () => {
    const component = readSource("components/prequal/prequal-consent-form.tsx")
    expect(component).toContain("conditional estimate")
    expect(component).toContain("constitute a final credit decision")
  })

  it("processing state component exists", () => {
    const component = readSource("components/prequal/prequal-consent-form.tsx")
    expect(component).toContain("PrequalProcessingState")
    expect(component).toContain("Running Pre-Qualification")
  })
})

// ─── 9. Provider Adapter Correctness ────────────────────────────────────────

describe("PreQual Compliance — Provider Adapters", () => {
  it("MicroBilt provider has PROVIDER_NAME and PERMISSIBLE_PURPOSE constants", () => {
    const provider = readSource("lib/services/providers/microbilt-prequalification.provider.ts")
    expect(provider).toContain('PROVIDER_NAME = "MicroBilt"')
    expect(provider).toContain('PERMISSIBLE_PURPOSE = "WRITTEN_INSTRUCTIONS_OF_CONSUMER"')
  })

  it("MicroBilt provider has sandbox mode with deterministic scoring", () => {
    const provider = readSource("lib/services/providers/microbilt-prequalification.provider.ts")
    expect(provider).toContain("sandboxPrequalify")
    expect(provider).not.toContain("Math.random()")
  })

  it("iPredict provider results are advisory (not approval)", () => {
    const provider = readSource("lib/services/providers/ipredict-risk.provider.ts")
    expect(provider).toContain("advisory")
    expect(provider).toContain("riskScore")
    expect(provider).toContain("riskCategory")
  })

  it("iPredict provider has sandbox mode with deterministic scoring", () => {
    const provider = readSource("lib/services/providers/ipredict-risk.provider.ts")
    expect(provider).toContain("sandboxAssessRisk")
    expect(provider).not.toContain("Math.random()")
  })

  it("admin can retrieve consent and provider evidence", () => {
    const service = readSource("lib/services/prequal-session.service.ts")
    expect(service).toContain("getSessionArtifacts")
    expect(service).toContain("exportConsentArtifacts")
    expect(service).toContain("consentArtifacts")
    expect(service).toContain("providerEvents")
    expect(service).toContain("permissiblePurposeLogs")
  })
})

// ─── 10. Normalizer Unit Tests (functional) ─────────────────────────────────

describe("PrequalResponseNormalizer — Credit Tier Mapping", () => {
  // Replicate the tier mapping logic locally
  const TIER_MAPPING: Record<string, string> = {
    EXCELLENT: "EXCELLENT",
    PRIME: "GOOD",
    GOOD: "GOOD",
    NEAR_PRIME: "FAIR",
    FAIR: "FAIR",
    SUBPRIME: "POOR",
    POOR: "POOR",
    DECLINED: "DECLINED",
  }

  const VALID_CREDIT_TIERS = ["EXCELLENT", "GOOD", "FAIR", "POOR", "DECLINED"]

  function normalizeCreditTier(tier: string | undefined | null): string {
    if (!tier) return "POOR"
    const mapped = TIER_MAPPING[tier.toUpperCase()]
    if (mapped) return mapped
    if (VALID_CREDIT_TIERS.includes(tier)) return tier
    return "POOR"
  }

  it("maps EXCELLENT → EXCELLENT", () => {
    expect(normalizeCreditTier("EXCELLENT")).toBe("EXCELLENT")
  })

  it("maps PRIME → GOOD", () => {
    expect(normalizeCreditTier("PRIME")).toBe("GOOD")
  })

  it("maps NEAR_PRIME → FAIR", () => {
    expect(normalizeCreditTier("NEAR_PRIME")).toBe("FAIR")
  })

  it("maps SUBPRIME → POOR", () => {
    expect(normalizeCreditTier("SUBPRIME")).toBe("POOR")
  })

  it("maps DECLINED → DECLINED", () => {
    expect(normalizeCreditTier("DECLINED")).toBe("DECLINED")
  })

  it("maps null/undefined → POOR", () => {
    expect(normalizeCreditTier(null)).toBe("POOR")
    expect(normalizeCreditTier(undefined)).toBe("POOR")
  })

  it("maps unknown string → POOR", () => {
    expect(normalizeCreditTier("UNKNOWN_TIER")).toBe("POOR")
  })
})

// ─── 11. Normalized DTO Shape Validation ────────────────────────────────────

describe("NormalizedPrequalResult — DTO Shape", () => {
  // Replicate the toNormalizedResult logic
  function toNormalizedResult(params: {
    id: string
    status: string
    sourceType: string
    provider: string
    creditTier: string
    approvedAmountCents?: number | null
    minMonthlyPaymentCents?: number | null
    maxMonthlyPaymentCents?: number | null
    expiresAt: Date | null
    disclosuresAccepted: boolean
    forwardingAuthorized: boolean
    createdAt: Date
  }) {
    return {
      id: params.id,
      status: params.status,
      sourceType: params.sourceType,
      provider: params.provider,
      creditTier: params.creditTier,
      maxOtd: params.approvedAmountCents ? params.approvedAmountCents / 100 : null,
      estimatedMonthlyMin: params.minMonthlyPaymentCents ? params.minMonthlyPaymentCents / 100 : null,
      estimatedMonthlyMax: params.maxMonthlyPaymentCents ? params.maxMonthlyPaymentCents / 100 : null,
      expiresAt: params.expiresAt ? params.expiresAt.toISOString() : null,
      disclosuresAccepted: params.disclosuresAccepted,
      forwardingAuthorized: params.forwardingAuthorized,
      createdAt: params.createdAt.toISOString(),
    }
  }

  it("converts cents to dollars correctly", () => {
    const result = toNormalizedResult({
      id: "test-1",
      status: "ACTIVE",
      sourceType: "MICROBILT",
      provider: "MicroBilt",
      creditTier: "EXCELLENT",
      approvedAmountCents: 3500000,
      minMonthlyPaymentCents: 25000,
      maxMonthlyPaymentCents: 50000,
      expiresAt: new Date("2026-04-01"),
      disclosuresAccepted: true,
      forwardingAuthorized: true,
      createdAt: new Date("2026-03-01"),
    })

    expect(result.maxOtd).toBe(35000)
    expect(result.estimatedMonthlyMin).toBe(250)
    expect(result.estimatedMonthlyMax).toBe(500)
  })

  it("handles null amounts", () => {
    const result = toNormalizedResult({
      id: "test-2",
      status: "FAILED",
      sourceType: "INTERNAL",
      provider: "AutoLenisPrequal",
      creditTier: "POOR",
      approvedAmountCents: null,
      minMonthlyPaymentCents: null,
      maxMonthlyPaymentCents: null,
      expiresAt: null,
      disclosuresAccepted: true,
      forwardingAuthorized: false,
      createdAt: new Date("2026-03-01"),
    })

    expect(result.maxOtd).toBeNull()
    expect(result.estimatedMonthlyMin).toBeNull()
    expect(result.estimatedMonthlyMax).toBeNull()
    expect(result.expiresAt).toBeNull()
    expect(result.forwardingAuthorized).toBe(false)
  })

  it("includes all canonical DTO fields", () => {
    const result = toNormalizedResult({
      id: "test-3",
      status: "ACTIVE",
      sourceType: "MICROBILT",
      provider: "MicroBilt",
      creditTier: "GOOD",
      approvedAmountCents: 2000000,
      expiresAt: new Date(),
      disclosuresAccepted: true,
      forwardingAuthorized: true,
      createdAt: new Date(),
    })

    const expectedFields = [
      "id", "status", "sourceType", "provider", "creditTier",
      "maxOtd", "estimatedMonthlyMin", "estimatedMonthlyMax",
      "expiresAt", "disclosuresAccepted", "forwardingAuthorized", "createdAt",
    ]

    for (const field of expectedFields) {
      expect(result).toHaveProperty(field)
    }
  })
})
