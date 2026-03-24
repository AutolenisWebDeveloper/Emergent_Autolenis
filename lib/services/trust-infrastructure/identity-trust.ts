/**
 * Document and Identity Trust Infrastructure — Identity Trust Service
 *
 * Manages canonical identity trust state for platform actors (buyers,
 * dealers, admins) including verification tracking and risk flags.
 *
 * Uses Prisma-backed storage via IdentityTrustRecord model (table: identity_trust_records).
 * Falls back to in-memory storage when Prisma is unavailable (e.g. in tests).
 */

import type {
  IdentityTrustRecord,
  IdentityTrustInput,
  OwnerEntityType,
  VerificationSource,
} from "./types"
import {
  IdentityTrustStatus as TrustStatus,
} from "./types"

// ---------------------------------------------------------------------------
// In-Memory Store (fallback when Prisma is unavailable, e.g. tests)
// ---------------------------------------------------------------------------

let identityStore: IdentityTrustRecord[] = []

export function resetIdentityStore(): void {
  identityStore = []
}

export function getIdentityStore(): ReadonlyArray<IdentityTrustRecord> {
  return identityStore
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
// Identity Trust Operations
// ---------------------------------------------------------------------------

export interface IdentityWriteResult {
  success: boolean
  record: IdentityTrustRecord | null
  error: string | null
}

/**
 * Create or update an identity trust record (synchronous, in-memory).
 */
export function upsertIdentityTrust(
  input: IdentityTrustInput
): IdentityWriteResult {
  if (!input.entityId) {
    return { success: false, record: null, error: "entityId is required" }
  }
  if (!input.entityType) {
    return { success: false, record: null, error: "entityType is required" }
  }

  const existing = identityStore.find(
    (r) =>
      r.entityId === input.entityId &&
      r.entityType === input.entityType
  )

  const now = new Date().toISOString()

  if (existing) {
    existing.trustFlags = input.trustFlags ?? existing.trustFlags
    existing.riskFlags = input.riskFlags ?? existing.riskFlags
    existing.verificationSource = input.verificationSource ?? existing.verificationSource
    existing.lastAssessedAt = now
    existing.updatedAt = now
    return { success: true, record: existing, error: null }
  }

  const record: IdentityTrustRecord = {
    id: crypto.randomUUID(),
    entityId: input.entityId,
    entityType: input.entityType,
    status: TrustStatus.UNVERIFIED,
    verificationSource: input.verificationSource ?? null,
    verifiedAt: null,
    verifierId: null,
    trustFlags: input.trustFlags ?? [],
    riskFlags: input.riskFlags ?? [],
    manualReviewRequired: false,
    kycStatus: null,
    kybStatus: null,
    lastAssessedAt: now,
    createdAt: now,
    updatedAt: now,
  }

  identityStore.push(record)

  return { success: true, record, error: null }
}

/**
 * Create or update via Prisma (async, database-backed).
 * Falls back to synchronous in-memory when Prisma is unavailable.
 */
export async function upsertIdentityTrustAsync(
  input: IdentityTrustInput
): Promise<IdentityWriteResult> {
  if (!input.entityId) {
    return { success: false, record: null, error: "entityId is required" }
  }
  if (!input.entityType) {
    return { success: false, record: null, error: "entityType is required" }
  }

  const db = getPrismaClient()
  if (!db) {
    return upsertIdentityTrust(input)
  }

  try {
    const row = await db.identityTrustRecord.upsert({
      where: {
        entityId_entityType: {
          entityId: input.entityId,
          entityType: input.entityType,
        },
      },
      create: {
        entityId: input.entityId,
        entityType: input.entityType,
        status: "UNVERIFIED",
        verificationSource: input.verificationSource ?? null,
        trustFlags: input.trustFlags ?? [],
        riskFlags: input.riskFlags ?? [],
        lastAssessedAt: new Date(),
      },
      update: {
        trustFlags: input.trustFlags,
        riskFlags: input.riskFlags,
        verificationSource: input.verificationSource,
        lastAssessedAt: new Date(),
      },
    })

    return { success: true, record: mapDbRowToIdentityRecord(row), error: null }
  } catch (err: any) {
    return { success: false, record: null, error: err?.message ?? "Unknown error" }
  }
}

function mapDbRowToIdentityRecord(row: any): IdentityTrustRecord {
  return {
    id: row.id,
    entityId: row.entityId,
    entityType: row.entityType,
    status: row.status,
    verificationSource: row.verificationSource,
    verifiedAt: row.verifiedAt instanceof Date ? row.verifiedAt.toISOString() : row.verifiedAt,
    verifierId: row.verifierId,
    trustFlags: row.trustFlags ?? [],
    riskFlags: row.riskFlags ?? [],
    manualReviewRequired: row.manualReviewRequired,
    kycStatus: row.kycStatus,
    kybStatus: row.kybStatus,
    lastAssessedAt: row.lastAssessedAt instanceof Date ? row.lastAssessedAt.toISOString() : row.lastAssessedAt,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  }
}

/**
 * Mark an identity as verified.
 */
export function verifyIdentity(
  entityId: string,
  entityType: OwnerEntityType,
  verifierId: string,
  source: VerificationSource,
  metadata?: { kycStatus?: string; kybStatus?: string }
): IdentityWriteResult {
  const record = identityStore.find(
    (r) => r.entityId === entityId && r.entityType === entityType
  )

  if (!record) {
    return { success: false, record: null, error: "Identity record not found" }
  }

  const now = new Date().toISOString()
  record.status = TrustStatus.VERIFIED
  record.verifiedAt = now
  record.verifierId = verifierId
  record.verificationSource = source
  record.manualReviewRequired = false
  record.lastAssessedAt = now
  record.updatedAt = now

  if (metadata?.kycStatus) record.kycStatus = metadata.kycStatus
  if (metadata?.kybStatus) record.kybStatus = metadata.kybStatus

  return { success: true, record, error: null }
}

/**
 * Suspend an identity trust record.
 */
export function suspendIdentity(
  entityId: string,
  entityType: OwnerEntityType,
  reason: string
): IdentityWriteResult {
  const record = identityStore.find(
    (r) => r.entityId === entityId && r.entityType === entityType
  )

  if (!record) {
    return { success: false, record: null, error: "Identity record not found" }
  }

  const now = new Date().toISOString()
  record.status = TrustStatus.SUSPENDED
  record.riskFlags = [...record.riskFlags, reason]
  record.lastAssessedAt = now
  record.updatedAt = now

  return { success: true, record, error: null }
}

/**
 * Flag an identity for manual review.
 */
export function flagForManualReview(
  entityId: string,
  entityType: OwnerEntityType,
  flags: string[]
): IdentityWriteResult {
  const record = identityStore.find(
    (r) => r.entityId === entityId && r.entityType === entityType
  )

  if (!record) {
    return { success: false, record: null, error: "Identity record not found" }
  }

  const now = new Date().toISOString()
  record.manualReviewRequired = true
  record.riskFlags = [...new Set([...record.riskFlags, ...flags])]
  record.lastAssessedAt = now
  record.updatedAt = now

  return { success: true, record, error: null }
}

/**
 * Get the identity trust record for an entity.
 */
export function getIdentityTrust(
  entityId: string,
  entityType: OwnerEntityType
): IdentityTrustRecord | null {
  return (
    identityStore.find(
      (r) => r.entityId === entityId && r.entityType === entityType
    ) ?? null
  )
}

/**
 * Check if an entity's identity is verified.
 */
export function isIdentityVerified(
  entityId: string,
  entityType: OwnerEntityType
): boolean {
  const record = getIdentityTrust(entityId, entityType)
  return record?.status === TrustStatus.VERIFIED
}
