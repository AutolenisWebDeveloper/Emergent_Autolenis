/**
 * Dealer Onboarding — Canonical Types
 *
 * Defines the canonical status machine, access states, and input types
 * for the dealer onboarding workflow.
 */

// ---------------------------------------------------------------------------
// Application Status Machine
// ---------------------------------------------------------------------------

export const DealerApplicationStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  DOCS_REQUESTED: "DOCS_REQUESTED",
  AGREEMENT_SENT: "AGREEMENT_SENT",
  AGREEMENT_SIGNED: "AGREEMENT_SIGNED",
  COMPLIANCE_REVIEW: "COMPLIANCE_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
} as const

export type DealerApplicationStatus =
  (typeof DealerApplicationStatus)[keyof typeof DealerApplicationStatus]

// ---------------------------------------------------------------------------
// Access State
// ---------------------------------------------------------------------------

export const DealerAccessState = {
  NO_ACCESS: "NO_ACCESS",
  LIMITED_ACCESS: "LIMITED_ACCESS",
  MARKETPLACE_ENABLED: "MARKETPLACE_ENABLED",
  INVENTORY_ENABLED: "INVENTORY_ENABLED",
  FULLY_ACTIVE: "FULLY_ACTIVE",
  SUSPENDED: "SUSPENDED",
} as const

export type DealerAccessState =
  (typeof DealerAccessState)[keyof typeof DealerAccessState]

// ---------------------------------------------------------------------------
// Allowed Status Transitions
// ---------------------------------------------------------------------------

export const ALLOWED_STATUS_TRANSITIONS: Record<
  DealerApplicationStatus,
  DealerApplicationStatus[]
> = {
  [DealerApplicationStatus.DRAFT]: [
    DealerApplicationStatus.SUBMITTED,
  ],
  [DealerApplicationStatus.SUBMITTED]: [
    DealerApplicationStatus.UNDER_REVIEW,
    DealerApplicationStatus.REJECTED,
  ],
  [DealerApplicationStatus.UNDER_REVIEW]: [
    DealerApplicationStatus.DOCS_REQUESTED,
    DealerApplicationStatus.AGREEMENT_SENT,
    DealerApplicationStatus.REJECTED,
  ],
  [DealerApplicationStatus.DOCS_REQUESTED]: [
    DealerApplicationStatus.UNDER_REVIEW,
    DealerApplicationStatus.REJECTED,
  ],
  [DealerApplicationStatus.AGREEMENT_SENT]: [
    DealerApplicationStatus.AGREEMENT_SIGNED,
    DealerApplicationStatus.REJECTED,
  ],
  [DealerApplicationStatus.AGREEMENT_SIGNED]: [
    DealerApplicationStatus.COMPLIANCE_REVIEW,
  ],
  [DealerApplicationStatus.COMPLIANCE_REVIEW]: [
    DealerApplicationStatus.APPROVED,
    DealerApplicationStatus.DOCS_REQUESTED,
    DealerApplicationStatus.REJECTED,
  ],
  [DealerApplicationStatus.APPROVED]: [
    DealerApplicationStatus.SUSPENDED,
  ],
  [DealerApplicationStatus.REJECTED]: [
    DealerApplicationStatus.DRAFT,
  ],
  [DealerApplicationStatus.SUSPENDED]: [
    DealerApplicationStatus.UNDER_REVIEW,
  ],
}

// ---------------------------------------------------------------------------
// Dealer Document Types for onboarding uploads
// ---------------------------------------------------------------------------

export const DealerDocumentType = {
  DEALER_LICENSE: "DEALER_LICENSE",
  W9: "W9",
  INSURANCE_CERTIFICATE: "INSURANCE_CERTIFICATE",
  ACH_AUTHORIZATION: "ACH_AUTHORIZATION",
  DEALER_IDENTITY_DOC: "DEALER_IDENTITY_DOC",
  ADDITIONAL_COMPLIANCE_DOC: "ADDITIONAL_COMPLIANCE_DOC",
} as const

export type DealerDocumentType =
  (typeof DealerDocumentType)[keyof typeof DealerDocumentType]

// ---------------------------------------------------------------------------
// Storage path conventions
// ---------------------------------------------------------------------------

export function getDealerDocStoragePath(
  applicationId: string,
  docType: DealerDocumentType,
  filename: string,
): string {
  const folderMap: Record<DealerDocumentType, string> = {
    DEALER_LICENSE: "license",
    W9: "w9",
    INSURANCE_CERTIFICATE: "insurance",
    ACH_AUTHORIZATION: "ach",
    DEALER_IDENTITY_DOC: "identity",
    ADDITIONAL_COMPLIANCE_DOC: "additional",
  }
  return `dealer-docs/${applicationId}/${folderMap[docType]}/${filename}`
}

export function getDealerAgreementStoragePath(
  applicationId: string,
  envelopeId: string,
): string {
  return `contracts/dealer-agreements/${applicationId}/${envelopeId}.pdf`
}

// ---------------------------------------------------------------------------
// Input Types
// ---------------------------------------------------------------------------

export interface CreateApplicationInput {
  legalBusinessName: string
  dbaName?: string
  entityType?: string
  dealerLicenseNumber: string
  licenseState: string
  taxIdLast4?: string
  businessEmail: string
  businessPhone?: string
  websiteUrl?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  zipCode?: string
  principalName: string
  principalEmail: string
  principalPhone?: string
  applicantUserId?: string
  workspaceId?: string
}

export interface UploadDealerDocumentInput {
  applicationId: string
  docType: DealerDocumentType
  filename: string
  fileBuffer: Buffer
  uploaderId: string
}

// ---------------------------------------------------------------------------
// Activation gate check
// ---------------------------------------------------------------------------

export interface ActivationGateResult {
  ready: boolean
  missing: string[]
}

export function checkActivationGate(application: {
  status: string
  agreementSignedAt: string | Date | null
}): ActivationGateResult {
  const missing: string[] = []

  if (application.status !== DealerApplicationStatus.APPROVED) {
    missing.push("application_not_approved")
  }
  if (!application.agreementSignedAt) {
    missing.push("agreement_not_signed")
  }

  return { ready: missing.length === 0, missing }
}

// ---------------------------------------------------------------------------
// Dealer Agreement Enforcement
// ---------------------------------------------------------------------------

export interface DealerAgreementGateResult {
  allowed: boolean
  blockers: string[]
}

/**
 * Centralized enforcement check: is the dealer allowed to perform protected
 * actions that require a completed agreement?
 *
 * Checks:
 * - agreementRequired = true → agreementCompleted must be true
 * - docusignBlocked must be false
 * - accessState must not be 'SUSPENDED'
 *
 * Used by: dealer activation, inventory publishing, auction participation,
 * offer submission, contract actions, payout eligibility.
 */
export function checkDealerAgreementGate(dealer: {
  agreementRequired?: boolean
  agreementCompleted?: boolean
  docusignBlocked?: boolean
  accessState?: string | null
}): DealerAgreementGateResult {
  const blockers: string[] = []

  if (dealer.agreementRequired && !dealer.agreementCompleted) {
    blockers.push("AGREEMENT_INCOMPLETE")
  }

  if (dealer.docusignBlocked) {
    blockers.push("DOCUSIGN_BLOCKED")
  }

  if (dealer.accessState === "SUSPENDED") {
    blockers.push("DEALER_SUSPENDED")
  }

  return { allowed: blockers.length === 0, blockers }
}
