// Maps real MicroBilt iPredict MBCLVRs response to ParsedIpredictResult

import type { IpredictResponse, IpredictProperty, ParsedIpredictResult } from "./types"

/**
 * Maps the real MBCLVRs envelope to our internal ParsedIpredictResult.
 * Extracts score from RESPONSE.CONTENT.DECISION.SCORES[].Value and
 * risk indicators from RESPONSE.CONTENT.DECISION.PROPERTIES[].
 */
export function mapIpredictResponse(raw: IpredictResponse): ParsedIpredictResult {
  const decision = raw.RESPONSE?.CONTENT?.DECISION
  const properties = decision?.PROPERTIES ?? []

  // ── Primary score ───────────────────────────────────────────────────────
  let primaryScore: number | null = null
  const scores = decision?.SCORES ?? []
  if (scores.length > 0) {
    // Prefer the first score with a parseable numeric Value
    for (const s of scores) {
      const parsed = s.Value !== undefined ? parseFloat(s.Value) : NaN
      if (!isNaN(parsed) && parsed > 0) {
        primaryScore = parsed
        break
      }
    }
  }

  // ── Boolean hard-fail indicators ────────────────────────────────────────
  const ofacHit = extractPropertyBool(properties, ["OFAC_HIT", "OFAC"])
  const bankruptcyIndicator = extractPropertyBool(properties, ["BANKRUPTCY", "BANKRUPT"])
  const fraudIndicator = extractPropertyBool(properties, ["FRAUD", "FRAUD_ALERT"])
  const deceasedIndicator = extractPropertyBool(properties, ["DECEASED_SSN", "DECEASED"])
  const ddaFraudIndicator = extractPropertyBool(properties, ["DDA_FRAUD"])

  // ── Numeric indicators ──────────────────────────────────────────────────
  const badLoanCount = extractPropertyInt(properties, ["BAD_LOAN_COUNT", "CHARGE_OFF_COUNT"]) ?? 0
  const collectionCount = extractPropertyInt(properties, ["COLLECTION_COUNT"]) ?? 0

  // ── Vendor decline detection ────────────────────────────────────────────
  // A "DECLINE" decision from the engine is treated as a vendor decline for scoring
  const decisionValue = decision?.decision?.Value
  const vendorDecline = decisionValue === "DECLINE"

  // ── No-score detection ─────────────────────────────────────────────────
  // We reach here only when callIpredict() returned successfully (scores array non-empty),
  // but if primaryScore is still null it means all score values were unparseable.
  const noScore = primaryScore === null && !vendorDecline

  // ── Request ID ─────────────────────────────────────────────────────────
  const requestId =
    raw.MsgRsHdr?.RqUID ??
    raw.RESPONSE?.STATUS?.applicationNumber ??
    `AL-${Date.now()}`

  return {
    requestId,
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

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true when any of the candidate property names has a "Y" / "true" / "1" value.
 */
function extractPropertyBool(
  properties: IpredictProperty[],
  names: string[],
): boolean {
  for (const name of names) {
    const prop = properties.find(
      (p) => p.name?.toUpperCase() === name.toUpperCase(),
    )
    if (!prop) continue
    const v = prop.Value?.toUpperCase()
    if (v === "Y" || v === "YES" || v === "TRUE" || v === "1") return true
  }
  return false
}

/**
 * Returns the integer value of the first matching property name, or null if not found.
 */
function extractPropertyInt(
  properties: IpredictProperty[],
  names: string[],
): number | null {
  for (const name of names) {
    const prop = properties.find(
      (p) => p.name?.toUpperCase() === name.toUpperCase(),
    )
    if (!prop?.Value) continue
    const parsed = parseInt(prop.Value, 10)
    if (!isNaN(parsed)) return parsed
  }
  return null
}
