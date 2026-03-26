// Maps ParsedIpredictResult → IpredictBand (PASS / BORDERLINE / FAIL)
// Includes hard-fail overrides per spec

import type { ParsedIpredictResult } from "@/lib/microbilt/types"
import type { IpredictBand } from "@/lib/types/prequal"
import { HARD_FAIL_REASONS, IPREDICT_THRESHOLDS } from "@/lib/prequal/constants"

export interface IpredictScoringResult {
  band: IpredictBand
  hardFailReason?: string
  scoreRaw?: number
}

/**
 * Scores a parsed iPredict result into a band.
 * Hard-fail overrides take priority over numeric score.
 */
export function scoreIpredict(result: ParsedIpredictResult): IpredictScoringResult {
  // Hard-fail overrides — immediate FAIL regardless of score
  if (result.ofacHit) {
    return { band: "FAIL", hardFailReason: HARD_FAIL_REASONS.OFAC_HIT }
  }
  if (result.bankruptcyIndicator) {
    return { band: "FAIL", hardFailReason: HARD_FAIL_REASONS.BANKRUPTCY }
  }
  if (result.fraudIndicator) {
    return { band: "FAIL", hardFailReason: HARD_FAIL_REASONS.FRAUD_ALERT }
  }
  if (result.deceasedIndicator) {
    return { band: "FAIL", hardFailReason: HARD_FAIL_REASONS.DECEASED_SSN }
  }
  if (result.ddaFraudIndicator) {
    return { band: "FAIL", hardFailReason: HARD_FAIL_REASONS.DDA_FRAUD }
  }
  if (result.vendorDecline) {
    return { band: "FAIL", hardFailReason: HARD_FAIL_REASONS.VENDOR_DECLINE }
  }
  if (result.badLoanCount >= 5) {
    return { band: "FAIL", hardFailReason: HARD_FAIL_REASONS.EXCESSIVE_BAD_LOANS }
  }

  // No score = FAIL (cannot assess risk)
  if (result.noScore || result.primaryScore === null) {
    return { band: "FAIL", hardFailReason: "NO_SCORE" }
  }

  const score = result.primaryScore

  // Numeric band assignment
  if (score >= IPREDICT_THRESHOLDS.PASS_MIN) {
    return { band: "PASS", scoreRaw: score }
  }
  if (score >= IPREDICT_THRESHOLDS.BORDERLINE_MIN) {
    return { band: "BORDERLINE", scoreRaw: score }
  }
  return { band: "FAIL", scoreRaw: score }
}
