/**
 * Document and Identity Trust Infrastructure — Document Trust Service
 *
 * Manages canonical trust records for platform documents with:
 * - Version control and hash integrity
 * - Verification and approval workflows
 * - Supersession chain management
 * - Active-for-decision tracking
 * - Revocation handling
 *
 * Uses Prisma-backed storage via DocumentTrustRecord model (table: trusted_documents).
 * Falls back to in-memory storage when Prisma is unavailable (e.g. in tests).
 */

import type {
  DocumentTrustRecord,
  DocumentTrustInput,
  DocumentVerificationInput,
  DocumentTrustStatus,
  TrustDocumentType,
  OwnerEntityType,
} from "./types"
import {
  DocumentTrustStatus as TrustStatus,
  AccessScope,
} from "./types"

// ---------------------------------------------------------------------------
// In-Memory Store (fallback when Prisma is unavailable, e.g. tests)
// ---------------------------------------------------------------------------

let documentStore: DocumentTrustRecord[] = []

export function resetDocumentStore(): void {
  documentStore = []
}

export function getDocumentStore(): ReadonlyArray<DocumentTrustRecord> {
  return documentStore
}

// ---------------------------------------------------------------------------
// Prisma Availability
// ---------------------------------------------------------------------------

function getPrismaClient(): any | null {
  try {
    const { getPrisma } = require("@/lib/db")
    return getPrisma()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Document Trust Operations
// ---------------------------------------------------------------------------

export interface DocumentWriteResult {
  success: boolean
  record: DocumentTrustRecord | null
  error: string | null
}

/**
 * Create a trust record for a new document upload (synchronous, in-memory).
 */
export function createDocumentTrustRecord(
  input: DocumentTrustInput
): DocumentWriteResult {
  if (!input.ownerEntityId) {
    return { success: false, record: null, error: "ownerEntityId is required" }
  }
  if (!input.documentType) {
    return { success: false, record: null, error: "documentType is required" }
  }
  if (!input.fileHash) {
    return { success: false, record: null, error: "fileHash is required" }
  }
  if (!input.uploaderId) {
    return { success: false, record: null, error: "uploaderId is required" }
  }
  if (!input.storageReference) {
    return { success: false, record: null, error: "storageReference is required" }
  }

  const existingDocs = documentStore.filter(
    (d) =>
      d.ownerEntityId === input.ownerEntityId &&
      d.ownerEntityType === input.ownerEntityType &&
      d.documentType === input.documentType
  )
  const versionNumber = existingDocs.length + 1

  for (const existing of existingDocs) {
    if (existing.activeForDecision) {
      existing.activeForDecision = false
      existing.status = TrustStatus.SUPERSEDED
      existing.updatedAt = new Date().toISOString()
    }
  }

  const now = new Date().toISOString()
  const record: DocumentTrustRecord = {
    id: crypto.randomUUID(),
    ownerEntityId: input.ownerEntityId,
    ownerEntityType: input.ownerEntityType,
    documentType: input.documentType,
    storageSource: input.storageSource,
    storageReference: input.storageReference,
    uploadTimestamp: now,
    uploaderId: input.uploaderId,
    fileHash: input.fileHash,
    versionNumber,
    status: TrustStatus.UPLOADED,
    verificationMetadata: null,
    verifierId: null,
    verifiedAt: null,
    supersededById: null,
    revocationReason: null,
    revokedAt: null,
    revokedById: null,
    activeForDecision: true,
    accessScope: input.accessScope ?? AccessScope.DEAL_PARTIES,
    createdAt: now,
    updatedAt: now,
  }

  if (existingDocs.length > 0) {
    const previousVersion = existingDocs[existingDocs.length - 1]
    previousVersion.supersededById = record.id
    previousVersion.updatedAt = now
  }

  documentStore.push(record)

  return { success: true, record, error: null }
}

/**
 * Create a trust record via Prisma (async, database-backed).
 * Falls back to synchronous in-memory when Prisma is unavailable.
 */
export async function createDocumentTrustRecordAsync(
  input: DocumentTrustInput
): Promise<DocumentWriteResult> {
  if (!input.ownerEntityId) {
    return { success: false, record: null, error: "ownerEntityId is required" }
  }
  if (!input.documentType) {
    return { success: false, record: null, error: "documentType is required" }
  }
  if (!input.fileHash) {
    return { success: false, record: null, error: "fileHash is required" }
  }
  if (!input.uploaderId) {
    return { success: false, record: null, error: "uploaderId is required" }
  }
  if (!input.storageReference) {
    return { success: false, record: null, error: "storageReference is required" }
  }

  const db = getPrismaClient()
  if (!db) {
    return createDocumentTrustRecord(input)
  }

  try {
    // Count existing versions via DB
    const existingCount = await db.documentTrustRecord.count({
      where: {
        ownerEntityId: input.ownerEntityId,
        ownerEntityType: input.ownerEntityType,
        documentType: input.documentType,
      },
    })
    const versionNumber = existingCount + 1

    // Mark previous active versions as superseded
    await db.documentTrustRecord.updateMany({
      where: {
        ownerEntityId: input.ownerEntityId,
        ownerEntityType: input.ownerEntityType,
        documentType: input.documentType,
        activeForDecision: true,
      },
      data: {
        activeForDecision: false,
        status: "SUPERSEDED",
      },
    })

    const row = await db.documentTrustRecord.create({
      data: {
        ownerEntityId: input.ownerEntityId,
        ownerEntityType: input.ownerEntityType,
        documentType: input.documentType,
        storageSource: input.storageSource,
        storageReference: input.storageReference,
        uploaderId: input.uploaderId,
        fileHash: input.fileHash,
        versionNumber,
        status: "UPLOADED",
        activeForDecision: true,
        accessScope: input.accessScope ?? "DEAL_PARTIES",
      },
    })

    return { success: true, record: mapDbRowToDocRecord(row), error: null }
  } catch (err: any) {
    return { success: false, record: null, error: err?.message ?? "Unknown error" }
  }
}

function mapDbRowToDocRecord(row: any): DocumentTrustRecord {
  return {
    id: row.id,
    ownerEntityId: row.ownerEntityId,
    ownerEntityType: row.ownerEntityType,
    documentType: row.documentType,
    storageSource: row.storageSource,
    storageReference: row.storageReference,
    uploadTimestamp: row.uploadTimestamp instanceof Date ? row.uploadTimestamp.toISOString() : String(row.uploadTimestamp),
    uploaderId: row.uploaderId,
    fileHash: row.fileHash,
    versionNumber: row.versionNumber,
    status: row.status,
    verificationMetadata: row.verificationMetadata,
    verifierId: row.verifierId,
    verifiedAt: row.verifiedAt instanceof Date ? row.verifiedAt.toISOString() : row.verifiedAt,
    supersededById: row.supersededById,
    revocationReason: row.revocationReason,
    revokedAt: row.revokedAt instanceof Date ? row.revokedAt.toISOString() : row.revokedAt,
    revokedById: row.revokedById,
    activeForDecision: row.activeForDecision,
    accessScope: row.accessScope,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }
}

/**
 * Verify/approve a document trust record.
 */
export function verifyDocument(
  input: DocumentVerificationInput
): DocumentWriteResult {
  const record = documentStore.find((d) => d.id === input.documentId)
  if (!record) {
    return { success: false, record: null, error: "Document not found" }
  }

  const nonVerifiableStatuses: DocumentTrustStatus[] = [
    TrustStatus.SUPERSEDED,
    TrustStatus.REVOKED,
    TrustStatus.EXPIRED,
  ]
  if (nonVerifiableStatuses.includes(record.status)) {
    return {
      success: false,
      record: null,
      error: `Cannot verify document in ${record.status} status`,
    }
  }

  const now = new Date().toISOString()
  record.status = input.status
  record.verifierId = input.verifierId
  record.verifiedAt = now
  record.verificationMetadata = input.verificationMetadata ?? null
  record.updatedAt = now

  if (input.status === TrustStatus.APPROVED) {
    record.activeForDecision = true
  }

  return { success: true, record, error: null }
}

/**
 * Revoke a document trust record.
 */
export function revokeDocument(
  documentId: string,
  revokedById: string,
  reason: string
): DocumentWriteResult {
  const record = documentStore.find((d) => d.id === documentId)
  if (!record) {
    return { success: false, record: null, error: "Document not found" }
  }

  if (record.status === TrustStatus.REVOKED) {
    return { success: false, record: null, error: "Document already revoked" }
  }

  const now = new Date().toISOString()
  record.status = TrustStatus.REVOKED
  record.revokedAt = now
  record.revokedById = revokedById
  record.revocationReason = reason
  record.activeForDecision = false
  record.updatedAt = now

  return { success: true, record, error: null }
}

/**
 * Get the active trust record for a specific document type and owner.
 */
export function getActiveDocumentTrust(
  ownerEntityId: string,
  ownerEntityType: OwnerEntityType,
  documentType: TrustDocumentType
): DocumentTrustRecord | null {
  return (
    documentStore.find(
      (d) =>
        d.ownerEntityId === ownerEntityId &&
        d.ownerEntityType === ownerEntityType &&
        d.documentType === documentType &&
        d.activeForDecision
    ) ?? null
  )
}

/**
 * Get the full version chain for a document type/owner.
 */
export function getDocumentVersionChain(
  ownerEntityId: string,
  ownerEntityType: OwnerEntityType,
  documentType: TrustDocumentType
): DocumentTrustRecord[] {
  return documentStore
    .filter(
      (d) =>
        d.ownerEntityId === ownerEntityId &&
        d.ownerEntityType === ownerEntityType &&
        d.documentType === documentType
    )
    .sort((a, b) => a.versionNumber - b.versionNumber)
}

/**
 * Check if a document hash has changed from the active version.
 */
export function hasDocumentHashChanged(
  ownerEntityId: string,
  ownerEntityType: OwnerEntityType,
  documentType: TrustDocumentType,
  currentHash: string
): boolean {
  const active = getActiveDocumentTrust(
    ownerEntityId,
    ownerEntityType,
    documentType
  )
  if (!active) return false
  return active.fileHash !== currentHash
}

/**
 * Get a document by ID.
 */
export function getDocumentById(
  documentId: string
): DocumentTrustRecord | null {
  return documentStore.find((d) => d.id === documentId) ?? null
}
