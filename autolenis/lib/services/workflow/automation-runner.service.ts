/**
 * Workflow Automation Runner
 *
 * Orchestrates SLA evaluation across all workflow domains:
 *   - Inventory leads
 *   - Sourcing cases
 *   - Sourcing invites
 *   - Sourcing offers
 *   - Case conversions
 *
 * For each domain, it:
 *   1. Fetches active entities that may violate SLA rules
 *   2. Evaluates them against threshold rules
 *   3. Records SLA events (deduplicated)
 *   4. Enqueues notifications for violations
 *   5. Processes the notification queue
 */

import { getSupabase } from "@/lib/db"
import { logger } from "@/lib/logger"
import {
  getActiveRules,
  evaluateEntities,
  recordSlaEvent,
  type WorkflowType,
  type SlaViolation,
  type EvaluableEntity,
} from "./sla.service"
import {
  enqueueNotification,
  processNotificationQueue,
  type ProcessResult,
} from "./notification.service"

// ── Types ────────────────────────────────────────────────────────────────

export interface AutomationRunResult {
  correlationId: string
  evaluations: Record<string, DomainResult>
  notifications: ProcessResult
  durationMs: number
}

export interface DomainResult {
  entitiesChecked: number
  violationsFound: number
  eventsRecorded: number
  notificationsEnqueued: number
}

// ── Domain entity fetchers ───────────────────────────────────────────────

/**
 * Fetch inventory leads that are in early/active statuses.
 */
async function fetchActiveLeads(): Promise<EvaluableEntity[]> {
  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("inventory_leads")
      .select("id, created_at, status, updated_at")
      .in("status", ["NEW", "REVIEW"])
      .order("created_at", { ascending: true })
      .limit(500)

    if (error) {
      logger.error("Failed to fetch active leads", { error: error.message })
      return []
    }

    return (data ?? []) as EvaluableEntity[]
  } catch {
    return []
  }
}

/**
 * Fetch sourcing cases in active statuses.
 */
async function fetchActiveSourcingCases(): Promise<EvaluableEntity[]> {
  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("sourcing_cases")
      .select("id, created_at, status, updated_at")
      .in("status", ["OPEN", "INVITED", "RESPONDING"])
      .order("created_at", { ascending: true })
      .limit(500)

    if (error) {
      logger.error("Failed to fetch active sourcing cases", { error: error.message })
      return []
    }

    return (data ?? []) as EvaluableEntity[]
  } catch {
    return []
  }
}

/**
 * Fetch sourcing invites in pending/sent statuses.
 */
async function fetchActiveInvites(): Promise<EvaluableEntity[]> {
  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("sourcing_case_invites")
      .select("id, created_at, status, updated_at")
      .in("status", ["PENDING", "SENT"])
      .order("created_at", { ascending: true })
      .limit(500)

    if (error) {
      logger.error("Failed to fetch active invites", { error: error.message })
      return []
    }

    return (data ?? []) as EvaluableEntity[]
  } catch {
    return []
  }
}

/**
 * Fetch sourcing offers in early statuses.
 */
async function fetchActiveOffers(): Promise<EvaluableEntity[]> {
  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("sourcing_case_offers")
      .select("id, created_at, status, updated_at")
      .in("status", ["SUBMITTED", "UNDER_REVIEW"])
      .order("created_at", { ascending: true })
      .limit(500)

    if (error) {
      logger.error("Failed to fetch active offers", { error: error.message })
      return []
    }

    return (data ?? []) as EvaluableEntity[]
  } catch {
    return []
  }
}

/**
 * Fetch case conversions stuck in mid-pipeline.
 */
async function fetchActiveConversions(): Promise<EvaluableEntity[]> {
  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("inventory_case_conversions")
      .select("id, created_at, status, updated_at")
      .in("status", [
        "PENDING",
        "BUYER_RESOLVED",
        "DEAL_CREATED",
        "CONTRACTS_SEEDED",
        "PAYMENTS_SEEDED",
        "INSURANCE_SEEDED",
        "PICKUP_SEEDED",
      ])
      .order("created_at", { ascending: true })
      .limit(500)

    if (error) {
      logger.error("Failed to fetch active conversions", { error: error.message })
      return []
    }

    return (data ?? []) as EvaluableEntity[]
  } catch {
    return []
  }
}

// ── Domain registry ──────────────────────────────────────────────────────

interface DomainConfig {
  workflowType: WorkflowType
  fetchEntities: () => Promise<EvaluableEntity[]>
}

