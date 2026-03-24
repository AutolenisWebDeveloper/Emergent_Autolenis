/**
 * Provider Registry
 *
 * Resolves which PreQualProvider to use based on workspace mode and configuration.
 *
 * Rules:
 * - LIVE workspaces MUST use a bureau-backed provider (MicroBilt or iPredict)
 * - TEST workspaces MAY use the internal heuristic provider
 * - Internal provider is NEVER used in LIVE mode (enforced)
 */

import type { WorkspaceMode } from "@/lib/types"
import type { PreQualProvider } from "./provider-interface"
import { internalProvider } from "./internal-provider"
import { microBiltProvider } from "./microbilt-provider"
import { iPredictProvider } from "./ipredict-provider"

export class ProviderRegistry {
  private readonly providers: Map<string, PreQualProvider> = new Map()

  constructor() {
    this.register(internalProvider)
    this.register(microBiltProvider)
    this.register(iPredictProvider)
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
   * LIVE: Returns the first configured bureau-backed provider.
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

    // LIVE — must use a bureau-backed provider
    const liveProviders = Array.from(this.providers.values()).filter(
      (p) => p.supportsLive,
    )

    // Find first configured provider
    for (const provider of liveProviders) {
      if (provider.isConfigured) {
        if (provider.isConfigured()) {
          return provider
        }
      }
    }

    // No configured LIVE provider — fail closed
    throw new Error(
      "No bureau-backed provider is configured for LIVE pre-qualification. " +
        "Set MICROBILT_API_KEY or IPREDICT_API_KEY.",
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
