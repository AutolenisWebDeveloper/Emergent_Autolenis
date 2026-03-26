// Maps ParsedIpredictResult → IpredictBand (PASS / BORDERLINE / FAIL)
// Includes hard-fail overrides per spec

import type { ParsedIpredictResult } from "@/lib/microbilt/types"
import type { IpredictBand } from "@/lib/types/prequal"
import { HARD_FAIL_REASONS, IPREDICT_THRESHOLDS } from "@/lib/prequal/constants"

export interface IpredictScoringResult {
  band: IpredictBand
  hardFailReason?: string
  scoreRaw?: number
  decisionSummary: {
    vendorDecision: string | null
    scoreModel: string | null
    totalInquiries: number
    totalLoans: number
    badLoans: number
    bankruptcyCount: number
    eljCount: number
  }
}

const COLLECTIONS_HARD_FAIL_THRESHOLD = 3

/**
 * Scores a parsed iPredict result into a band.
 * Hard-fail overrides take priority over numeric score.
 * NEVER expose thresholds, raw scores, or flags to the consumer.
 */
export function scoreIpredict(result: ParsedIpredictResult): IpredictScoringResult {
  const reasonCodes: string[] = []

  // Hard-fail overrides — immediate FAIL regardless of score
  if (result.vendorDecline) reasonCodes.push(HARD_FAIL_REASONS.VENDOR_DECLINE)
  if (result.ssnDeceased) reasonCodes.push(HARD_FAIL_REASONS.DECEASED_SSN)
  if (result.ofacMatch) reasonCodes.push(HARD_FAIL_REASONS.OFAC_HIT)
  if (result.fraudWarning) reasonCodes.push(HARD_FAIL_REASONS.FRAUD_ALERT)
  if (result.ddaFraudIndicator) reasonCodes.push(HARD_FAIL_REASONS.DDA_FRAUD)
  if (result.hasBankruptcyIndicator) reasonCodes.push(HARD_FAIL_REASONS.BANKRUPTCY)
  if (result.hasActiveJudgment) reasonCodes.push(HARD_FAIL_REASONS.ACTIVE_JUDGMENT_LIEN)
  if (result.badLoans >= IPREDICT_THRESHOLDS.BAD_LOAN_FAIL_MIN) reasonCodes.push(HARD_FAIL_REASONS.EXCESSIVE_BAD_LOANS)
  if (result.loansInCollections >= COLLECTIONS_HARD_FAIL_THRESHOLD) reasonCodes.push(HARD_FAIL_REASONS.MULTIPLE_COLLECTIONS)

  if (reasonCodes.length > 0) {
    return buildResult("FAIL", result, reasonCodes[0])
  }

  // No score = FAIL
  if (result.noScore || result.primaryScore === null) {
    return buildResult("FAIL", result, "NO_SCORE")
  }

  const score = result.primaryScore

  if (score >= IPREDICT_THRESHOLDS.PASS_MIN) {
    return buildResult("PASS", result, undefined, score)
  }

  if (score >= IPREDICT_THRESHOLDS.BORDERLINE_MIN) {
    return buildResult("BORDERLINE", result, undefined, score)
  }

  return buildResult("FAIL", result, undefined, score)
}

function buildResult(
  band: IpredictBand,
  parsed: ParsedIpredictResult,
  hardFailReason?: string,
  scoreRaw?: number,
): IpredictScoringResult {
  return {
    band,
    hardFailReason,
    scoreRaw,
    decisionSummary: {
      vendorDecision: parsed.decisionValue,
      scoreModel: parsed.scoreModel,
      totalInquiries: parsed.totalInquiries,
      totalLoans: parsed.totalLoans,
      badLoans: parsed.badLoans,
      bankruptcyCount: parsed.bankruptcyCount,
      eljCount: parsed.evictionLienJudgmentCount,
    },
  }
}

