/**
 * Consent Artifact & Forwarding Authorization Tests
 *
 * Validates:
 * 1. ConsentArtifact schema model exists in Prisma
 * 2. ConsentVersion schema model exists
 * 3. ForwardingAuthorization schema model exists
 * 4. ConsentArtifactService structure
 * 5. ForwardingAuthorizationService structure + enforcement
 * 6. Admin endpoints exist and require auth
 * 7. Immutable storage contract (no updatedAt on ConsentArtifact)
 */
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

const ROOT = join(__dirname, "..")

function readSource(path: string): string {
  return readFileSync(join(ROOT, path), "utf-8")
}

// ─── 1. Prisma Schema — ConsentArtifact ─────────────────────────────────────

describe("Prisma schema — ConsentArtifact", () => {
  const schema = readSource("prisma/schema.prisma")

  it("defines ConsentArtifact model", () => {
    expect(schema).toContain("model ConsentArtifact")
  })

  it("ConsentArtifact has userId field", () => {
    const modelMatch = schema.match(/model ConsentArtifact\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch).not.toBeNull()
    expect(modelMatch![0]).toContain("userId")
  })

  it("ConsentArtifact has consentVersionId field", () => {
    const modelMatch = schema.match(/model ConsentArtifact\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch![0]).toContain("consentVersionId")
  })

  it("ConsentArtifact has consentText field", () => {
    const modelMatch = schema.match(/model ConsentArtifact\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch![0]).toContain("consentText")
  })

  it("ConsentArtifact has preQualificationId field", () => {
    const modelMatch = schema.match(/model ConsentArtifact\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch![0]).toContain("preQualificationId")
  })

  it("ConsentArtifact is immutable (no updatedAt field)", () => {
    const modelMatch = schema.match(/model ConsentArtifact\s*\{[\s\S]*?\n\}/m)
    // Check that there's no actual updatedAt field declaration (with DateTime type)
    expect(modelMatch![0]).not.toMatch(/updatedAt\s+DateTime/)
  })

  it("ConsentArtifact captures IP and user agent", () => {
    const modelMatch = schema.match(/model ConsentArtifact\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch![0]).toContain("ipAddress")
    expect(modelMatch![0]).toContain("userAgent")
  })
})

// ─── 2. Prisma Schema — ConsentVersion ──────────────────────────────────────

describe("Prisma schema — ConsentVersion", () => {
  const schema = readSource("prisma/schema.prisma")

  it("defines ConsentVersion model", () => {
    expect(schema).toContain("model ConsentVersion")
  })

  it("ConsentVersion has version field (unique)", () => {
    const modelMatch = schema.match(/model ConsentVersion\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch).not.toBeNull()
    expect(modelMatch![0]).toContain("version")
    expect(modelMatch![0]).toContain("@unique")
  })

  it("ConsentVersion has bodyText field", () => {
    const modelMatch = schema.match(/model ConsentVersion\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch![0]).toContain("bodyText")
  })

  it("ConsentVersion has effectiveAt and retiredAt fields", () => {
    const modelMatch = schema.match(/model ConsentVersion\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch![0]).toContain("effectiveAt")
    expect(modelMatch![0]).toContain("retiredAt")
  })
})

// ─── 3. Prisma Schema — PreQualProviderEvent ────────────────────────────────

describe("Prisma schema — PreQualProviderEvent", () => {
  const schema = readSource("prisma/schema.prisma")

  it("defines PreQualProviderEvent model", () => {
    expect(schema).toContain("model PreQualProviderEvent")
  })

  it("PreQualProviderEvent has providerName field", () => {
    const modelMatch = schema.match(/model PreQualProviderEvent\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch).not.toBeNull()
    expect(modelMatch![0]).toContain("providerName")
  })

  it("PreQualProviderEvent has durationMs field", () => {
    const modelMatch = schema.match(/model PreQualProviderEvent\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch![0]).toContain("durationMs")
  })

  it("PreQualProviderEvent has requestPayload and responsePayload", () => {
    const modelMatch = schema.match(/model PreQualProviderEvent\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch![0]).toContain("requestPayload")
    expect(modelMatch![0]).toContain("responsePayload")
  })
})

// ─── 4. Prisma Schema — ForwardingAuthorization ─────────────────────────────

describe("Prisma schema — ForwardingAuthorization", () => {
  const schema = readSource("prisma/schema.prisma")

  it("defines ForwardingAuthorization model", () => {
    expect(schema).toContain("model ForwardingAuthorization")
  })

  it("ForwardingAuthorization has preQualificationId field", () => {
    const modelMatch = schema.match(/model ForwardingAuthorization\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch).not.toBeNull()
    expect(modelMatch![0]).toContain("preQualificationId")
  })

  it("ForwardingAuthorization has authorizedRecipientType field", () => {
    const modelMatch = schema.match(/model ForwardingAuthorization\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch![0]).toContain("authorizedRecipientType")
  })

  it("ForwardingAuthorization has revokedAt field", () => {
    const modelMatch = schema.match(/model ForwardingAuthorization\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch![0]).toContain("revokedAt")
  })

  it("ForwardingAuthorization has consentText field", () => {
    const modelMatch = schema.match(/model ForwardingAuthorization\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch![0]).toContain("consentText")
  })
})

