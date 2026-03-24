/**
 * iPredict PreQual Provider Adapter
 *
 * Integrates with iPredict's predictive credit API for LIVE pre-qualification.
 * Requires IPREDICT_API_KEY and IPREDICT_API_URL environment variables.
 *
 * This adapter is FCRA-compliant and requires a valid ConsentArtifact before execution.
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
    if (!this.isConfigured()) {
      return {
        success: false,
        errorMessage:
          "iPredict provider is not configured. Set IPREDICT_API_KEY.",
      }
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/predict/qualify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this.apiKey!,
          },
          body: JSON.stringify({
            consumer: {
              name: {
                first: request.firstName,
                last: request.lastName,
              },
              dob: request.dateOfBirth,
              ssn4: request.ssnLast4,
              address: {
                street: request.addressLine1,
                city: request.city,
                state: request.state,
                postalCode: request.postalCode,
              },
            },
            income: {
              monthlyGross: request.monthlyIncomeCents / 100,
              monthlyHousing: request.monthlyHousingCents / 100,
            },
          }),
          signal: AbortSignal.timeout(30_000),
        },
      )

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "")
        return {
          success: false,
          errorMessage: `iPredict API error: ${response.status}`,
          rawResponse: { status: response.status, body: errorBody },
        }
      }

      const data = await response.json()

      return this.mapResponse(data)
    } catch (error) {
      return {
        success: false,
        errorMessage:
          error instanceof Error
            ? `iPredict request failed: ${error.message}`
            : "iPredict request failed",
      }
    }
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
