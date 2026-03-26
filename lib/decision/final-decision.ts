// Decision matrix: iPredict band + IBV outcome → 4 terminal statuses

import type { IpredictBand, IbvOutcome, FinalStatus } from "@/lib/types/prequal"

export interface FinalDecisionInput {
  ipredictBand: IpredictBand
  ibvOutcome: IbvOutcome
  hardFailReason?: string
}

export interface FinalDecisionResult {
  finalStatus: FinalStatus
  decisionReason: string
}

/**
 * Maps iPredict band + IBV outcome to a terminal final status.
 *
 * Decision matrix:
 * PASS + SUFFICIENT/NOT_TRIGGERED → PREQUALIFIED
 * PASS + WEAK                     → PREQUALIFIED_CONDITIONAL
 * PASS + INCOMPLETE               → PREQUALIFIED_CONDITIONAL
 * BORDERLINE + SUFFICIENT         → PREQUALIFIED_CONDITIONAL
 * BORDERLINE + WEAK/INCOMPLETE/NT → MANUAL_REVIEW
 * FAIL                            → NOT_PREQUALIFIED
 */
export function makeFinalDecision(input: FinalDecisionInput): FinalDecisionResult {
  const { ipredictBand, ibvOutcome } = input

  if (ipredictBand === "FAIL") {
    return {
      finalStatus: "NOT_PREQUALIFIED",
      decisionReason: input.hardFailReason ?? "Risk assessment did not meet minimum requirements.",
    }
  }

  if (ipredictBand === "PASS") {
    if (ibvOutcome === "SUFFICIENT" || ibvOutcome === "NOT_TRIGGERED") {
      return {
        finalStatus: "PREQUALIFIED",
        decisionReason: "Application meets standard shopping criteria.",
      }
    }
    if (ibvOutcome === "WEAK" || ibvOutcome === "INCOMPLETE") {
      return {
        finalStatus: "PREQUALIFIED_CONDITIONAL",
        decisionReason:
          "Application meets risk criteria. Income verification recommended before finalizing.",
      }
    }
  }

  if (ipredictBand === "BORDERLINE") {
    if (ibvOutcome === "SUFFICIENT") {
      return {
        finalStatus: "PREQUALIFIED_CONDITIONAL",
        decisionReason:
          "Application meets conditional criteria with verified income support.",
      }
    }
    return {
      finalStatus: "MANUAL_REVIEW",
      decisionReason: "Application requires manual review before a shopping range can be issued.",
    }
  }

  // Fallback (should not occur)
  return {
    finalStatus: "MANUAL_REVIEW",
    decisionReason: "Application has been flagged for manual review.",
  }
}
