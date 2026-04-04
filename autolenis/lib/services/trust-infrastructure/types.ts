/**
 * Document and Identity Trust Infrastructure — Canonical Types
 *
 * Defines trust models for documents and identity artifacts,
 * including version control, hash integrity, and verification status.
 */

// ---------------------------------------------------------------------------
// Document Trust Status
// ---------------------------------------------------------------------------

export const DocumentTrustStatus = {
  UPLOADED: "UPLOADED",
  SCANNED: "SCANNED",
  VERIFIED: "VERIFIED",
  APPROVED: "APPROVED",
  LOCKED: "LOCKED",
  SUPERSEDED: "SUPERSEDED",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
} as const

export type DocumentTrustStatus =
  (typeof DocumentTrustStatus)[keyof typeof DocumentTrustStatus]

// ---------------------------------------------------------------------------
// Document Type
// ---------------------------------------------------------------------------

export const TrustDocumentType = {
  CONTRACT: "CONTRACT",
  EXTERNAL_PREAPPROVAL: "EXTERNAL_PREAPPROVAL",
  CMA_EVIDENCE: "CMA_EVIDENCE",
  INSURANCE_PROOF: "INSURANCE_PROOF",
  DEALER_LICENSE: "DEALER_LICENSE",
  DEALER_COMPLIANCE: "DEALER_COMPLIANCE",
  ID_DOCUMENT: "ID_DOCUMENT",
  PAY_STUB: "PAY_STUB",
  BANK_STATEMENT: "BANK_STATEMENT",
  TRADE_IN_TITLE: "TRADE_IN_TITLE",
  OTHER: "OTHER",
  // Dealer onboarding document types
  DEALER_AGREEMENT: "DEALER_AGREEMENT",
  DEALER_AGREEMENT_PDF: "DEALER_AGREEMENT_PDF",
  DEALER_AGREEMENT_CERTIFICATE: "DEALER_AGREEMENT_CERTIFICATE",
  W9: "W9",
  INSURANCE_CERTIFICATE: "INSURANCE_CERTIFICATE",
  ACH_AUTHORIZATION: "ACH_AUTHORIZATION",
  DEALER_IDENTITY_DOC: "DEALER_IDENTITY_DOC",
  ADDITIONAL_COMPLIANCE_DOC: "ADDITIONAL_COMPLIANCE_DOC",
} as const

export type TrustDocumentType =
  (typeof TrustDocumentType)[keyof typeof TrustDocumentType]

// ---------------------------------------------------------------------------
// Owner Entity Type
// ---------------------------------------------------------------------------

export const OwnerEntityType = {
  BUYER: "BUYER",
  DEALER: "DEALER",
  DEALER_APPLICATION: "DEALER_APPLICATION",
  ADMIN: "ADMIN",
  AFFILIATE: "AFFILIATE",
  DEAL: "DEAL",
} as const

export type OwnerEntityType =
  (typeof OwnerEntityType)[keyof typeof OwnerEntityType]

// ---------------------------------------------------------------------------
// Access Scope
// ---------------------------------------------------------------------------

export const AccessScope = {
  PUBLIC: "PUBLIC",
  OWNER_ONLY: "OWNER_ONLY",
  DEAL_PARTIES: "DEAL_PARTIES",
  ADMIN_ONLY: "ADMIN_ONLY",
  SYSTEM_ONLY: "SYSTEM_ONLY",
} as const

export type AccessScope = (typeof AccessScope)[keyof typeof AccessScope]

// ---------------------------------------------------------------------------
// Identity Trust Status
// ---------------------------------------------------------------------------

export const IdentityTrustStatus = {
  UNVERIFIED: "UNVERIFIED",
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  VERIFIED: "VERIFIED",
  FAILED: "FAILED",
  SUSPENDED: "SUSPENDED",
  REVOKED: "REVOKED",
} as const

export type IdentityTrustStatus =
  (typeof IdentityTrustStatus)[keyof typeof IdentityTrustStatus]

// ---------------------------------------------------------------------------
// Verification Source
// ---------------------------------------------------------------------------

export const VerificationSource = {
  MANUAL_ADMIN: "MANUAL_ADMIN",
  KYC_PROVIDER: "KYC_PROVIDER",
  KYB_PROVIDER: "KYB_PROVIDER",
  DOCUMENT_SCAN: "DOCUMENT_SCAN",
  PLATFORM_INTERNAL: "PLATFORM_INTERNAL",
} as const

export type VerificationSource =
  (typeof VerificationSource)[keyof typeof VerificationSource]

// ---------------------------------------------------------------------------
// Document Trust Record
// ---------------------------------------------------------------------------

export interface DocumentTrustRecord {
  id: string
  ownerEntityId: string
  ownerEntityType: OwnerEntityType
  documentType: TrustDocumentType
  storageSource: string
  storageReference: string
  uploadTimestamp: string
  uploaderId: string
  fileHash: string
  versionNumber: number
  status: DocumentTrustStatus
  verificationMetadata: Record<string, unknown> | null
  verifierId: string | null
  verifiedAt: string | null
  supersededById: string | null
  revocationReason: string | null
  revokedAt: string | null
  revokedById: string | null
  activeForDecision: boolean
  accessScope: AccessScope
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Identity Trust Record
// ---------------------------------------------------------------------------

export interface IdentityTrustRecord {
  id: string
  entityId: string
  entityType: OwnerEntityType
  status: IdentityTrustStatus
  verificationSource: VerificationSource | null
  verifiedAt: string | null
  verifierId: string | null
  trustFlags: string[]
  riskFlags: string[]
  manualReviewRequired: boolean
  kycStatus: string | null
  kybStatus: string | null
  lastAssessedAt: string | null
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Document Trust Input
// ---------------------------------------------------------------------------

export interface DocumentTrustInput {
  ownerEntityId: string
  ownerEntityType: OwnerEntityType
  documentType: TrustDocumentType
  storageSource: string
  storageReference: string
  uploaderId: string
  fileHash: string
  accessScope?: AccessScope
}

// ---------------------------------------------------------------------------
// Document Verification Input
// ---------------------------------------------------------------------------

export interface DocumentVerificationInput {
  documentId: string
  verifierId: string
  status: DocumentTrustStatus
  verificationMetadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Identity Trust Input
// ---------------------------------------------------------------------------

export interface IdentityTrustInput {
  entityId: string
  entityType: OwnerEntityType
  verificationSource?: VerificationSource
  trustFlags?: string[]
  riskFlags?: string[]
}
