/**
 * iPredict Risk Provider Adapter
 *
 * Supplementary risk scoring provider. Used alongside MicroBilt/Experian
 * prequalification to provide additional risk assessment signals.
 *
 * iPredict results are advisory — they do NOT serve as the final credit decision
 * and must not masquerade as provider-backed approval in LIVE mode.
 */

export interface IPredictRiskRequest {
  firstName: string
  lastName: string
  dateOfBirth: string
  addressLine1: string
  city: string
  state: string
  postalCode: string
}

export interface IPredictRiskResponse {
  success: boolean
  riskScore?: number       // 0-999 scale
  riskCategory?: string    // LOW, MODERATE, HIGH, VERY_HIGH
  fraudIndicators?: string[]
  providerReferenceId?: string
  errorMessage?: string
}

interface IPredictConfig {
  apiUrl: string
  apiKey: string
  environment: "sandbox" | "production"
}

function getIPredictConfig(): IPredictConfig {
  return {
    apiUrl: process.env["IPREDICT_API_URL"] || "https://sandbox.ipredict.com/api/v1",
    apiKey: process.env["IPREDICT_API_KEY"] || "",
    environment: (process.env["IPREDICT_ENVIRONMENT"] as "sandbox" | "production") || "sandbox",
  }
}

export class IPredictRiskProvider {
  static readonly PROVIDER_NAME = "iPredict"

  /**
   * Run an iPredict risk assessment.
   *
   * MUST be called only after written-instruction consent is captured.
   * Results are advisory and supplementary to the primary prequalification.
   */
  static async assessRisk(
    data: IPredictRiskRequest,
    options?: { sessionId?: string },
  ): Promise<IPredictRiskResponse> {
    const config = getIPredictConfig()

    if (!config.apiKey || config.environment === "sandbox") {
      return IPredictRiskProvider.sandboxAssessRisk(data)
    }

    const startTime = Date.now()
    try {
      const response = await fetch(`${config.apiUrl}/risk/assess`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          "X-Session-ID": options?.sessionId || "",
        },
        body: JSON.stringify({
          consumer: {
            firstName: data.firstName,
            lastName: data.lastName,
            dateOfBirth: data.dateOfBirth,
            address: {
              line1: data.addressLine1,
              city: data.city,
              state: data.state,
              postalCode: data.postalCode,
            },
          },
        }),
        signal: AbortSignal.timeout(15_000),
      })

      if (!response.ok) {
        return {
          success: false,
          errorMessage: `iPredict API error (${response.status}): Request failed`,
        }
      }

      const result = await response.json()
      return IPredictRiskProvider.normalizeResponse(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider error"
      return {
        success: false,
        errorMessage: `iPredict provider error: ${message}`,
      }
    }
  }

  /**
   * Sandbox risk assessment with deterministic output.
   */
  private static async sandboxAssessRisk(
    data: IPredictRiskRequest,
  ): Promise<IPredictRiskResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const nameHash = Array.from(data.firstName + data.lastName).reduce(
      (acc, char) => acc + char.charCodeAt(0),
      0,
    )

    const riskScore = 200 + (nameHash % 600) // Range: 200-799

    let riskCategory: string
    if (riskScore <= 300) riskCategory = "LOW"
    else if (riskScore <= 500) riskCategory = "MODERATE"
    else if (riskScore <= 700) riskCategory = "HIGH"
    else riskCategory = "VERY_HIGH"

    return {
      success: true,
      riskScore,
      riskCategory,
      fraudIndicators: [],
      providerReferenceId: `IP-SANDBOX-${Date.now()}-${nameHash}`,
    }
  }

  private static normalizeResponse(
    raw: Record<string, unknown>,
  ): IPredictRiskResponse {
    const risk = raw["riskAssessment"] as Record<string, unknown> | undefined
    if (!risk) {
      return {
        success: false,
        errorMessage: "Invalid iPredict response: missing riskAssessment object",
      }
    }

    return {
      success: true,
      riskScore: (risk["score"] as number) || 0,
      riskCategory: (risk["category"] as string) || "MODERATE",
      fraudIndicators: (risk["indicators"] as string[]) || [],
      providerReferenceId: (risk["referenceId"] as string) || `IP-${Date.now()}`,
    }
  }

  /**
   * Map iPredict risk category to a credit tier string.
   * Used when iPredict is the primary source (no separate prequalification provider).
   */
  static riskCategoryToCreditTier(category: string | undefined): string {
    switch (category) {
      case "LOW":
        return "GOOD"
      case "MODERATE":
        return "FAIR"
      case "HIGH":
      case "VERY_HIGH":
        return "POOR"
      default:
        return "FAIR"
    }
  }
}
