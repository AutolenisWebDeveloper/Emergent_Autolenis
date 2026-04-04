/**
 * Document and Identity Trust Infrastructure
 *
 * Canonical trust layer for sensitive documents and identity artifacts.
 */

// Document Trust
export {
  createDocumentTrustRecord,
  createDocumentTrustRecordAsync,
  verifyDocument,
  revokeDocument,
  getActiveDocumentTrust,
  getDocumentVersionChain,
  hasDocumentHashChanged,
  getDocumentById,
  resetDocumentStore,
  getDocumentStore,
} from "./document-trust"

// Identity Trust
export {
  upsertIdentityTrust,
  upsertIdentityTrustAsync,
  verifyIdentity,
  suspendIdentity,
  flagForManualReview,
  getIdentityTrust,
  isIdentityVerified,
  resetIdentityStore,
  getIdentityStore,
} from "./identity-trust"

// Types
export type {
  DocumentTrustRecord,
  DocumentTrustInput,
  DocumentVerificationInput,
  IdentityTrustRecord,
  IdentityTrustInput,
} from "./types"

export {
  DocumentTrustStatus,
  TrustDocumentType,
  OwnerEntityType,
  AccessScope,
  IdentityTrustStatus,
  VerificationSource,
} from "./types"

