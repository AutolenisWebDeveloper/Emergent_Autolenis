// AutoLenis Buyer Prequalification — TypeScript Types
// API request/response contracts for the consumer-facing soft prequal system

export type ApplicationStatus =
  | "INTAKE_IN_PROGRESS"
  | "CONSENT_CAPTURED"
  | "IPREDICT_PENDING"
  | "IPREDICT_COMPLETED"
  | "IBV_PENDING"
  | "IBV_COMPLETED"
  | "DECISION_PENDING"
  | "PREQUALIFIED"
  | "PREQUALIFIED_CONDITIONAL"
  | "MANUAL_REVIEW"
  | "NOT_PREQUALIFIED"
  | "STALE"
  | "EXPIRED"
  | "SYSTEM_ERROR"

export type IpredictBand = "PASS" | "BORDERLINE" | "FAIL"
export type IbvOutcome = "SUFFICIENT" | "WEAK" | "INCOMPLETE" | "NOT_TRIGGERED"
export type FinalStatus = "PREQUALIFIED" | "PREQUALIFIED_CONDITIONAL" | "MANUAL_REVIEW" | "NOT_PREQUALIFIED"
export type QueueSegment = "NEW" | "IN_PROGRESS" | "ACTION_REQUIRED" | "READY_FOR_REVIEW" | "COMPLETED" | "DECLINED" | "STALE" | "EXPIRED"

// ── Step 1: Basic Identity ─────────────────────────────────────────────────
export interface PrequalStep1Data {
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string // ISO date string
  ssn: string // Masked/raw - encrypted server-side before storage
}

// ── Step 2: Residence ──────────────────────────────────────────────────────
export interface PrequalStep2Data {
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zipCode: string
  residenceType: "OWN" | "RENT" | "LIVE_WITH_FAMILY" | "OTHER"
  monthsAtAddress: number
}

// ── Step 3: Income/Housing ─────────────────────────────────────────────────
export interface PrequalStep3Data {
  employmentType: "EMPLOYED" | "SELF_EMPLOYED" | "RETIRED" | "OTHER"
  employerName?: string
  grossMonthlyIncome: number // dollars
  monthlyHousingPayment: number // dollars
}

// ── Step 4: Shopping Inputs + Consent ─────────────────────────────────────
export interface PrequalStep4Data {
  downPayment: number // dollars
  targetMonthlyPayment: number // dollars
  consentGiven: boolean
  consentVersionId: string
}

// ── API Request / Response shapes ─────────────────────────────────────────

export interface PrequalStartRequest {
  step1: PrequalStep1Data
  step2: PrequalStep2Data
  step3: PrequalStep3Data
  step4: PrequalStep4Data
}

export interface PrequalStartResponse {
  success: true
  applicationId: string
  sessionToken: string
  status: ApplicationStatus
}

export interface PrequalStatusResponse {
  success: true
  applicationId: string
  status: ApplicationStatus
  queueSegment: QueueSegment
  finalStatus?: FinalStatus
  shoppingRangeMinCents?: number
  shoppingRangeMaxCents?: number
  ibvFormUrl?: string
  expiresAt?: string
  message?: string
}

export interface PrequalFinalizeResponse {
  success: true
  finalStatus: FinalStatus
  shoppingRangeMinCents?: number
  shoppingRangeMaxCents?: number
  expiresAt: string
}

// ── Admin types ────────────────────────────────────────────────────────────

export interface PrequalQueueItem {
  id: string
  email: string
  firstName: string
  lastName: string
  status: ApplicationStatus
  queueSegment: QueueSegment
  ipredictBand?: IpredictBand
  ibvOutcome: IbvOutcome
  finalStatus?: FinalStatus
  createdAt: string
  submittedAt?: string
  slaEscalatedAt?: string
}

export interface PrequalAdminAction {
  action: "approve" | "decline" | "escalate" | "request-docs"
  reason?: string
  overrideStatus?: FinalStatus
}

// ── Shopping Pass ──────────────────────────────────────────────────────────

export interface ShoppingPass {
  applicationId: string
  finalStatus: FinalStatus
  shoppingRangeMinCents: number
  shoppingRangeMaxCents: number
  expiresAt: string
  issuedAt: string
}
