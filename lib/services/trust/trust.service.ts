/**
 * Phase 10 — Trust, Compliance & Moderation Service
 *
 * Canonical trust-control layer for trust flags, reviews, compliance cases,
 * moderation actions, retention policies, and retention holds.
 *
 * All tables are raw Supabase tables (not Prisma models).
 */

import { getSupabase } from "@/lib/db"
import { logger } from "@/lib/logger"

// ---------------------------------------------------------------------------
// Constants / Enums
// ---------------------------------------------------------------------------

export const TrustEntityType = {
  INVENTORY_LISTING: "INVENTORY_LISTING",
  CANONICAL_VEHICLE: "CANONICAL_VEHICLE",
  EXTERNAL_DEALER: "EXTERNAL_DEALER",
  DEALER: "DEALER",
  BUYER: "BUYER",
  INVENTORY_LEAD: "INVENTORY_LEAD",
  SOURCING_CASE: "SOURCING_CASE",
  SOURCING_INVITE: "SOURCING_INVITE",
  SOURCING_OFFER: "SOURCING_OFFER",
  CASE_CONVERSION: "CASE_CONVERSION",
  SELECTED_DEAL: "SELECTED_DEAL",
  DOCUMENT: "DOCUMENT",
} as const
export type TrustEntityType = (typeof TrustEntityType)[keyof typeof TrustEntityType]

export const TrustSeverity = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const
export type TrustSeverity = (typeof TrustSeverity)[keyof typeof TrustSeverity]

export const TrustFlagSourceType = {
  SYSTEM: "SYSTEM",
  ADMIN: "ADMIN",
  DEALER: "DEALER",
  BUYER: "BUYER",
} as const
export type TrustFlagSourceType = (typeof TrustFlagSourceType)[keyof typeof TrustFlagSourceType]

export const TrustFlagStatus = {
  OPEN: "OPEN",
  IN_REVIEW: "IN_REVIEW",
  RESOLVED: "RESOLVED",
  DISMISSED: "DISMISSED",
} as const
export type TrustFlagStatus = (typeof TrustFlagStatus)[keyof typeof TrustFlagStatus]

export const ReviewStatus = {
  OPEN: "OPEN",
  IN_REVIEW: "IN_REVIEW",
  RESOLVED: "RESOLVED",
  ESCALATED: "ESCALATED",
  REJECTED: "REJECTED",
} as const
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus]

export const ComplianceCaseStatus = {
  OPEN: "OPEN",
  IN_REVIEW: "IN_REVIEW",
  RESOLVED: "RESOLVED",
  ESCALATED: "ESCALATED",
  REJECTED: "REJECTED",
} as const
export type ComplianceCaseStatus = (typeof ComplianceCaseStatus)[keyof typeof ComplianceCaseStatus]

export const ComplianceCasePriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const
export type ComplianceCasePriority = (typeof ComplianceCasePriority)[keyof typeof ComplianceCasePriority]

export const ModerationActionType = {
  SUPPRESS: "SUPPRESS",
  RESTORE: "RESTORE",
  BLOCK: "BLOCK",
  UNBLOCK: "UNBLOCK",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  ESCALATE: "ESCALATE",
  HOLD: "HOLD",
  RELEASE: "RELEASE",
} as const
export type ModerationActionType = (typeof ModerationActionType)[keyof typeof ModerationActionType]

export const RetentionAction = {
  DELETE: "DELETE",
  ARCHIVE: "ARCHIVE",
} as const
export type RetentionAction = (typeof RetentionAction)[keyof typeof RetentionAction]

export const HoldSource = {
  LEGAL: "LEGAL",
  COMPLIANCE: "COMPLIANCE",
  INVESTIGATION: "INVESTIGATION",
  ADMIN: "ADMIN",
} as const
export type HoldSource = (typeof HoldSource)[keyof typeof HoldSource]

// ---------------------------------------------------------------------------
// Trust Flags
// ---------------------------------------------------------------------------

export interface CreateTrustFlagInput {
  entityType: TrustEntityType
  entityId: string
  flagCode: string
  severity: TrustSeverity
  sourceType?: TrustFlagSourceType
  sourceUserId?: string | null
  payload?: Record<string, unknown>
}

export async function createTrustFlag(input: CreateTrustFlagInput) {
  const supabase = getSupabase()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("trust_flags")
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      flag_code: input.flagCode,
      severity: input.severity,
      source_type: input.sourceType ?? "SYSTEM",
      source_user_id: input.sourceUserId ?? null,
      status: "OPEN",
      payload: input.payload ?? {},
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error) {
    logger.error("[TrustService] Failed to create trust flag", { error, input })
    throw new Error(`Failed to create trust flag: ${error.message}`)
  }

  return data
}

