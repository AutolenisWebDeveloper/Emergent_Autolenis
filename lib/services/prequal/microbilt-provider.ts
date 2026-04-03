/**
 * @deprecated — STUB ADAPTER with a fabricated API contract (`api.microbilt.com/v1/credit/prequalify`).
 *
 * The AUTHORITATIVE MicroBilt integration is `lib/microbilt/ipredict-client.ts`,
 * which uses the real MicroBilt OAuth2 + POST /GetReport contract.
 *
 * This file is wired into `prequal/provider-registry.ts` → `prequal.service.ts`,
 * but its API contract is entirely fabricated and will never work against the real
 * MicroBilt endpoint. It should be replaced by an adapter that delegates to
 * `lib/microbilt/ipredict-client.ts`.
 *
 * Original description:
 * MicroBilt PreQual Provider Adapter. Integrates with MicroBilt's credit decisioning
 * API for LIVE pre-qualification. Requires MICROBILT_API_KEY and MICROBILT_API_URL.
 */

import type {
  PreQualProvider,
  PreQualProviderRequest,
  PreQualProviderResponse,
} from "./provider-interface"

export class MicroBiltProvider implements PreQualProvider {
  readonly providerName = "MicroBilt"
  readonly supportsLive = true

  private get apiKey(): string | undefined {
    return process.env['MICROBILT_API_KEY']
  }

  private get apiUrl(): string {
    return (
      process.env['MICROBILT_API_URL'] ||
      "https://api.microbilt.com/v1"
    )
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey)
  }

  async prequalify(
    request: PreQualProviderRequest,
  ): Promise<PreQualProviderResponse> {
    // LIVE-mode guard: This stub must never execute in production.
    // The authoritative path is lib/microbilt/ipredict-client.ts via
    // the AuthoritativeIpredictAdapter registered in provider-registry.ts.
    throw new Error(
      "DEPRECATED: MicroBilt stub adapter invoked. " +
        "Use the authoritative MicroBilt iPredict adapter (lib/services/prequal/authoritative-ipredict-adapter.ts) " +
        "which delegates to lib/microbilt/ipredict-client.ts.",
    )
  }

  /**
   * Maps MicroBilt API response to canonical PreQualProviderResponse.
   * The actual field mappings will be finalized during integration testing.
   */
  private mapResponse(
    data: Record<string, unknown>,
    _durationMs: number,
  ): PreQualProviderResponse {
    // MicroBilt response structure (representative — adjust to actual API docs)
    const decision = data['decision'] as
      | Record<string, unknown>
      | undefined
    if (!decision) {
      return {
        success: false,
        errorMessage: "MicroBilt: no decision in response",
        rawResponse: data,
      }
    }

    const approved = decision['approved'] === true
    if (!approved) {
      return {
        success: false,
        errorMessage:
          (decision['reason'] as string) || "MicroBilt: not approved",
        rawResponse: data,
      }
    }

    return {
      success: true,
      creditTier: decision['creditTier'] as string | undefined,
      approvedAmountCents: typeof decision['approvedAmountCents'] === "number"
        ? decision['approvedAmountCents']
        : undefined,
      maxMonthlyPaymentCents: typeof decision['maxMonthlyPaymentCents'] === "number"
        ? decision['maxMonthlyPaymentCents']
        : undefined,
      minMonthlyPaymentCents: typeof decision['minMonthlyPaymentCents'] === "number"
        ? decision['minMonthlyPaymentCents']
        : undefined,
      dtiRatio: typeof decision['dtiRatio'] === "number"
        ? decision['dtiRatio']
        : undefined,
      providerReferenceId: decision['referenceId'] as
        | string
        | undefined,
      rawResponse: data,
    }
  }
}

// Singleton
export const microBiltProvider = new MicroBiltProvider()
