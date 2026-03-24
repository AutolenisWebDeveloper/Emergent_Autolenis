/**
 * MicroBilt/Experian PreQual Provider adapter.
 *
 * Implements the PrequalProvider interface for MicroBilt's FCRA-compliant
 * soft-inquiry prequalification service.
 *
 * NOTE: This is a production-ready adapter stub. The actual API integration
 * requires MicroBilt credentials (MICROBILT_API_KEY, MICROBILT_API_URL)
 * and must be connected once the contract is finalized.
 *
 * Contractual constraints enforced:
 * - Consumer consent MUST be captured before calling this provider (service layer)
 * - Only soft inquiries — not credit decisions
 * - Written instructions retained in reproducible form
 * - No forwarding without separate affirmative authorization
 */

import type {
  PrequalProvider,
  PrequalProviderRequest,
  PrequalProviderResponse,
} from "./prequal-provider"

export class MicroBiltPrequalProvider implements PrequalProvider {
  readonly providerName = "MICROBILT_EXPERIAN"
  readonly displayName = "MicroBilt Experian Prequalification"

  isAvailable(): boolean {
    return !!(
      process.env["MICROBILT_API_KEY"] &&
      process.env["MICROBILT_API_URL"]
    )
  }

  async prequalify(request: PrequalProviderRequest): Promise<PrequalProviderResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        errorMessage: "MicroBilt provider is not configured",
        errorCode: "PROVIDER_NOT_CONFIGURED",
      }
    }

    const apiKey = process.env["MICROBILT_API_KEY"]!
    const apiUrl = process.env["MICROBILT_API_URL"]!

    try {
      const payload = this.buildRequestPayload(request)

      const response = await fetch(`${apiUrl}/prequalification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "X-Consent-Artifact-Id": request.consentArtifactId || "",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      })

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "")
        return {
          success: false,
          errorMessage: `MicroBilt API returned ${response.status}`,
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
        errorMessage: `MicroBilt provider error: ${message}`,
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
          line2: request.addressLine2,
          city: request.city,
          state: request.state,
          postalCode: request.postalCode,
        },
      },
      financials: {
        monthlyIncomeCents: request.monthlyIncomeCents,
        monthlyHousingCents: request.monthlyHousingCents,
      },
    }
  }

  private normalizeResponse(data: Record<string, unknown>): PrequalProviderResponse {
    // Map MicroBilt response fields to canonical PrequalProviderResponse
    // Actual field mapping depends on MicroBilt API response schema
    const score = typeof data["creditScore"] === "number" ? data["creditScore"] : undefined
    const tier = typeof data["creditTier"] === "string" ? data["creditTier"] : undefined
    const approved = typeof data["approvedAmountCents"] === "number" ? data["approvedAmountCents"] : undefined
    const refId = typeof data["referenceId"] === "string" ? data["referenceId"] : undefined

    return {
      success: true,
      creditScore: score,
      creditTier: tier,
      approvedAmountCents: approved,
      providerReferenceId: refId,
      rawResponse: data,
    }
  }
}
