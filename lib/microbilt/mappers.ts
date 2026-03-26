// Maps raw MicroBilt iPredict API response into ParsedIpredictResult.
// This is the ONLY module that touches raw vendor response fields.
// All downstream code uses ParsedIpredictResult exclusively.

import type { IpredictResponse, ParsedIpredictResult } from "./types"

function safeInt(val: string | undefined | null): number {
  if (!val) return 0
  const parsed = parseInt(val, 10)
  return isNaN(parsed) ? 0 : parsed
}

export function mapIpredictResponse(raw: IpredictResponse): ParsedIpredictResult {
  const content = raw.RESPONSE?.CONTENT
  const decision = content?.DECISION
  const details = content?.SERVICEDETAILS
  const pda = details?.PDA
  const pdaSummary = pda?.summary
  const publicRecords = details?.PUBLICRECORDS
  const idv = details?.IDV
  const preview = details?.iPreView
  const dda = details?.DDA
  const status = raw.RESPONSE?.STATUS

  // Extract primary score from SCORES array
  const primaryScoreObj = decision?.SCORES?.find((s) => s.Value)
  const primaryScoreVal = primaryScoreObj?.Value ? parseInt(primaryScoreObj.Value, 10) : null
  const plsVal = primaryScoreObj?.performsLikeScore
    ? parseInt(primaryScoreObj.performsLikeScore, 10)
    : null

  // Extract reason codes
  const reasonCodes = (decision?.REASONS ?? [])
    .map((r) => r.code ?? r.Value)
    .filter((c): c is string => !!c)

  // Bankruptcy detection: check both IDV and public records
  const bankruptcyCountFromPR = safeInt(publicRecords?.SUMMARY?.bankruptcies)
  const bankruptcyFlagFromIDV = idv?.bankruptcyFlag === "Y" || idv?.bankruptcyFlag === "1"
  const hasBankruptcyIndicator = bankruptcyCountFromPR > 0 || bankruptcyFlagFromIDV

  // ELJ (evictions/liens/judgments)
  const eljCount = safeInt(publicRecords?.SUMMARY?.evictionsliensjudgments)
  const hasActiveJudgment = eljCount > 0

  // DDA fraud/closure
  const ddaFraud = dda?.ddaclosures?.fraud
  const ddaFraudIndicator = ddaFraud === "Y" || ddaFraud === "1" || safeInt(ddaFraud) > 0
  const ddaClosureCount = (dda?.ddaclosures?.closuresdetail ?? []).length

  // Vendor-level decline
  const vendorDecline = decision?.decision?.Value === "DECLINE"
  const noScore = primaryScoreVal === null || isNaN(primaryScoreVal)

  return {
    requestId: raw.MsgRsHdr?.RqUID ?? null,
    responseStatus: status?.type === "ERROR" ? "ERROR" : "SUCCESS",
    errorMessage: status?.error?.message ?? null,

    decisionValue: decision?.decision?.Value ?? null,
    decisionCode: decision?.decision?.code ?? null,

    primaryScore: primaryScoreVal && !isNaN(primaryScoreVal) ? primaryScoreVal : null,
    performsLikeScore: plsVal && !isNaN(plsVal) ? plsVal : null,
    scoreModel: primaryScoreObj?.model ?? null,

    reasonCodes,

    totalInquiries: safeInt(pdaSummary?.inquiries),
    recentInquiries: safeInt(pdaSummary?.recentinquiries),
    totalLoans: safeInt(pdaSummary?.loans),
    currentLoans: safeInt(pdaSummary?.loanscurrent),
    badLoans: safeInt(pdaSummary?.badloans),
    loansInCollections: safeInt(pdaSummary?.loanscollections),
    loansPastDue: safeInt(pdaSummary?.loanspastdue),
    loansWrittenOff: safeInt(pdaSummary?.loanswrittenoff),

    bankruptcyCount: bankruptcyCountFromPR,
    evictionLienJudgmentCount: eljCount,
    hasBankruptcyIndicator,
    hasActiveJudgment,

    ssnValid: idv?.ssnValidCode === "Y" || preview?.SSNAttributes?.SSNValid === "Y",
    ssnDeceased: idv?.deceasedIndicator === "Y" || preview?.SSNAttributes?.SSNDeceased === "Y",
    fraudWarning: idv?.fraudWarning === "Y",
    highRiskAddress: idv?.highRiskAddress === "Y" || preview?.AddressAttributes?.HighRiskAddress === "Y",
    ofacMatch: preview?.WatchListAttributes?.OFACIndicator === "Y",

    bankName: preview?.BankAccountAttributes?.bankName ?? null,
    routingNumberValid: preview?.BankAccountAttributes?.routingNumberValid === "Y",

    ddaFraudIndicator,
    ddaClosureCount,

    vendorDecline,
    noScore,
  }
}
