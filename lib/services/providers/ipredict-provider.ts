/**
 * iPredict Risk/Alternative Credit Provider adapter.
 *
 * Implements the PrequalProvider interface for MicroBilt's iPredict Advantage
 * alternative-credit predictive scoring product.
 *
 * iPredict provides:
 * - Identity verification outputs
 * - CVI and fraud scores
 * - Alternative credit score (300-850 range)
 * - Consumer stability indicators
 * - Inquiry/loan attributes
 * - 165+ data attributes for risk assessment
 *
 * NOTE: This is a production-ready adapter stub. The actual API integration
 * requires iPredict credentials (IPREDICT_API_KEY, IPREDICT_API_URL).
 */

import type {
  PrequalProvider,
  PrequalProviderRequest,
  PrequalProviderResponse,
} from "./prequal-provider"

export class IPredictRiskProvider implements PrequalProvider {
  readonly providerName = "IPREDICT"
  readonly displayName = "iPredict Advantage Alternative Credit"

  isAvailable(): boolean {
    return !!(
      process.env["IPREDICT_API_KEY"] &&
      process.env["IPREDICT_API_URL"]
    )
  }

  async prequalify(request: PrequalProviderRequest): Promise<PrequalProviderResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        errorMessage: "iPredict provider is not configured",
        errorCode: "PROVIDER_NOT_CONFIGURED",
      }
    }

    const apiKey = process.env["IPREDICT_API_KEY"]!
    const apiUrl = process.env["IPREDICT_API_URL"]!

    try {
      const payload = this.buildRequestPayload(request)

      const response = await fetch(`${apiUrl}/risk-assessment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      })

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "")
        return {
          success: false,
          errorMessage: `iPredict API returned ${response.status}`,
          errorCode: `HTTP_${response.status}`,
          rawResponse: errorBody,
        }
      }

      const data = await response.json()
      return this.normalizeResponse(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return {
        success: false,
        errorMessage: `iPredict provider error: ${message}`,
        errorCode: "PROVIDER_ERROR",
      }
    }
  }

  private buildRequestPayload(request: PrequalProviderRequest) {
    return {
      consumer: {
        firstName: request.firstName,
        lastName: request.lastName,
        dateOfBirth: request.dateOfBirth,
        ssnLast4: request.ssnLast4,
        address: {
          line1: request.addressLine1,
          city: request.city,
          state: request.state,
          postalCode: request.postalCode,
        },
      },
    }
  }

  private normalizeResponse(data: Record<string, unknown>): PrequalProviderResponse {
    // Map iPredict response fields to canonical PrequalProviderResponse
    // iPredict returns alternative credit scores in 300-850 range
    const score = typeof data["alternativeCreditScore"] === "number" ? data["alternativeCreditScore"] : undefined
    const refId = typeof data["referenceId"] === "string" ? data["referenceId"] : undefined

    // Map iPredict score to canonical credit tier
    let creditTier: string | undefined
    if (score != null) {
      if (score >= 750) creditTier = "EXCELLENT"
      else if (score >= 700) creditTier = "GOOD"
      else if (score >= 650) creditTier = "FAIR"
      else if (score >= 300) creditTier = "POOR"
      else creditTier = "DECLINED"
    }

    return {
      success: true,
      creditScore: score,
      creditTier,
      providerReferenceId: refId,
      rawResponse: data,
    }
  }
}