const DOMAINS: DomainConfig[] = [
  { workflowType: "INVENTORY_LEAD", fetchEntities: fetchActiveLeads },
  { workflowType: "SOURCING_CASE", fetchEntities: fetchActiveSourcingCases },
  { workflowType: "SOURCING_INVITE", fetchEntities: fetchActiveInvites },
  { workflowType: "SOURCING_OFFER", fetchEntities: fetchActiveOffers },
  { workflowType: "CASE_CONVERSION", fetchEntities: fetchActiveConversions },
]

// ── Violation → notification ─────────────────────────────────────────────

/**
 * Maps a notify target (from SLA rule payload) to recipient type and channel.
 */
const NOTIFY_TARGET_CONFIG: Record<string, { recipientType: "ADMIN" | "BUYER" | "DEALER" | "SYSTEM"; channel: "EMAIL" | "IN_APP" }> = {
  ADMIN:  { recipientType: "ADMIN",  channel: "IN_APP" },
  BUYER:  { recipientType: "BUYER",  channel: "EMAIL" },
  DEALER: { recipientType: "DEALER", channel: "EMAIL" },
  SYSTEM: { recipientType: "SYSTEM", channel: "IN_APP" },
}

/**
 * For each recorded violation, enqueue the appropriate notification.
 */
async function enqueueViolationNotification(
  violation: SlaViolation,
): Promise<boolean> {
  const notifyTarget = (violation.rulePayload as { notify?: string })?.notify ?? "ADMIN"
  const config = NOTIFY_TARGET_CONFIG[notifyTarget] ?? NOTIFY_TARGET_CONFIG["ADMIN"]

  const { recipientType, channel } = config

  const result = await enqueueNotification({
    channel,
    recipientType,
    templateKey: `sla_${violation.ruleKey.toLowerCase()}`,
    subject: `[SLA ${violation.actionType}] ${violation.ruleKey.replace(/_/g, " ")}`,
    payload: {
      workflowType: violation.workflowType,
      entityId: violation.entityId,
      ruleKey: violation.ruleKey,
      actionType: violation.actionType,
      thresholdMinutes: violation.thresholdMinutes,
    },
  })

  return result !== null
}

// ── Run a single domain ──────────────────────────────────────────────────

async function evaluateDomain(
  config: DomainConfig,
  now: Date,
): Promise<DomainResult> {
  const result: DomainResult = {
    entitiesChecked: 0,
    violationsFound: 0,
    eventsRecorded: 0,
    notificationsEnqueued: 0,
  }

  // 1. Fetch rules for this workflow type
  const rules = await getActiveRules(config.workflowType)
  if (rules.length === 0) return result

  // 2. Fetch entities
  const entities = await config.fetchEntities()
  result.entitiesChecked = entities.length
  if (entities.length === 0) return result

  // 3. Evaluate entities against rules
  const violations = evaluateEntities(entities, rules, now)
  result.violationsFound = violations.length

  // 4. Record events + enqueue notifications
  for (const violation of violations) {
    const event = await recordSlaEvent(violation)
    if (event) {
      result.eventsRecorded++
      const enqueued = await enqueueViolationNotification(violation)
      if (enqueued) {
        result.notificationsEnqueued++
      }
    }
  }

  return result
}

// ── Main runner ──────────────────────────────────────────────────────────

/**
 * Run a complete automation cycle across all workflow domains.
 *
 * Called by the cron job endpoint.
 */
export async function runAutomationCycle(): Promise<AutomationRunResult> {
  const correlationId = crypto.randomUUID()
  const start = Date.now()
  const now = new Date()

  logger.info("Workflow automation cycle starting", { correlationId })

  const evaluations: Record<string, DomainResult> = {}

  for (const domain of DOMAINS) {
    try {
      evaluations[domain.workflowType] = await evaluateDomain(domain, now)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error("Domain evaluation failed", {
        correlationId,
        workflowType: domain.workflowType,
        error: message,
      })
      evaluations[domain.workflowType] = {
        entitiesChecked: 0,
        violationsFound: 0,
        eventsRecorded: 0,
        notificationsEnqueued: 0,
      }
    }
  }

  // Process notification queue
  let notifications: ProcessResult = { processed: 0, sent: 0, failed: 0 }
  try {
    notifications = await processNotificationQueue()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error("Notification processing failed", { correlationId, error: message })
  }

  const durationMs = Date.now() - start

  logger.info("Workflow automation cycle completed", {
    correlationId,
    durationMs,
    evaluations,
    notifications,
  })

  return {
    correlationId,
    evaluations,
    notifications,
    durationMs,
  }
}
