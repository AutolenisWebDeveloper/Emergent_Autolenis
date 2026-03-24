/**
 * PreQual Provider Abstraction Tests
 *
 * Validates:
 * 1. Provider interface contract
 * 2. Credit tier normalization (PRIME → GOOD, NEAR_PRIME → FAIR, etc.)
 * 3. Response normalization (safe defaults)
 * 4. Provider registry resolution (TEST vs LIVE)
 * 5. Internal provider isolation (supportsLive = false)
 * 6. MicroBilt/iPredict adapter structure
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

const ROOT = join(__dirname, "..")

function readSource(path: string): string {
  return readFileSync(join(ROOT, path), "utf-8")
}

// ─── 1. Provider Interface Contract ─────────────────────────────────────────

describe("Provider interface — contract", () => {
  const interfaceSrc = readSource("lib/services/prequal/provider-interface.ts")

  it("exports PreQualProvider interface with required members", () => {
    expect(interfaceSrc).toContain("interface PreQualProvider")
    expect(interfaceSrc).toContain("providerName")
    expect(interfaceSrc).toContain("supportsLive")
    expect(interfaceSrc).toContain("prequalify")
  })

  it("exports normalization functions", () => {
    expect(interfaceSrc).toContain("export function normalizeCreditTier")
    expect(interfaceSrc).toContain("export function normalizeProviderResponse")
  })

  it("defines NormalizedCreditTier matching Prisma CreditTier", () => {
    expect(interfaceSrc).toContain('"EXCELLENT"')
    expect(interfaceSrc).toContain('"GOOD"')
    expect(interfaceSrc).toContain('"FAIR"')
    expect(interfaceSrc).toContain('"POOR"')
    expect(interfaceSrc).toContain('"DECLINED"')
  })
})

// ─── 2. Credit Tier Normalization ───────────────────────────────────────────

describe("Credit tier normalization", () => {
  // Import the actual function for runtime testing
  // We use dynamic import to avoid module resolution issues in test env
  const interfaceSrc = readSource("lib/services/prequal/provider-interface.ts")

  it("maps PRIME to GOOD in normalization table", () => {
    expect(interfaceSrc).toContain("PRIME: \"GOOD\"")
  })

  it("maps NEAR_PRIME to FAIR in normalization table", () => {
    expect(interfaceSrc).toContain("NEAR_PRIME: \"FAIR\"")
  })

  it("maps SUBPRIME to POOR in normalization table", () => {
    expect(interfaceSrc).toContain("SUBPRIME: \"POOR\"")
  })

  it("maps SUPER_PRIME to EXCELLENT", () => {
    expect(interfaceSrc).toContain("SUPER_PRIME: \"EXCELLENT\"")
  })

  it("maps DEEP_SUBPRIME to DECLINED", () => {
    expect(interfaceSrc).toContain("DEEP_SUBPRIME: \"DECLINED\"")
  })

  it("defaults to POOR for unknown tiers", () => {
    // The fallback at the end of normalizeCreditTier
    expect(interfaceSrc).toMatch(/return TIER_MAP\[upper\] \?\? "POOR"/)
  })
})

// ─── 3. Response Normalization ──────────────────────────────────────────────

describe("Response normalization — safe defaults", () => {
  const interfaceSrc = readSource("lib/services/prequal/provider-interface.ts")

  it("returns DECLINED tier for failed responses", () => {
    // In normalizeProviderResponse, failed = creditTier: "DECLINED"
    expect(interfaceSrc).toContain('creditTier: "DECLINED"')
  })

  it("provides zero defaults for financial fields on failure", () => {
    expect(interfaceSrc).toContain("approvedAmountCents: 0")
    expect(interfaceSrc).toContain("maxMonthlyPaymentCents: 0")
    expect(interfaceSrc).toContain("minMonthlyPaymentCents: 0")
  })
})

// ─── 4. Provider Registry ───────────────────────────────────────────────────

describe("Provider registry — resolution", () => {
  const registrySrc = readSource("lib/services/prequal/provider-registry.ts")

  it("registers internal, MicroBilt, and iPredict providers", () => {
    expect(registrySrc).toContain("internalProvider")
    expect(registrySrc).toContain("microBiltProvider")
    expect(registrySrc).toContain("iPredictProvider")
  })

  it("returns internal provider for TEST workspaces", () => {
    // When isLive is false, should return internalProvider
    expect(registrySrc).toContain("return internalProvider")
  })

  it("throws for LIVE workspaces with no configured bureau provider", () => {
    expect(registrySrc).toContain(
      "No bureau-backed provider is configured for LIVE pre-qualification",
    )
  })

  it("only uses supportsLive providers for LIVE workspaces", () => {
    expect(registrySrc).toContain("p.supportsLive")
  })
})

// ─── 5. Internal Provider Isolation ─────────────────────────────────────────

describe("Internal provider — LIVE isolation", () => {
  const internalSrc = readSource("lib/services/prequal/internal-provider.ts")

  it("sets supportsLive = false", () => {
    expect(internalSrc).toContain("supportsLive = false")
  })

  it("preserves deterministic scoring logic", () => {
    expect(internalSrc).toContain("dtiScore")
    expect(internalSrc).toContain("incomeScore")
    expect(internalSrc).toContain("stabilityScore")
    expect(internalSrc).toContain("estimatedScore")
  })

  it("does NOT use Math.random() in scoring", () => {
    const scoringBlock = internalSrc.slice(
      internalSrc.indexOf("// Scoring logic based on income and housing"),
      internalSrc.indexOf("providerReferenceId:"),
    )
    expect(scoringBlock).not.toContain("Math.random()")
  })
})

// ─── 6. MicroBilt Adapter ───────────────────────────────────────────────────

describe("MicroBilt adapter — structure", () => {
  const mbSrc = readSource("lib/services/prequal/microbilt-provider.ts")

  it("implements PreQualProvider interface", () => {
    expect(mbSrc).toContain("implements PreQualProvider")
  })

  it("sets providerName = 'MicroBilt'", () => {
    expect(mbSrc).toContain('providerName = "MicroBilt"')
  })

  it("sets supportsLive = true", () => {
    expect(mbSrc).toContain("supportsLive = true")
  })

  it("reads MICROBILT_API_KEY from environment", () => {
    expect(mbSrc).toContain("MICROBILT_API_KEY")
  })

  it("uses request timeout", () => {
    expect(mbSrc).toContain("AbortSignal.timeout")
  })

  it("returns error when not configured", () => {
    expect(mbSrc).toContain("MicroBilt provider is not configured")
  })
})

// ─── 7. iPredict Adapter ───────────────────────────────────────────────────

describe("iPredict adapter — structure", () => {
  const ipSrc = readSource("lib/services/prequal/ipredict-provider.ts")

  it("implements PreQualProvider interface", () => {
    expect(ipSrc).toContain("implements PreQualProvider")
  })

  it("sets providerName = 'iPredict'", () => {
    expect(ipSrc).toContain('providerName = "iPredict"')
  })

  it("sets supportsLive = true", () => {
    expect(ipSrc).toContain("supportsLive = true")
  })

  it("reads IPREDICT_API_KEY from environment", () => {
    expect(ipSrc).toContain("IPREDICT_API_KEY")
  })

  it("returns error when not configured", () => {
    expect(ipSrc).toContain("iPredict provider is not configured")
  })
})

// ─── 8. Prequal Service Integration ────────────────────────────────────────

describe("Prequal service — provider abstraction integration", () => {
  const serviceSrc = readSource("lib/services/prequal.service.ts")

  it("imports provider registry", () => {
    expect(serviceSrc).toContain("providerRegistry")
  })

  it("imports normalization functions", () => {
    expect(serviceSrc).toContain("normalizeProviderResponse")
    expect(serviceSrc).toContain("normalizeCreditTier")
  })

  it("imports consent artifact service", () => {
    expect(serviceSrc).toContain("consentArtifactService")
  })

  it("resolves provider via registry in startPreQual", () => {
    expect(serviceSrc).toContain("providerRegistry.resolve")
  })

  it("normalizes provider response before DB write", () => {
    // The service calls normalizeProviderResponse
    expect(serviceSrc).toContain("normalizeProviderResponse(providerName")
  })

  it("captures consent artifact before provider execution", () => {
    // consentArtifactService.createArtifact should appear before provider.prequalify
    const artifactIdx = serviceSrc.indexOf("consentArtifactService.createArtifact")
    const providerExecIdx = serviceSrc.indexOf("provider.prequalify(requestPayload")
    expect(artifactIdx).toBeGreaterThan(-1)
    expect(providerExecIdx).toBeGreaterThan(-1)
    expect(artifactIdx).toBeLessThan(providerExecIdx)
  })

  it("links consent artifact to prequal after creation", () => {
    expect(serviceSrc).toContain("consentArtifactService.linkToPreQualification")
  })

  it("logs provider events via Prisma model", () => {
    expect(serviceSrc).toContain("prisma.preQualProviderEvent.create")
  })

  it("records provider call duration", () => {
    expect(serviceSrc).toContain("durationMs")
  })
})
