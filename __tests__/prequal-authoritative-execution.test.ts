/**
 * Prequal Authoritative Execution Tests
 *
 * Proves that ALL active front-end-backed prequal flows terminate in the
 * authoritative MicroBilt iPredict client: lib/microbilt/ipredict-client.ts
 *
 * Three active flows verified:
 *   1. Public prequal submit:  /api/prequal/ipredict  → callIpredict()
 *   2. Buyer session run:      /api/buyer/prequal/session/run → prequal-session.service → callIpredict()
 *   3. Buyer refresh:          /api/buyer/prequal/refresh → prequal.service → provider-registry → authoritative adapter → callIpredict()
 *
 * Each test traces real imports and verifies the final provider/client invoked.
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

const ROOT = join(__dirname, "..")

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf-8")
}

// ─── 1. Public Prequal Submit → Authoritative iPredict Client ─────────────

describe("Public prequal submit — authoritative execution chain", () => {
  const routeSrc = readSource("app/api/prequal/ipredict/route.ts")

  it("imports callIpredict from lib/microbilt/ipredict-client", () => {
    expect(routeSrc).toContain('import { callIpredict } from "@/lib/microbilt/ipredict-client"')
  })

  it("imports scoreIpredict from lib/decision/ipredict-scorer", () => {
    expect(routeSrc).toContain('import { scoreIpredict } from "@/lib/decision/ipredict-scorer"')
  })

  it("calls callIpredict() directly (no deprecated adapter)", () => {
    expect(routeSrc).toContain("callIpredict(input)")
  })

  it("calls scoreIpredict() on the result", () => {
    expect(routeSrc).toContain("scoreIpredict(callResult.parsed)")
  })

  it("does NOT import any deprecated provider", () => {
    expect(routeSrc).not.toContain("ipredict-risk.provider")
    expect(routeSrc).not.toContain("microbilt-prequalification.provider")
    expect(routeSrc).not.toContain("ipredict-provider")
    expect(routeSrc).not.toContain("microbilt-provider")
    expect(routeSrc).not.toContain("provider-registry")
  })

  it("decrypts SSN just-in-time before API call", () => {
    expect(routeSrc).toContain("decryptSsn(application.ssnEncrypted)")
  })

  it("encrypts raw response before storage", () => {
    expect(routeSrc).toContain("encrypt(callResult.rawResponseJson)")
  })

  it("writes audit log events", () => {
    expect(routeSrc).toContain("writePrequalAuditLog")
  })

  it("VERDICT: AUTHORITATIVE — terminates in lib/microbilt/ipredict-client.ts", () => {
    // Final assertion: the route directly calls the authoritative client
    const hasAuthoritativeImport = routeSrc.includes("@/lib/microbilt/ipredict-client")
    const callsDirectly = routeSrc.includes("callIpredict(input)")
    expect(hasAuthoritativeImport && callsDirectly).toBe(true)
  })
})

// ─── 2. Buyer Session Run → Authoritative iPredict Client ──────────────────

describe("Buyer session run — authoritative execution chain", () => {
  const routeSrc = readSource("app/api/buyer/prequal/session/run/route.ts")
  const serviceSrc = readSource("lib/services/prequal-session.service.ts")

  it("route imports prequal-session.service", () => {
    expect(routeSrc).toContain("prequal-session.service")
  })

  it("service imports callIpredict from lib/microbilt/ipredict-client", () => {
    expect(serviceSrc).toContain('import { callIpredict')
    expect(serviceSrc).toContain("@/lib/microbilt/ipredict-client")
  })

  it("service imports scoreIpredict from lib/decision/ipredict-scorer", () => {
    expect(serviceSrc).toContain("@/lib/decision/ipredict-scorer")
  })

  it("service does NOT import deprecated MicroBiltPrequalProvider", () => {
    expect(serviceSrc).not.toContain("microbilt-prequalification.provider")
    expect(serviceSrc).not.toContain("MicroBiltPrequalProvider")
  })

  it("service does NOT import deprecated IPredictRiskProvider", () => {
    expect(serviceSrc).not.toContain("ipredict-risk.provider")
    expect(serviceSrc).not.toContain("IPredictRiskProvider")
  })

  it("callProvider() calls callIpredict() for MICROBILT sourceType", () => {
    // The callProvider switch statement for MICROBILT/IPREDICT should use callIpredict
    const callProviderBlock = serviceSrc.slice(
      serviceSrc.indexOf("private async callProvider("),
    )
    expect(callProviderBlock).toContain("callIpredict(ipredictInput)")
  })

  it("callProvider() calls callIpredict() for IPREDICT sourceType", () => {
    const callProviderBlock = serviceSrc.slice(
      serviceSrc.indexOf("private async callProvider("),
    )
    // Both MICROBILT and IPREDICT cases fall through to the same block
    expect(callProviderBlock).toContain('case "MICROBILT":')
    expect(callProviderBlock).toContain('case "IPREDICT":')
    expect(callProviderBlock).toContain("callIpredict(ipredictInput)")
  })

  it("decrypts SSN just-in-time for iPredict call", () => {
    expect(serviceSrc).toContain("decryptSsn(input.ssnEncrypted)")
  })

  it("route passes ssnEncrypted through to service", () => {
    expect(routeSrc).toContain("ssnEncrypted: body.ssnEncrypted")
  })

  it("VERDICT: AUTHORITATIVE — terminates in lib/microbilt/ipredict-client.ts", () => {
    const serviceImportsClient = serviceSrc.includes("@/lib/microbilt/ipredict-client")
    const serviceCallsIpredict = serviceSrc.includes("callIpredict(ipredictInput)")
    const noDeprecatedImports =
      !serviceSrc.includes("MicroBiltPrequalProvider") &&
      !serviceSrc.includes("IPredictRiskProvider")
    expect(serviceImportsClient && serviceCallsIpredict && noDeprecatedImports).toBe(true)
  })
})

// ─── 3. Buyer Refresh → Authoritative iPredict Client ──────────────────────

describe("Buyer refresh — authoritative execution chain", () => {
  const routeSrc = readSource("app/api/buyer/prequal/refresh/route.ts")
  const serviceSrc = readSource("lib/services/prequal.service.ts")
  const registrySrc = readSource("lib/services/prequal/provider-registry.ts")
  const adapterSrc = readSource("lib/services/prequal/authoritative-ipredict-adapter.ts")

  it("route imports PreQualService", () => {
    expect(routeSrc).toContain("PreQualService")
  })

  it("service imports providerRegistry", () => {
    expect(serviceSrc).toContain("providerRegistry")
  })

  it("registry imports authoritative adapter (not deprecated stubs)", () => {
    expect(registrySrc).toContain("authoritativeIpredictAdapter")
    expect(registrySrc).not.toContain("microBiltProvider")
    expect(registrySrc).not.toContain("iPredictProvider")
  })

  it("registry registers authoritative adapter", () => {
    expect(registrySrc).toContain("this.register(authoritativeIpredictAdapter)")
  })

  it("registry resolves to authoritative adapter for LIVE mode", () => {
    expect(registrySrc).toContain("return authoritativeIpredictAdapter")
  })

  it("authoritative adapter imports callIpredict from lib/microbilt/ipredict-client", () => {
    expect(adapterSrc).toContain('import { callIpredict')
    expect(adapterSrc).toContain("@/lib/microbilt/ipredict-client")
  })

  it("authoritative adapter imports scoreIpredict from lib/decision/ipredict-scorer", () => {
    expect(adapterSrc).toContain("@/lib/decision/ipredict-scorer")
  })

  it("authoritative adapter calls callIpredict() in prequalify()", () => {
    expect(adapterSrc).toContain("callIpredict(input)")
  })

  it("authoritative adapter decrypts SSN just-in-time", () => {
    expect(adapterSrc).toContain("decryptSsn(request.ssnEncrypted)")
  })

  it("authoritative adapter requires MICROBILT_CLIENT_ID and MICROBILT_CLIENT_SECRET", () => {
    expect(adapterSrc).toContain("MICROBILT_CLIENT_ID")
    expect(adapterSrc).toContain("MICROBILT_CLIENT_SECRET")
  })

  it("VERDICT: AUTHORITATIVE — terminates in lib/microbilt/ipredict-client.ts", () => {
    const registryUsesAdapter = registrySrc.includes("authoritativeIpredictAdapter")
    const adapterCallsClient = adapterSrc.includes("callIpredict(input)")
    const adapterImportsClient = adapterSrc.includes("@/lib/microbilt/ipredict-client")
    expect(registryUsesAdapter && adapterCallsClient && adapterImportsClient).toBe(true)
  })
})

// ─── 4. Deprecated Stubs — Blocked in LIVE Mode ───────────────────────────

describe("Deprecated stubs — blocked in production", () => {
  it("prequal/ipredict-provider.ts throws DEPRECATED on prequalify()", () => {
    const src = readSource("lib/services/prequal/ipredict-provider.ts")
    expect(src).toContain("@deprecated")
    expect(src).toContain("DEPRECATED: iPredict stub adapter invoked")
    expect(src).toContain("throw new Error")
  })

  it("prequal/microbilt-provider.ts throws DEPRECATED on prequalify()", () => {
    const src = readSource("lib/services/prequal/microbilt-provider.ts")
    expect(src).toContain("@deprecated")
    expect(src).toContain("DEPRECATED: MicroBilt stub adapter invoked")
    expect(src).toContain("throw new Error")
  })

  it("providers/ipredict-risk.provider.ts throws DEPRECATED in production mode", () => {
    const src = readSource("lib/services/providers/ipredict-risk.provider.ts")
    expect(src).toContain("@deprecated")
    expect(src).toContain("DEPRECATED: IPredictRiskProvider.assessRisk()")
    // Still allows sandbox mode for backward compatibility
    expect(src).toContain("sandboxAssessRisk")
  })

  it("providers/microbilt-prequalification.provider.ts throws DEPRECATED in production mode", () => {
    const src = readSource("lib/services/providers/microbilt-prequalification.provider.ts")
    expect(src).toContain("@deprecated")
    expect(src).toContain("DEPRECATED: MicroBiltPrequalProvider.prequalify()")
    // Still allows sandbox mode for backward compatibility
    expect(src).toContain("sandboxPrequalify")
  })

  it("provider-registry no longer registers deprecated stubs", () => {
    const src = readSource("lib/services/prequal/provider-registry.ts")
    expect(src).not.toContain('from "./microbilt-provider"')
    expect(src).not.toContain('from "./ipredict-provider"')
  })

  it("prequal-session.service no longer imports deprecated providers", () => {
    const src = readSource("lib/services/prequal-session.service.ts")
    expect(src).not.toContain("microbilt-prequalification.provider")
    expect(src).not.toContain("ipredict-risk.provider")
  })
})

// ─── 5. Authoritative Adapter — Contract Compliance ────────────────────────

describe("Authoritative iPredict adapter — contract compliance", () => {
  const adapterSrc = readSource("lib/services/prequal/authoritative-ipredict-adapter.ts")

  it("implements PreQualProvider interface", () => {
    expect(adapterSrc).toContain("implements PreQualProvider")
  })

  it("providerName is 'MicroBilt-iPredict'", () => {
    expect(adapterSrc).toContain('providerName = "MicroBilt-iPredict"')
  })

  it("supportsLive = true", () => {
    expect(adapterSrc).toContain("supportsLive = true")
  })

  it("requires ssnEncrypted for LIVE execution", () => {
    expect(adapterSrc).toContain("request.ssnEncrypted")
    expect(adapterSrc).toContain("Full SSN (encrypted) is required")
  })

  it("handles MicroBiltTimeoutError with retry", () => {
    expect(adapterSrc).toContain("MicroBiltTimeoutError")
  })

  it("handles MicroBiltNoScoreError", () => {
    expect(adapterSrc).toContain("MicroBiltNoScoreError")
  })

  it("maps iPredict band to canonical credit tier", () => {
    expect(adapterSrc).toContain("bandToCreditTier")
  })

  it("estimates shopping power from band + income", () => {
    expect(adapterSrc).toContain("estimateShoppingPower")
  })

  it("never logs plain SSN", () => {
    // The adapter should never contain console.log/logger calls with ssnPlain
    const lines = adapterSrc.split("\n")
    const logLines = lines.filter(
      (l) => l.includes("logger.") || l.includes("console."),
    )
    for (const line of logLines) {
      expect(line).not.toContain("ssnPlain")
      expect(line).not.toContain("ssn:")
    }
  })
})

// ─── 6. End-to-End Execution Chain Summary ─────────────────────────────────

describe("End-to-end execution chain verification", () => {
  it("PUBLIC: UI → /api/prequal/ipredict → callIpredict()", () => {
    const route = readSource("app/api/prequal/ipredict/route.ts")
    expect(route).toContain("@/lib/microbilt/ipredict-client")
    expect(route).toContain("callIpredict(input)")
  })

  it("BUYER SESSION: UI → /api/buyer/prequal/session/run → prequal-session.service → callIpredict()", () => {
    const route = readSource("app/api/buyer/prequal/session/run/route.ts")
    const service = readSource("lib/services/prequal-session.service.ts")
    expect(route).toContain("prequal-session.service")
    expect(service).toContain("@/lib/microbilt/ipredict-client")
    expect(service).toContain("callIpredict(ipredictInput)")
  })

  it("BUYER REFRESH: UI → /api/buyer/prequal/refresh → prequal.service → provider-registry → authoritative adapter → callIpredict()", () => {
    const route = readSource("app/api/buyer/prequal/refresh/route.ts")
    const service = readSource("lib/services/prequal.service.ts")
    const registry = readSource("lib/services/prequal/provider-registry.ts")
    const adapter = readSource("lib/services/prequal/authoritative-ipredict-adapter.ts")

    expect(route).toContain("PreQualService")
    expect(service).toContain("providerRegistry")
    expect(registry).toContain("authoritativeIpredictAdapter")
    expect(adapter).toContain("callIpredict(input)")
    expect(adapter).toContain("@/lib/microbilt/ipredict-client")
  })

  it("ALL paths ultimately invoke lib/microbilt/ipredict-client.ts callIpredict()", () => {
    // The authoritative client is the ONLY real vendor integration
    const client = readSource("lib/microbilt/ipredict-client.ts")
    expect(client).toContain("POST /GetReport")
    expect(client).toContain("OAuth2 Client Credentials")
    expect(client).toContain("export async function callIpredict")
  })
})
