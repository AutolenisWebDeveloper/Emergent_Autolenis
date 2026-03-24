/**
 * Workflow SLA Service
 *
 * Evaluates configurable SLA rules against workflow entities
 * and records violations, reminders, escalations, and expirations.
 *
 * Uses the workflow_sla_rules and workflow_sla_events Supabase tables.
 */

import { getSupabase } from "@/lib/db"
import { logger } from "@/lib/logger"

// ── Types ────────────────────────────────────────────────────────────────

export type WorkflowType =
  | "INVENTORY_LEAD"
  | "SOURCING_CASE"
  | "SOURCING_INVITE"
  | "SOURCING_OFFER"
  | "CASE_CONVERSION"

export type SlaActionType =
  | "REMINDER"
  | "ESCALATION"
  | "EXPIRED"
  | "STUCK"
  | "FOLLOW_UP_DUE"
  | "NO_RESPONSE"

export interface SlaRule {
  id: string
  workflow_type: WorkflowType
  rule_key: string
  threshold_minutes: number
  action_type: SlaActionType
  is_active: boolean
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SlaEvent {
  id: string
  workflow_type: WorkflowType
  entity_id: string
  rule_key: string
  event_type: SlaActionType
  payload: Record<string, unknown>
  resolved: boolean
  resolved_at: string | null
  created_at: string
}

export interface SlaViolation {
  entityId: string
  ruleKey: string
  workflowType: WorkflowType
  actionType: SlaActionType
  thresholdMinutes: number
  rulePayload: Record<string, unknown>
}

// ── Rule management ──────────────────────────────────────────────────────

/**
 * Fetch all active SLA rules, optionally filtered by workflow type.
 */
export async function getActiveRules(
  workflowType?: WorkflowType,
): Promise<SlaRule[]> {
  try {
    const supabase = getSupabase()

    let query = supabase
      .from("workflow_sla_rules")
      .select("*")
      .eq("is_active", true)

    if (workflowType) {
      query = query.eq("workflow_type", workflowType)
    }

    const { data, error } = await query.order("workflow_type")

    if (error) {
      logger.error("Failed to fetch SLA rules", { error: error.message })
      return []
    }

    return (data ?? []) as SlaRule[]
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error("getActiveRules unexpected error", { error: message })
    return []
  }
}

// ── Event recording ──────────────────────────────────────────────────────

/**
 * Check whether an SLA event already exists (unresolved) for an entity + rule.
 * Prevents duplicate events from being recorded.
 */
export async function hasUnresolvedEvent(
  workflowType: WorkflowType,
  entityId: string,
  ruleKey: string,
): Promise<boolean> {
  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("workflow_sla_events")
      .select("id")
      .eq("workflow_type", workflowType)
      .eq("entity_id", entityId)
      .eq("rule_key", ruleKey)
      .eq("resolved", false)
      .limit(1)

    if (error) {
      logger.error("Failed to check unresolved SLA event", { error: error.message })
      return false
    }

    return (data?.length ?? 0) > 0
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error("hasUnresolvedEvent unexpected error", { error: message })
    return false
  }
}

/**
 * Record a new SLA event (violation, reminder, escalation, expiration).
 */
export async function recordSlaEvent(
  violation: SlaViolation,
): Promise<SlaEvent | null> {
  try {
    // Deduplicate: skip if an unresolved event already exists
    const existing = await hasUnresolvedEvent(
      violation.workflowType,
      violation.entityId,
      violation.ruleKey,
    )

    if (existing) {
      logger.debug("SLA event already exists (skipping)", {
        workflowType: violation.workflowType,
        entityId: violation.entityId,
        ruleKey: violation.ruleKey,
      })
      return null
    }

    const supabase = getSupabase()

    const row = {
      workflow_type: violation.workflowType,
      entity_id: violation.entityId,
      rule_key: violation.ruleKey,
      event_type: violation.actionType,
      payload: violation.rulePayload,
      resolved: false,
    }

    const { data, error } = await supabase
      .from("workflow_sla_events")
      .insert(row)
      .select()
      .single()

    if (error) {
      logger.error("Failed to record SLA event", {
        error: error.message,
        ruleKey: violation.ruleKey,
        entityId: violation.entityId,
      })
      return null
    }

    return data as SlaEvent
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error("recordSlaEvent unexpected error", { error: message })
    return null
  }
}

/**
 * Resolve an SLA event (e.g., when the entity is updated or the issue is addressed).
 */
export async function resolveSlaEvent(eventId: string): Promise<boolean> {
  try {
    const supabase = getSupabase()

    const { error } = await supabase
      .from("workflow_sla_events")
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", eventId)

    if (error) {
      logger.error("Failed to resolve SLA event", { error: error.message, eventId })
      return false
    }

    return true
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error("resolveSlaEvent unexpected error", { error: message, eventId })
    return false
  }
}

/**
 * Resolve all unresolved SLA events for a given entity.
 */
export async function resolveAllForEntity(
  workflowType: WorkflowType,
  entityId: string,
): Promise<boolean> {
  try {
    const supabase = getSupabase()

    const { error } = await supabase
      .from("workflow_sla_events")
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq("workflow_type", workflowType)
      .eq("entity_id", entityId)
      .eq("resolved", false)

    if (error) {
      logger.error("Failed to resolve all SLA events for entity", {
        error: error.message,
        workflowType,
        entityId,
      })
      return false
    }

    return true
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error("resolveAllForEntity unexpected error", { error: message })
    return false
  }
}

// ── SLA evaluation ───────────────────────────────────────────────────────

/**
 * Entity descriptor used by the evaluation engine.
 * Each entity has an ID, a creation timestamp, and an optional status.
 */
export interface EvaluableEntity {
  id: string
  created_at: string
  status?: string | null
  updated_at?: string | null
}

/**
 * Evaluate a set of entities against a set of SLA rules.
 * Returns the violations found.
 *
 * The caller is responsible for fetching the entities (e.g., leads, cases)
 * and passing the appropriate rules.
 */
export function evaluateEntities(
  entities: EvaluableEntity[],
  rules: SlaRule[],
  now: Date = new Date(),
): SlaViolation[] {
  const violations: SlaViolation[] = []

  for (const entity of entities) {
    const entityAge = now.getTime() - new Date(entity.created_at).getTime()
    const entityAgeMinutes = entityAge / (1000 * 60)

    for (const rule of rules) {
      if (entityAgeMinutes >= rule.threshold_minutes) {
        violations.push({
          entityId: entity.id,
          ruleKey: rule.rule_key,
          workflowType: rule.workflow_type as WorkflowType,
          actionType: rule.action_type as SlaActionType,
          thresholdMinutes: rule.threshold_minutes,
          rulePayload: rule.payload,
        })
      }
    }
  }

  return violations
}
