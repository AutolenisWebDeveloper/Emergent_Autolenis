/**
 * PrequalResponseNormalizer
 *
 * Transforms provider-specific responses into the canonical normalized DTO.
 * Enforces:
 *  - LIVE-mode prohibition on internal heuristic masquerading as provider-backed approval
 *  - Consistent credit tier mapping to Prisma CreditTier enum values
 *  - Canonical normalized response shape for the buyer journey
 */

import type { PreQualProviderResponse } from "../prequal.service"
import type { IPredictRiskResponse } from "./ipredict-risk.provider"

/**
 * Canonical normalized prequalification result DTO.
 * This is the shape returned to the buyer UI and stored for compliance.
 */
export interface NormalizedPrequalResult {
  id: string
  status: string
  sourceType: string
  provider: string
  creditTier: string
  maxOtd: number | null
  estimatedMonthlyMin: number | null
  estimatedMonthlyMax: number | null
  expiresAt: string | null
  disclosuresAccepted: boolean
  forwardingAuthorized: boolean
  createdAt: string
}

type CreditTier = "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DECLINED"

const VALID_CREDIT_TIERS: CreditTier[] = ["EXCELLENT", "GOOD", "FAIR", "POOR", "DECLINED"]

/**
 * Map provider-specific tier names to canonical Prisma CreditTier values.
 */
const TIER_MAPPING: Record<string, CreditTier> = {
  EXCELLENT: "EXCELLENT",
  PRIME: "GOOD",
  GOOD: "GOOD",
  NEAR_PRIME: "FAIR",
  FAIR: "FAIR",
  SUBPRIME: "POOR",
  POOR: "POOR",
  DECLINED: "DECLINED",
}

export class PrequalResponseNormalizer {
  /**
   * Map any provider credit tier string to a valid Prisma CreditTier.
   */
  static normalizeCreditTier(tier: string | undefined | null): CreditTier {
    if (!tier) return "POOR"
    const mapped = TIER_MAPPING[tier.toUpperCase()]
    if (mapped) return mapped
    if (VALID_CREDIT_TIERS.includes(tier as CreditTier)) return tier as CreditTier
    return "POOR"
  }

  /**
   * Validate that in LIVE mode, internal heuristic scoring is not presented
   * as provider-backed approval. Throws if violated.
   */
  static assertNotHeuristicInLive(
    sourceType: string,
    providerName: string,
    workspaceMode?: string | null,
  ): void {
    if (workspaceMode !== "LIVE") return

    const isInternal =
      sourceType === "INTERNAL" || providerName === "AutoLenisPrequal"

    if (isInternal) {
      throw new Error(
        "COMPLIANCE_VIOLATION: Internal heuristic scoring cannot be used as provider-backed approval in LIVE mode. " +
          "Use MicroBilt or another FCRA-compliant provider.",
      )
    }
  }

  /**
   * Build the canonical normalized DTO from a provider response and session metadata.
   */
  static toNormalizedResult(params: {
    id: string
    status: string
    sourceType: string
    provider: string
    providerResponse: PreQualProviderResponse
    expiresAt: Date | null
    disclosuresAccepted: boolean
    forwardingAuthorized: boolean
    createdAt: Date
  }): NormalizedPrequalResult {
    return {
      id: params.id,
      status: params.status,
      sourceType: params.sourceType,
      provider: params.provider,
      creditTier: PrequalResponseNormalizer.normalizeCreditTier(
        params.providerResponse.creditTier,
      ),
      maxOtd: params.providerResponse.approvedAmountCents
        ? params.providerResponse.approvedAmountCents / 100
        : null,
      estimatedMonthlyMin: params.providerResponse.minMonthlyPaymentCents
        ? params.providerResponse.minMonthlyPaymentCents / 100
        : null,
      estimatedMonthlyMax: params.providerResponse.maxMonthlyPaymentCents
        ? params.providerResponse.maxMonthlyPaymentCents / 100
        : null,
      expiresAt: params.expiresAt ? params.expiresAt.toISOString() : null,
      disclosuresAccepted: params.disclosuresAccepted,
      forwardingAuthorized: params.forwardingAuthorized,
      createdAt: params.createdAt.toISOString(),
    }
  }

  /**
   * Merge iPredict risk data into an existing normalized result as supplementary metadata.
   * Does NOT change the primary approval decision.
   */
  static enrichWithRiskData(
    result: NormalizedPrequalResult,
    riskResponse: IPredictRiskResponse,
  ): NormalizedPrequalResult & { riskAssessment?: { score: number; category: string } } {
    if (!riskResponse.success) return result

    return {
      ...result,
      riskAssessment: {
        score: riskResponse.riskScore || 0,
        category: riskResponse.riskCategory || "MODERATE",
      },
    }
  }
}
