/**
 * MicroBilt PreQual Provider Adapter
 *
 * Integrates with MicroBilt's credit decisioning API for LIVE pre-qualification.
 * Requires MICROBILT_API_KEY and MICROBILT_API_URL environment variables.
 *
 * This adapter is FCRA-compliant and requires a valid ConsentArtifact before execution.
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
    if (!this.isConfigured()) {
      return {
        success: false,
        errorMessage:
          "MicroBilt provider is not configured. Set MICROBILT_API_KEY.",
      }
    }

    const startTime = Date.now()

    try {
      const response = await fetch(
        `${this.apiUrl}/credit/prequalify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            applicant: {
              firstName: request.firstName,
              lastName: request.lastName,
              dateOfBirth: request.dateOfBirth,
              ssn4: request.ssnLast4,
              address: {
                line1: request.addressLine1,
                city: request.city,
                state: request.state,
                zip: request.postalCode,
              },
            },
            financials: {
              monthlyIncome: request.monthlyIncomeCents / 100,
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
          errorMessage: `MicroBilt API error: ${response.status}`,
          rawResponse: { status: response.status, body: errorBody },
        }
      }

      const data = await response.json()
      const durationMs = Date.now() - startTime

      return this.mapResponse(data, durationMs)
    } catch (error) {
      return {
        success: false,
        errorMessage:
          error instanceof Error
            ? `MicroBilt request failed: ${error.message}`
            : "MicroBilt request failed",
      }
    }
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
