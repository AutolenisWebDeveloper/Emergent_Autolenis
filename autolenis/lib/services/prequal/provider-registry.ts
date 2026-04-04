/**
 * Provider Registry
 *
 * Resolves which PreQualProvider to use based on workspace mode and configuration.
 *
 * Rules:
 * - LIVE workspaces MUST use the authoritative iPredict adapter (real MicroBilt API)
 * - TEST workspaces MAY use the internal heuristic provider
 * - Internal provider is NEVER used in LIVE mode (enforced)
 *
 * The authoritative adapter delegates to `lib/microbilt/ipredict-client.ts`
 * (OAuth2 + POST /GetReport). Deprecated stub adapters are no longer registered.
 */

import type { WorkspaceMode } from "@/lib/types"
import type { PreQualProvider } from "./provider-interface"
import { internalProvider } from "./internal-provider"
import { authoritativeIpredictAdapter } from "./authoritative-ipredict-adapter"

export class ProviderRegistry {
  private readonly providers: Map<string, PreQualProvider> = new Map()

  constructor() {
    this.register(internalProvider)
    this.register(authoritativeIpredictAdapter)
  }

  register(provider: PreQualProvider): void {
    this.providers.set(provider.providerName, provider)
  }

  getByName(name: string): PreQualProvider | undefined {
    return this.providers.get(name)
  }

  /**
   * Resolves the appropriate provider for the given workspace mode.
   *
   * LIVE: Returns the authoritative iPredict adapter (real MicroBilt API).
   * TEST: Returns the internal heuristic provider.
   *
   * Throws if no suitable provider is available.
   */
  resolve(
    workspaceMode?: WorkspaceMode | null,
  ): PreQualProvider {
    const isLive = workspaceMode === "LIVE"

    if (!isLive) {
      // TEST or undefined → internal provider is acceptable
      return internalProvider
    }

    // LIVE — must use the authoritative iPredict adapter
    if (authoritativeIpredictAdapter.isConfigured()) {
      return authoritativeIpredictAdapter
    }

    // No configured LIVE provider — fail closed
    throw new Error(
      "No bureau-backed provider is configured for LIVE pre-qualification. " +
        "Set MICROBILT_CLIENT_ID and MICROBILT_CLIENT_SECRET.",
    )
  }

  /**
   * Lists all registered providers and their configuration status.
   */
  listProviders(): Array<{
    name: string
    supportsLive: boolean
    configured: boolean
  }> {
    return Array.from(this.providers.values()).map((p) => ({
      name: p.providerName,
      supportsLive: p.supportsLive,
      configured: p.isConfigured ? p.isConfigured() : true,
    }))
  }
}

// Singleton
export const providerRegistry = new ProviderRegistry()
