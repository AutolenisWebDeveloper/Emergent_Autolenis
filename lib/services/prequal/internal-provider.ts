/**
 * Internal PreQual Provider (AutoLenis heuristic scoring engine)
 *
 * Uses deterministic mathematical scoring based on income, housing, and DTI.
 * This is NOT an FCRA-compliant bureau adapter — it is a heuristic estimator
 * suitable only for TEST workspaces or internal modeling.
 */

import { isTestWorkspace } from "@/lib/app-mode"
import { mockDb } from "@/lib/mocks/mockStore"
import type { WorkspaceMode } from "@/lib/types"
import type {
  PreQualProvider,
  PreQualProviderRequest,
  PreQualProviderResponse,
} from "./provider-interface"

export class InternalPreQualProvider implements PreQualProvider {
  readonly providerName = "AutoLenisPrequal"

  /**
   * supportsLive = false — this provider may NOT be used in LIVE workspaces.
   * LIVE pre-qualification requires a bureau-backed provider (MicroBilt, iPredict).
   */
  readonly supportsLive = false

  async prequalify(
    data: PreQualProviderRequest,
    session?: { workspace_mode?: WorkspaceMode } | null,
  ): Promise<PreQualProviderResponse> {
    if (isTestWorkspace(session)) {
      const testPrequal = mockDb.prequals[0]
      return {
        success: true,
        creditTier: testPrequal.creditTier,
        approvedAmountCents: testPrequal.maxOtdAmountCents,
        maxMonthlyPaymentCents: testPrequal.maxMonthlyPaymentCents,
        minMonthlyPaymentCents: testPrequal.minMonthlyPaymentCents,
        dtiRatio: testPrequal.dtiRatio,
        providerReferenceId: "ALQ-PREQ-2026-0001",
      }
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Scoring logic based on income and housing
    const monthlyIncome = data.monthlyIncomeCents / 100
    const monthlyHousing = data.monthlyHousingCents / 100

    // Calculate DTI
    const dtiRatio =
      monthlyIncome > 0
        ? (monthlyHousing / monthlyIncome) * 100
        : 100

    // Reject if DTI too high
    if (dtiRatio > 50) {
      return {
        success: false,
        errorMessage:
          "Debt-to-income ratio exceeds acceptable threshold",
      }
    }

    // Determine credit tier using deterministic scoring based on profile data
    // Score is computed from DTI, income level, and housing-to-income ratio
    const dtiScore = Math.max(0, 100 - dtiRatio * 2) // lower DTI = higher score
    const incomeScore = Math.min(100, monthlyIncome / 80) // up to $8k/month = full score
    const stabilityScore = Math.min(
      100,
      Math.max(
        0,
        100 - (monthlyHousing / Math.max(monthlyIncome, 1)) * 200,
      ),
    )
    const estimatedScore = Math.floor(
      600 +
        (dtiScore * 0.4 + incomeScore * 0.35 + stabilityScore * 0.25) *
          2,
    )
    let creditTier: string
    let rateMultiplier: number

    if (estimatedScore >= 750) {
      creditTier = "EXCELLENT"
      rateMultiplier = 1.0
    } else if (estimatedScore >= 700) {
      creditTier = "PRIME"
      rateMultiplier = 0.9
    } else if (estimatedScore >= 650) {
      creditTier = "NEAR_PRIME"
      rateMultiplier = 0.75
    } else {
      creditTier = "SUBPRIME"
      rateMultiplier = 0.5
    }

    // Calculate max monthly payment (43% DTI rule minus housing)
    const availableMonthly = monthlyIncome * 0.43 - monthlyHousing
    const maxMonthlyPayment = Math.max(
      0,
      Math.floor(availableMonthly * rateMultiplier),
    )

    // Calculate max OTD (assuming 60-month term, avg APR based on tier)
    const avgApr =
      creditTier === "EXCELLENT"
        ? 0.045
        : creditTier === "PRIME"
          ? 0.065
          : creditTier === "NEAR_PRIME"
            ? 0.085
            : 0.12
    const termMonths = 60
    const monthlyRate = avgApr / 12

    // PV formula: P = PMT * [(1 - (1 + r)^-n) / r]
    const approvedAmount =
      monthlyRate > 0
        ? maxMonthlyPayment *
          ((1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate)
        : maxMonthlyPayment * termMonths

    return {
      success: true,
      creditTier,
      approvedAmountCents: Math.floor(approvedAmount) * 100,
      maxMonthlyPaymentCents: maxMonthlyPayment * 100,
      minMonthlyPaymentCents:
        Math.floor(maxMonthlyPayment * 0.5) * 100,
      dtiRatio: Math.round(dtiRatio * 100) / 100,
      providerReferenceId: `ALQ-${Date.now()}-${crypto.randomUUID().replace(/-/g, "").substring(0, 12)}`,
    }
  }
}

// Singleton
export const internalProvider = new InternalPreQualProvider()
