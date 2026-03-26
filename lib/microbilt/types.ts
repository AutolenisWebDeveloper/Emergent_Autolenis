// MicroBilt iPredict Advantage — Request / Response Types
// Sandbox: https://apitest.microbilt.com

// ── OAuth2 ────────────────────────────────────────────────────────────────

export interface MicroBiltTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

// ── iPredict Request ──────────────────────────────────────────────────────

export interface IpredictAddress {
  street1: string
  street2?: string
  city: string
  state: string
  zip: string
}

export interface IpredictRequestBody {
  ssn: string           // 9-digit plain text (decrypted just-in-time)
  firstName: string
  lastName: string
  dateOfBirth: string   // YYYY-MM-DD
  address: IpredictAddress
  phone?: string
  email?: string
}

// ── iPredict Response — Raw from MicroBilt API ────────────────────────────

export interface IpredictScoreItem {
  scoreType: string    // e.g. "FICO_PREDICTOR", "RISK_SCORE"
  scoreValue: number
  scoreRange?: { min: number; max: number }
  reasonCodes?: string[]
}

export interface IpredictIndicator {
  code: string
  description: string
  value: boolean | string | number
}

export interface IpredictRawResponse {
  requestId: string
  status: "SUCCESS" | "NO_SCORE" | "VENDOR_DECLINE" | "ERROR"
  scores?: IpredictScoreItem[]
  indicators?: IpredictIndicator[]
  ofacHit?: boolean
  bankruptcyIndicator?: boolean
  fraudIndicator?: boolean
  deceasedIndicator?: boolean
  ddaFraudIndicator?: boolean
  badLoanCount?: number
  collectionCount?: number
  errorCode?: string
  errorMessage?: string
  /** Set to true when status is VENDOR_DECLINE to simplify downstream mapper logic. */
  vendorDecline?: boolean
}

// ── Parsed iPredict Result (internal representation) ─────────────────────

export interface ParsedIpredictResult {
  requestId: string
  primaryScore: number | null
  ofacHit: boolean
  bankruptcyIndicator: boolean
  fraudIndicator: boolean
  deceasedIndicator: boolean
  ddaFraudIndicator: boolean
  badLoanCount: number
  collectionCount: number
  vendorDecline: boolean
  noScore: boolean
  rawResponse: IpredictRawResponse
}

// ── IBV Types ─────────────────────────────────────────────────────────────

export interface IbvFormCreateRequest {
  firstName: string
  lastName: string
  email: string
  phone?: string
  referenceId: string  // Our applicationId
}

export interface IbvFormCreateResponse {
  sessionId: string
  formUrl: string
  expiresAt: string
}

export interface IbvAccountSummary {
  accountType: string
  averageMonthlyDeposit: number    // in cents
  monthsAnalyzed: number
  confidence: "HIGH" | "MEDIUM" | "LOW"
}

export interface IbvReportResponse {
  sessionId: string
  status: "COMPLETE" | "INCOMPLETE" | "EXPIRED"
  accounts?: IbvAccountSummary[]
  estimatedMonthlyIncomeCents?: number
  confidence?: "HIGH" | "MEDIUM" | "LOW"
}
