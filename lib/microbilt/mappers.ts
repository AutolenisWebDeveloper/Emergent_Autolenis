// Maps raw MicroBilt iPredict response to ParsedIpredictResult

import type { IpredictRawResponse, ParsedIpredictResult } from "./types"

export function mapIpredictResponse(raw: IpredictRawResponse): ParsedIpredictResult {
  // Extract primary risk score
  let primaryScore: number | null = null
  if (raw.scores && raw.scores.length > 0) {
    const primary = raw.scores.find(
      (s) => s.scoreType === "RISK_SCORE" || s.scoreType === "FICO_PREDICTOR"
    ) ?? raw.scores[0]
    primaryScore = primary?.scoreValue ?? null
  }

  // Extract boolean indicators
  const ofacHit = raw.ofacHit ?? extractBooleanIndicator(raw, "OFAC_HIT") ?? false
  const bankruptcyIndicator =
    raw.bankruptcyIndicator ?? extractBooleanIndicator(raw, "BANKRUPTCY") ?? false
  const fraudIndicator = raw.fraudIndicator ?? extractBooleanIndicator(raw, "FRAUD") ?? false
  const deceasedIndicator =
    raw.deceasedIndicator ?? extractBooleanIndicator(raw, "DECEASED_SSN") ?? false
  const ddaFraudIndicator =
    raw.ddaFraudIndicator ?? extractBooleanIndicator(raw, "DDA_FRAUD") ?? false

  const badLoanCount = raw.badLoanCount ?? extractNumericIndicator(raw, "BAD_LOAN_COUNT") ?? 0
  const collectionCount =
    raw.collectionCount ?? extractNumericIndicator(raw, "COLLECTION_COUNT") ?? 0

  const vendorDecline = raw.vendorDecline === true || raw.status === "VENDOR_DECLINE"
  const noScore = raw.status === "NO_SCORE"

  return {
    requestId: raw.requestId,
    primaryScore,
    ofacHit,
    bankruptcyIndicator,
    fraudIndicator,
    deceasedIndicator,
    ddaFraudIndicator,
    badLoanCount,
    collectionCount,
    vendorDecline,
    noScore,
    rawResponse: raw,
  }
}

function extractBooleanIndicator(
  raw: IpredictRawResponse,
  code: string,
): boolean | null {
  if (!raw.indicators) return null
  const indicator = raw.indicators.find((i) => i.code === code)
  if (!indicator) return null
  return indicator.value === true || indicator.value === "true" || indicator.value === 1
}

function extractNumericIndicator(
  raw: IpredictRawResponse,
  code: string,
): number | null {
  if (!raw.indicators) return null
  const indicator = raw.indicators.find((i) => i.code === code)
  if (!indicator || typeof indicator.value !== "number") return null
  return indicator.value
}
