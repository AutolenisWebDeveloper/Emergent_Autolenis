// Contract Shield Service - Automated contract review assistant
// NOTE: This is an informational tool only. It does not provide legal, tax, or financial advice.

// Document types
export const DOCUMENT_TYPES = [
  "BUYERS_ORDER",
  "FINANCE_CONTRACT",
  "ADDENDUM",
  "WARRANTY_FORM",
  "GAP_FORM",
  "ITEMIZED_FEES",
  "OTHER",
] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export type IssueSeverity = "INFO" | "REVIEW" | "IMPORTANT" | "CRITICAL"

export type ScanStatus = "PENDING" | "RUNNING" | "REVIEW_READY" | "PASS" | "FAIL"

// These are optional add-ons that buyers may want to review
export const FLAGGED_ADD_ONS = [
  "nitrogen_tire",
  "vin_etching",
  "market_adjustment",
  "dealer_prep",
  "additional_dealer_markup",
  "addendum_sticker",
  "dealer_add_on",
  "protection_package",
  "paint_protection",
  "fabric_protection",
]

// These are typical ranges we've observed - not legal limits
export const STATE_DOC_FEE_REFERENCE: Record<string, { typical: number; note: string }> = {
  CA: { typical: 85, note: "CA has a statutory cap" },
  FL: { typical: 999, note: "No statutory cap" },
  TX: { typical: 150, note: "Typical range" },
  NY: { typical: 75, note: "Typical range" },
  GA: { typical: 699, note: "No statutory cap" },
  NC: { typical: 699, note: "No statutory cap" },
  VA: { typical: 499, note: "No statutory cap" },
  OH: { typical: 250, note: "Typical range" },
  PA: { typical: 300, note: "Must be disclosed" },
  IL: { typical: 336, note: "Typical range" },
}

export interface ScanIssueItem {
  severity: IssueSeverity
  category: string
  fieldName: string
  fieldLabel: string
  description: string
  suggestedFix: string
}