export async function getTrustFlagsByEntity(entityType: string, entityId: string) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("trust_flags")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })

  if (error) {
    logger.error("[TrustService] Failed to fetch trust flags", { error, entityType, entityId })
    throw new Error(`Failed to fetch trust flags: ${error.message}`)
  }

  return data ?? []
}

export async function getOpenTrustFlags(options?: { severity?: string; limit?: number }) {
  const supabase = getSupabase()

  let query = supabase
    .from("trust_flags")
    .select("*")
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })

  if (options?.severity) {
    query = query.eq("severity", options.severity)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    logger.error("[TrustService] Failed to fetch open trust flags", { error })
    throw new Error(`Failed to fetch open trust flags: ${error.message}`)
  }

  return data ?? []
}

export async function updateTrustFlagStatus(flagId: string, status: string) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("trust_flags")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", flagId)
    .select()
    .single()

  if (error) {
    logger.error("[TrustService] Failed to update trust flag status", { error, flagId, status })
    throw new Error(`Failed to update trust flag status: ${error.message}`)
  }

  return data
}

// ---------------------------------------------------------------------------
// Trust Reviews
// ---------------------------------------------------------------------------

/** Structured human review linked to a trust flag. */
export interface CreateTrustReviewInput {
  /** UUID of the trust flag being reviewed. */
  trustFlagId: string
  /** User performing the review (null for system-initiated reviews). */
  reviewerUserId?: string | null
  /** Free-text reviewer notes. */
  notes?: string | null
  /** Arbitrary metadata attached to the review. */
  payload?: Record<string, unknown>
}

export async function createTrustReview(input: CreateTrustReviewInput) {
  const supabase = getSupabase()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("trust_reviews")
    .insert({
      trust_flag_id: input.trustFlagId,
      reviewer_user_id: input.reviewerUserId ?? null,
      review_status: "OPEN",
      notes: input.notes ?? null,
      payload: input.payload ?? {},
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error) {
    logger.error("[TrustService] Failed to create trust review", { error, input })
    throw new Error(`Failed to create trust review: ${error.message}`)
  }

  return data
}

export async function resolveTrustReview(
  reviewId: string,
  resolutionCode: string,
  reviewerUserId: string,
  notes?: string | null
) {
  const supabase = getSupabase()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("trust_reviews")
    .update({
      review_status: "RESOLVED",
      resolution_code: resolutionCode,
      reviewer_user_id: reviewerUserId,
      notes: notes ?? null,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", reviewId)
    .select()
    .single()

  if (error) {
    logger.error("[TrustService] Failed to resolve trust review", { error, reviewId })
    throw new Error(`Failed to resolve trust review: ${error.message}`)
  }

  return data
}

export async function getReviewsByFlagId(trustFlagId: string) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("trust_reviews")
    .select("*")
    .eq("trust_flag_id", trustFlagId)
    .order("created_at", { ascending: false })

  if (error) {
    logger.error("[TrustService] Failed to fetch reviews for flag", { error, trustFlagId })
    throw new Error(`Failed to fetch reviews: ${error.message}`)
  }

  return data ?? []
}

// ---------------------------------------------------------------------------
// Compliance Cases
// ---------------------------------------------------------------------------

export interface CreateComplianceCaseInput {
  caseType: string
  entityType: TrustEntityType
  entityId: string
  relatedFlagId?: string | null
  assignedAdminUserId?: string | null
  priority?: ComplianceCasePriority
  title?: string | null
  notes?: string | null
  payload?: Record<string, unknown>
}

export async function createComplianceCase(input: CreateComplianceCaseInput) {
  const supabase = getSupabase()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("compliance_cases")
    .insert({
      case_type: input.caseType,
      entity_type: input.entityType,
      entity_id: input.entityId,
      related_flag_id: input.relatedFlagId ?? null,
      status: "OPEN",
      assigned_admin_user_id: input.assignedAdminUserId ?? null,
      priority: input.priority ?? "MEDIUM",
      title: input.title ?? null,
      notes: input.notes ?? null,
      payload: input.payload ?? {},
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error) {
    logger.error("[TrustService] Failed to create compliance case", { error, input })
    throw new Error(`Failed to create compliance case: ${error.message}`)
  }

  return data
}

export async function updateComplianceCaseStatus(caseId: string, status: string, notes?: string) {
  const supabase = getSupabase()
  const now = new Date().toISOString()

  const update: Record<string, unknown> = { status, updated_at: now }
  if (notes !== undefined) {
    update.notes = notes
  }

  const { data, error } = await supabase
    .from("compliance_cases")
    .update(update)
    .eq("id", caseId)
    .select()
    .single()

  if (error) {
    logger.error("[TrustService] Failed to update compliance case", { error, caseId, status })
    throw new Error(`Failed to update compliance case: ${error.message}`)
  }

  return data
}

export async function getOpenComplianceCases(options?: { priority?: string; limit?: number }) {
  const supabase = getSupabase()

  let query = supabase
    .from("compliance_cases")
    .select("*")
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })

  if (options?.priority) {
    query = query.eq("priority", options.priority)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    logger.error("[TrustService] Failed to fetch open compliance cases", { error })
    throw new Error(`Failed to fetch open compliance cases: ${error.message}`)
  }

  return data ?? []
}

// ---------------------------------------------------------------------------
// Moderation Actions
// ---------------------------------------------------------------------------

export interface CreateModerationActionInput {
  entityType: TrustEntityType
  entityId: string
  actionType: ModerationActionType
  actorUserId?: string | null
  reasonCode?: string | null
  notes?: string | null
  payload?: Record<string, unknown>
}

export async function createModerationAction(input: CreateModerationActionInput) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("moderation_actions")
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      action_type: input.actionType,
      actor_user_id: input.actorUserId ?? null,
      reason_code: input.reasonCode ?? null,
      notes: input.notes ?? null,
      payload: input.payload ?? {},
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    logger.error("[TrustService] Failed to create moderation action", { error, input })
    throw new Error(`Failed to create moderation action: ${error.message}`)
  }

  return data
}

