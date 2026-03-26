// Maps IBV report → IbvOutcome (SUFFICIENT / WEAK / INCOMPLETE)

import type { IbvReportResponse } from "@/lib/microbilt/types"
import type { IbvOutcome } from "@/lib/types/prequal"

export interface IbvScoringResult {
  outcome: IbvOutcome
  verifiedMonthlyIncomeCents?: number
  confidence?: string
}

/**
 * Scores an IBV report into an outcome band.
 */
export function scoreIbv(report: IbvReportResponse | null): IbvScoringResult {
  if (!report || report.status === "INCOMPLETE" || report.status === "EXPIRED") {
    return { outcome: "INCOMPLETE" }
  }

  if (!report.estimatedMonthlyIncomeCents || !report.confidence) {
    return { outcome: "INCOMPLETE" }
  }

  const income = report.estimatedMonthlyIncomeCents
  const confidence = report.confidence

  // Insufficient income data
  if (income <= 0) {
    return { outcome: "INCOMPLETE" }
  }

  // LOW confidence = WEAK regardless of amount
  if (confidence === "LOW") {
    return {
      outcome: "WEAK",
      verifiedMonthlyIncomeCents: income,
      confidence,
    }
  }

  // MEDIUM confidence with reasonable income = WEAK
  if (confidence === "MEDIUM") {
    return {
      outcome: "WEAK",
      verifiedMonthlyIncomeCents: income,
      confidence,
    }
  }

  // HIGH confidence = SUFFICIENT
  return {
    outcome: "SUFFICIENT",
    verifiedMonthlyIncomeCents: income,
    confidence,
  }
}
