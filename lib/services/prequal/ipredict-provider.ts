/**
 * @deprecated — STUB ADAPTER with a fabricated API contract (`api.ipredict.com/v1/predict/qualify`).
 *
 * The AUTHORITATIVE iPredict integration is `lib/microbilt/ipredict-client.ts`,
 * which uses the real MicroBilt OAuth2 + POST /GetReport contract.
 *
 * This file is wired into `prequal/provider-registry.ts` → `prequal.service.ts`,
 * but its API contract is entirely fabricated and will never work against the real
 * MicroBilt endpoint. It should be replaced by an adapter that delegates to
 * `lib/microbilt/ipredict-client.ts`.
 *
 * Original description:
 * iPredict PreQual Provider Adapter. Integrates with iPredict's predictive credit
 * API for LIVE pre-qualification. Requires IPREDICT_API_KEY and IPREDICT_API_URL.
 */

import type {
  PreQualProvider,
  PreQualProviderRequest,
  PreQualProviderResponse,
} from "./provider-interface"

export class IPredictProvider implements PreQualProvider {
  readonly providerName = "iPredict"
  readonly supportsLive = true

  private get apiKey(): string | undefined {
    return process.env['IPREDICT_API_KEY']
  }

  private get apiUrl(): string {
    return (
      process.env['IPREDICT_API_URL'] ||
      "https://api.ipredict.com/v1"
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
      "DEPRECATED: iPredict stub adapter invoked. " +
        "Use the authoritative MicroBilt iPredict adapter (lib/services/prequal/authoritative-ipredict-adapter.ts) " +
        "which delegates to lib/microbilt/ipredict-client.ts.",
    )
  }

  /**
   * Maps iPredict API response to canonical PreQualProviderResponse.
   * The actual field mappings will be finalized during integration testing.
   */
  private mapResponse(
    data: Record<string, unknown>,
  ): PreQualProviderResponse {
    const result = data['result'] as
      | Record<string, unknown>
      | undefined
    if (!result) {
      return {
        success: false,
        errorMessage: "iPredict: no result in response",
        rawResponse: data,
      }
    }

    const qualified = result['qualified'] === true
    if (!qualified) {
      return {
        success: false,
        errorMessage:
          (result['declineReason'] as string) ||
          "iPredict: not qualified",
        rawResponse: data,
      }
    }

    return {
      success: true,
      creditTier: result['tier'] as string | undefined,
      approvedAmountCents: typeof result['approvedCents'] === "number"
        ? result['approvedCents']
        : undefined,
      maxMonthlyPaymentCents: typeof result['maxPaymentCents'] === "number"
        ? result['maxPaymentCents']
        : undefined,
      minMonthlyPaymentCents: typeof result['minPaymentCents'] === "number"
        ? result['minPaymentCents']
        : undefined,
      dtiRatio: typeof result['dtiRatio'] === "number"
        ? result['dtiRatio']
        : undefined,
      providerReferenceId: result['transactionId'] as
        | string
        | undefined,
      rawResponse: data,
    }
  }
}

// Singleton
export const iPredictProvider = new IPredictProvider()