export async function getModerationHistory(entityType: string, entityId: string) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("moderation_actions")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })

  if (error) {
    logger.error("[TrustService] Failed to fetch moderation history", { error, entityType, entityId })
    throw new Error(`Failed to fetch moderation history: ${error.message}`)
  }

  return data ?? []
}

// ---------------------------------------------------------------------------
// Retention Policies
// ---------------------------------------------------------------------------

export async function getRetentionPolicies(activeOnly = true) {
  const supabase = getSupabase()

  let query = supabase
    .from("retention_policies")
    .select("*")
    .order("entity_type", { ascending: true })

  if (activeOnly) {
    query = query.eq("is_active", true)
  }

  const { data, error } = await query

  if (error) {
    logger.error("[TrustService] Failed to fetch retention policies", { error })
    throw new Error(`Failed to fetch retention policies: ${error.message}`)
  }

  return data ?? []
}

export async function getRetentionPolicyByKey(policyKey: string) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("retention_policies")
    .select("*")
    .eq("policy_key", policyKey)
    .single()

  if (error) {
    logger.error("[TrustService] Failed to fetch retention policy", { error, policyKey })
    throw new Error(`Failed to fetch retention policy: ${error.message}`)
  }

  return data
}

export async function updateRetentionPolicy(
  policyKey: string,
  updates: { retentionDays?: number; actionAfterExpiry?: string; isActive?: boolean }
) {
  const supabase = getSupabase()

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.retentionDays !== undefined) update.retention_days = updates.retentionDays
  if (updates.actionAfterExpiry !== undefined) update.action_after_expiry = updates.actionAfterExpiry
  if (updates.isActive !== undefined) update.is_active = updates.isActive

  const { data, error } = await supabase
    .from("retention_policies")
    .update(update)
    .eq("policy_key", policyKey)
    .select()
    .single()

  if (error) {
    logger.error("[TrustService] Failed to update retention policy", { error, policyKey })
    throw new Error(`Failed to update retention policy: ${error.message}`)
  }

  return data
}

// ---------------------------------------------------------------------------
// Retention Holds
// ---------------------------------------------------------------------------

export interface CreateRetentionHoldInput {
  entityType: TrustEntityType
  entityId: string
  holdReason: string
  holdSource?: HoldSource
  payload?: Record<string, unknown>
}

export async function createRetentionHold(input: CreateRetentionHoldInput) {
  const supabase = getSupabase()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("retention_holds")
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      hold_reason: input.holdReason,
      hold_source: input.holdSource ?? "LEGAL",
      is_active: true,
      payload: input.payload ?? {},
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error) {
    logger.error("[TrustService] Failed to create retention hold", { error, input })
    throw new Error(`Failed to create retention hold: ${error.message}`)
  }

  return data
}

export async function releaseRetentionHold(holdId: string) {
  const supabase = getSupabase()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("retention_holds")
    .update({
      is_active: false,
      released_at: now,
      updated_at: now,
    })
    .eq("id", holdId)
    .select()
    .single()

  if (error) {
    logger.error("[TrustService] Failed to release retention hold", { error, holdId })
    throw new Error(`Failed to release retention hold: ${error.message}`)
  }

  return data
}

export async function getActiveHoldsForEntity(entityType: string, entityId: string) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("retention_holds")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) {
    logger.error("[TrustService] Failed to fetch active holds", { error, entityType, entityId })
    throw new Error(`Failed to fetch active holds: ${error.message}`)
  }

  return data ?? []
}

export async function hasActiveHold(entityType: string, entityId: string): Promise<boolean> {
  const holds = await getActiveHoldsForEntity(entityType, entityId)
  return holds.length > 0
}
