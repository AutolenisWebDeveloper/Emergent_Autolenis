/**
 * DocuSign Constants — Canonical Configuration
 *
 * Centralized constants for DocuSign integration including
 * agreement status mapping, envelope events, and configuration.
 */

// ---------------------------------------------------------------------------
// Dealer Agreement Status
// ---------------------------------------------------------------------------

export const DealerAgreementStatus = {
  REQUIRED: "REQUIRED",
  DRAFTED: "DRAFTED",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  VIEWED: "VIEWED",
  SIGNED: "SIGNED",
  COMPLETED: "COMPLETED",
  DECLINED: "DECLINED",
  VOIDED: "VOIDED",
  EXPIRED: "EXPIRED",
  ERROR: "ERROR",
} as const

export type DealerAgreementStatus =
  (typeof DealerAgreementStatus)[keyof typeof DealerAgreementStatus]

// ---------------------------------------------------------------------------
// DocuSign Envelope Status → DealerAgreementStatus Mapping
// ---------------------------------------------------------------------------

export const DOCUSIGN_STATUS_MAP: Record<string, DealerAgreementStatus> = {
  sent: DealerAgreementStatus.SENT,
  delivered: DealerAgreementStatus.DELIVERED,
  completed: DealerAgreementStatus.COMPLETED,
  declined: DealerAgreementStatus.DECLINED,
  voided: DealerAgreementStatus.VOIDED,
}

// ---------------------------------------------------------------------------
// DocuSign Connect Envelope Events
// ---------------------------------------------------------------------------

export const DOCUSIGN_ENVELOPE_EVENTS = [
  "sent",
  "delivered",
  "completed",
  "declined",
  "voided",
] as const

// ---------------------------------------------------------------------------
// Default Agreement Version
// ---------------------------------------------------------------------------

export const DEALER_AGREEMENT_VERSION = "1.0"
export const DEALER_AGREEMENT_NAME = "AutoLenis Dealer Participation Agreement"
export const DEALER_AGREEMENT_TYPE = "DEALER_PARTICIPATION"

// ---------------------------------------------------------------------------
// DocuSign Signer Roles
// ---------------------------------------------------------------------------

export const DOCUSIGN_SIGNER_ROLE = "dealer_signer"
export const DOCUSIGN_AUTOLENIS_SIGNER_ROLE = "autolenis_signer"
export const DOCUSIGN_CC_ROLE = "autolenis_compliance"
