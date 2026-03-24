/**
 * CI/Regression Gates Tests
 *
 * Validates that CI checks enforce:
 * 1. No LIVE/heuristic provider confusion
 * 2. No provider-backed prequal without consent artifact
 * 3. No forwarding without authorization artifact
 * 4. Schema contract checker includes new gates
 */
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

const ROOT = join(__dirname, "..")

function readSource(path: string): string {
  return readFileSync(join(ROOT, path), "utf-8")
}

// ─── 1. CI Check Script ────────────────────────────────────────────────────

describe("CI gates — schema contract checker", () => {
  const checkSrc = readSource("scripts/check-schema-contract.ts")

  it("includes LIVE/heuristic confusion check", () => {
    expect(checkSrc).toContain("checkLiveHeuristicConfusion")
  })

  it("includes consent artifact requirement check", () => {
    expect(checkSrc).toContain("checkConsentArtifactRequirement")
  })

  it("includes forwarding authorization requirement check", () => {
    expect(checkSrc).toContain("checkForwardingAuthorizationRequirement")
  })

  it("calls all new checks in main()", () => {
    // main() should invoke all three new checks
    const mainFn = checkSrc.slice(checkSrc.indexOf("function main"))
    expect(mainFn).toContain("checkLiveHeuristicConfusion")
    expect(mainFn).toContain("checkConsentArtifactRequirement")
    expect(mainFn).toContain("checkForwardingAuthorizationRequirement")
  })
})

// ─── 2. LIVE/Heuristic Confusion Gate ───────────────────────────────────────

describe("CI gates — LIVE/heuristic confusion", () => {
  it("prequal route files do NOT call InternalPreQualProvider.prequalify directly", () => {
    const routeDir = join(ROOT, "app/api/buyer/prequal")
    const routeFiles = [
      "route.ts",
      "start/route.ts",
      "refresh/route.ts",
    ]

    for (const file of routeFiles) {
      const fullPath = join(routeDir, file)
      if (!existsSync(fullPath)) continue

      const content = readFileSync(fullPath, "utf-8")
      expect(content).not.toContain("InternalPreQualProvider.prequalify")
    }
  })

  it("internal provider sets supportsLive = false", () => {
    const src = readSource("lib/services/prequal/internal-provider.ts")
    expect(src).toContain("supportsLive = false")
  })

  it("provider registry rejects internal provider for LIVE workspaces", () => {
    const src = readSource("lib/services/prequal/provider-registry.ts")
    // The resolve() method returns internalProvider only when !isLive
    expect(src).toContain("const isLive = workspaceMode === \"LIVE\"")
  })
})

// ─── 3. Consent Artifact Requirement Gate ───────────────────────────────────

describe("CI gates — consent artifact requirement", () => {
  it("prequal service imports consent artifact service", () => {
    const src = readSource("lib/services/prequal.service.ts")
    expect(src).toContain("consentArtifactService")
  })

  it("prequal service creates artifact before provider call", () => {
    const src = readSource("lib/services/prequal.service.ts")
    const createIdx = src.indexOf("consentArtifactService.createArtifact")
    const providerIdx = src.indexOf("provider.prequalify(requestPayload")
    expect(createIdx).toBeGreaterThan(-1)
    expect(providerIdx).toBeGreaterThan(-1)
    expect(createIdx).toBeLessThan(providerIdx)
  })

  it("prequal service links artifact to prequal after creation", () => {
    const src = readSource("lib/services/prequal.service.ts")
    expect(src).toContain("consentArtifactService.linkToPreQualification")
  })
})

// ─── 4. Forwarding Authorization Gate ───────────────────────────────────────

describe("CI gates — forwarding authorization", () => {
  it("forwarding authorization service exists", () => {
    expect(
      existsSync(
        join(ROOT, "lib/services/prequal/forwarding-authorization.service.ts"),
      ),
    ).toBe(true)
  })

  it("forwarding authorization service has enforcement method", () => {
    const src = readSource(
      "lib/services/prequal/forwarding-authorization.service.ts",
    )
    expect(src).toContain("assertForwardingAuthorized")
  })

  it("ForwardingNotAuthorizedError throws 403", () => {
    const src = readSource(
      "lib/services/prequal/forwarding-authorization.service.ts",
    )
    expect(src).toContain("statusCode = 403")
    expect(src).toContain("FORWARDING_NOT_AUTHORIZED")
  })
})

// ─── 5. Provider Event Logging ──────────────────────────────────────────────

describe("CI gates — provider event logging", () => {
  it("PreQualProviderEvent model exists in Prisma schema", () => {
    const schema = readSource("prisma/schema.prisma")
    expect(schema).toContain("model PreQualProviderEvent")
  })

  it("prequal service logs via Prisma PreQualProviderEvent model", () => {
    const src = readSource("lib/services/prequal.service.ts")
    expect(src).toContain("prisma.preQualProviderEvent.create")
  })
})