// ─── 5. PreQualSource Enum ──────────────────────────────────────────────────

describe("Prisma schema — PreQualSource enum", () => {
  const schema = readSource("prisma/schema.prisma")

  it("includes MICROBILT source", () => {
    const enumMatch = schema.match(/enum PreQualSource\s*\{[\s\S]*?\n\}/m)
    expect(enumMatch).not.toBeNull()
    expect(enumMatch![0]).toContain("MICROBILT")
  })

  it("includes IPREDICT source", () => {
    const enumMatch = schema.match(/enum PreQualSource\s*\{[\s\S]*?\n\}/m)
    expect(enumMatch![0]).toContain("IPREDICT")
  })
})

// ─── 6. ConsentArtifactService ──────────────────────────────────────────────

describe("ConsentArtifactService — structure", () => {
  const serviceSrc = readSource("lib/services/prequal/consent-artifact.service.ts")

  it("exports ConsentArtifactService class", () => {
    expect(serviceSrc).toContain("export class ConsentArtifactService")
  })

  it("has getActiveConsentVersion method", () => {
    expect(serviceSrc).toContain("getActiveConsentVersion")
  })

  it("has createArtifact method", () => {
    expect(serviceSrc).toContain("createArtifact")
  })

  it("has linkToPreQualification method", () => {
    expect(serviceSrc).toContain("linkToPreQualification")
  })

  it("has getArtifactsForUser method", () => {
    expect(serviceSrc).toContain("getArtifactsForUser")
  })

  it("has listConsentVersions method (admin)", () => {
    expect(serviceSrc).toContain("listConsentVersions")
  })

  it("has createConsentVersion method (admin)", () => {
    expect(serviceSrc).toContain("createConsentVersion")
  })

  it("has retireConsentVersion method (admin)", () => {
    expect(serviceSrc).toContain("retireConsentVersion")
  })

  it("bootstraps default v1.0 consent version if none exists", () => {
    expect(serviceSrc).toContain('"v1.0"')
  })
})

// ─── 7. ForwardingAuthorizationService ──────────────────────────────────────

describe("ForwardingAuthorizationService — structure", () => {
  const serviceSrc = readSource(
    "lib/services/prequal/forwarding-authorization.service.ts",
  )

  it("exports ForwardingAuthorizationService class", () => {
    expect(serviceSrc).toContain("export class ForwardingAuthorizationService")
  })

  it("has createAuthorization method", () => {
    expect(serviceSrc).toContain("createAuthorization")
  })

  it("has checkAuthorization method", () => {
    expect(serviceSrc).toContain("checkAuthorization")
  })

  it("has assertForwardingAuthorized method", () => {
    expect(serviceSrc).toContain("assertForwardingAuthorized")
  })

  it("has revokeAuthorization method", () => {
    expect(serviceSrc).toContain("revokeAuthorization")
  })

  it("exports ForwardingNotAuthorizedError", () => {
    expect(serviceSrc).toContain("export class ForwardingNotAuthorizedError")
  })

  it("ForwardingNotAuthorizedError has statusCode 403", () => {
    expect(serviceSrc).toContain("statusCode = 403")
  })

  it("filters out revoked authorizations", () => {
    expect(serviceSrc).toContain("revokedAt: null")
  })
})

// ─── 8. Admin Endpoints ────────────────────────────────────────────────────

describe("Admin compliance endpoints — existence and auth", () => {
  const endpoints = [
    "app/api/admin/compliance/consent-artifacts/route.ts",
    "app/api/admin/compliance/consent-versions/route.ts",
    "app/api/admin/compliance/forwarding-authorizations/route.ts",
    "app/api/admin/compliance/audit-timeline/route.ts",
  ]

  for (const endpoint of endpoints) {
    it(`${endpoint} exists`, () => {
      expect(existsSync(join(ROOT, endpoint))).toBe(true)
    })

    it(`${endpoint} requires admin auth`, () => {
      const src = readSource(endpoint)
      expect(src).toContain("requireAuth")
      expect(src).toContain("ADMIN_ROLES")
    })

    it(`${endpoint} returns correlationId`, () => {
      const src = readSource(endpoint)
      expect(src).toContain("correlationId")
    })
  }
})

// ─── 9. TypeScript Types ────────────────────────────────────────────────────

describe("TypeScript types — PreQualSource", () => {
  const typesSrc = readSource("lib/types/index.ts")

  it("includes MICROBILT in PreQualSource type", () => {
    expect(typesSrc).toContain("MICROBILT")
  })

  it("includes IPREDICT in PreQualSource type", () => {
    expect(typesSrc).toContain("IPREDICT")
  })
})
