/**
 * Unified Decision Engine — Canonical Types
 *
 * All platform-wide decision outputs, input signals, and reason codes
 * used by the centralized decision engine.
 */

// ---------------------------------------------------------------------------
// Canonical Output States
// ---------------------------------------------------------------------------

export type BuyerReadinessState =
  | "NOT_STARTED"
  | "PROFILE_INCOMPLETE"
  | "PREQUAL_REQUIRED"
  | "PREQUAL_PENDING"
  | "PREQUAL_ACTIVE"
  | "EXTERNAL_PREAPPROVAL_PENDING"
  | "EXTERNAL_PREAPPROVAL_APPROVED"
  | "CASH_DECLARED"
  | "READY"
  | "HOLD"
  | "BLOCKED"

export type BuyerMessagingEligibilityState =
  | "ELIGIBLE"
  | "INELIGIBLE_NO_APPROVAL"
  | "INELIGIBLE_EXPIRED"
  | "INELIGIBLE_REJECTED"
  | "INELIGIBLE_HOLD"

export type DealerOperationalState =
  | "ACTIVE"
  | "PENDING_VERIFICATION"
  | "SUSPENDED"
  | "HIGH_RISK"
  | "INACTIVE"

export type DealProgressionState =
  | "SELECTED"
  | "FINANCING"
  | "FEE_STAGE"
  | "INSURANCE_STAGE"
  | "CONTRACT_STAGE"
  | "SIGNING_STAGE"
  | "PICKUP_STAGE"
  | "COMPLETED"
  | "CANCELLED"
  | "HOLD"

export type ContractResolutionState =
  | "NOT_STARTED"
  | "PENDING_UPLOAD"
  | "SCANNING"
  | "PASSED"
  | "FAILED"
  | "MANUAL_REVIEW_REQUIRED"
  | "INTERNAL_FIX_IN_PROGRESS"
  | "ADMIN_OVERRIDE_APPROVED"
  | "APPROVED"

export type ESignReadinessState =
  | "NOT_READY"
  | "READY"
  | "SENT"
  | "VIEWED"
  | "SIGNED"
  | "COMPLETED"
  | "BLOCKED"

export type PickupReadinessState =
  | "NOT_READY"
  | "READY"
  | "SCHEDULED"
  | "CONFIRMED"
  | "ARRIVED"
  | "COMPLETED"

export type PayoutReleaseState =
  | "NOT_APPLICABLE"
  | "HELD"
  | "READY"
  | "RELEASED"
  | "BLOCKED"

export type RefundHoldState =
  | "NONE"
  | "REQUESTED"
  | "APPROVED"
  | "DENIED"
  | "COMPLETED"
  | "HOLD"

// ---------------------------------------------------------------------------
// Compliance Reason Codes
// ---------------------------------------------------------------------------

export type ComplianceHoldReasonCode =
  | "MANUAL_HOLD"
  | "HIGH_RISK_DEALER"
  | "SELF_REFERRAL_DETECTED"
  | "AFFILIATE_FRAUD"
  | "CIRCUMVENTION_ALERT"
  | "IDENTITY_UNVERIFIED"
  | "CONTRACT_INTEGRITY_FAILURE"
  | "PAYMENT_DISPUTE"
  | "DOCUMENT_MISMATCH"
  | "CMA_REVOKED"
  | "PREQUAL_EXPIRED"
  | "INSURANCE_LAPSED"

// ---------------------------------------------------------------------------
// Input Signals
// ---------------------------------------------------------------------------

export interface BuyerSignals {
  buyerId: string
  profileComplete: boolean
  prequal: {
    exists: boolean
    source: "INTERNAL" | "EXTERNAL_MANUAL" | "PROVIDER_BACKED" | null
    status: string | null
    creditTier: string | null
    maxOtd: number | null
    expiresAt: string | null
    softPullCompleted: boolean
    consentGiven: boolean
  }
  externalPreApproval: {
    exists: boolean
    status: string | null
    approvedAmount: number | null
    reviewedAt: string | null
  }
  cashBasis: boolean
  identityVerified: boolean
  complianceFlags: ComplianceHoldReasonCode[]
  manualHold: boolean
}

export interface DealerSignals {
  dealerId: string
  verified: boolean
  integrityScore: number
  highRisk: boolean
  complianceFlags: ComplianceHoldReasonCode[]
  manualHold: boolean
}

export interface DealSignals {
  dealId: string
  dealStatus: string
  paymentType: string | null
  financingApproved: boolean
  feeStatus: string | null
  feePaid: boolean
  insuranceStatus: string | null
  insuranceComplete: boolean
  contractUploaded: boolean
  contractScanStatus: string | null
  contractScanPassed: boolean
  cmaStatus: string | null
  cmaApproved: boolean
  esignStatus: string | null
  esignCompleted: boolean
  pickupStatus: string | null
  payoutStatus: string | null
  refundStatus: string | null
  complianceFlags: ComplianceHoldReasonCode[]
  manualHold: boolean
}

export interface AffiliateSignals {
  affiliateId: string | null
  selfReferral: boolean
  fraudDetected: boolean
  complianceFlags: ComplianceHoldReasonCode[]
}

export interface DecisionInputs {
  buyer: BuyerSignals
  dealer: DealerSignals | null
  deal: DealSignals | null
  affiliate: AffiliateSignals | null
  timestamp: string
  correlationId: string
}

// ---------------------------------------------------------------------------
// Decision Output DTO
// ---------------------------------------------------------------------------

export interface DecisionOutput {
  buyerReadinessState: BuyerReadinessState
  buyerMessagingEligibilityState: BuyerMessagingEligibilityState
  dealerOperationalState: DealerOperationalState | null
  dealProgressionState: DealProgressionState | null
  contractResolutionState: ContractResolutionState | null
  esignReadinessState: ESignReadinessState | null
  pickupReadinessState: PickupReadinessState | null
  payoutReleaseState: PayoutReleaseState | null
  refundHoldState: RefundHoldState | null
  manualReviewRequired: boolean
  complianceHoldReasonCodes: ComplianceHoldReasonCode[]
  decisionSourceSummary: DecisionSourceEntry[]
  resolvedAt: string
  correlationId: string
}

export interface DecisionSourceEntry {
  signal: string
  source: string
  value: string
  contribution: string
}
