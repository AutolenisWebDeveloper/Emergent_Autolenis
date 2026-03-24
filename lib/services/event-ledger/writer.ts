/**
 * Event-Driven Workflow and Operational Ledger — Writer
 *
 * Canonical event writing utility with:
 * - Idempotency protection (deduplication via idempotencyKey)
 * - Structured event creation
 * - Event validation
 * - Timeline query utilities
 *
 * Uses Prisma-backed storage via the PlatformEvent model (table: platform_events).
 * Falls back to in-memory storage when Prisma is unavailable (e.g. in tests).
 */

import type {
  PlatformEvent,
  EventWriteInput,
  TimelineQueryOptions,
  TimelineEntry,
  TimelineResult,
  PlatformEventType,
  EntityType,
} from "./types"
import {
  PlatformEventType as EventTypes,
  EntityType as EntityTypes,
  ActorType as ActorTypes,
  EventProcessingStatus as ProcessingStatuses,
} from "./types"

// ---------------------------------------------------------------------------
// In-Memory Event Store (fallback when Prisma is unavailable, e.g. tests)
// ---------------------------------------------------------------------------

let eventStore: PlatformEvent[] = []

/**
 * Reset the in-memory event store. Only used in tests.
 */
export function resetEventStore(): void {
  eventStore = []
}

/**
 * Get all events from the in-memory store. Only used in tests.
 */
export function getEventStore(): ReadonlyArray<PlatformEvent> {
  return eventStore
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
// Validation
// ---------------------------------------------------------------------------

const VALID_EVENT_TYPES = new Set<string>(Object.values(EventTypes))
const VALID_ENTITY_TYPES = new Set<string>(Object.values(EntityTypes))
const VALID_ACTOR_TYPES = new Set<string>(Object.values(ActorTypes))

export function validateEventInput(input: EventWriteInput): string | null {
  if (!input.eventType || !VALID_EVENT_TYPES.has(input.eventType)) {
    return `Invalid eventType: ${input.eventType}`
  }
  if (!input.entityType || !VALID_ENTITY_TYPES.has(input.entityType)) {
    return `Invalid entityType: ${input.entityType}`
  }
  if (!input.actorType || !VALID_ACTOR_TYPES.has(input.actorType)) {
    return `Invalid actorType: ${input.actorType}`
  }
  if (!input.entityId || typeof input.entityId !== "string") {
    return "entityId is required"
  }
  if (!input.actorId || typeof input.actorId !== "string") {
    return "actorId is required"
  }
  if (!input.sourceModule || typeof input.sourceModule !== "string") {
    return "sourceModule is required"
  }
  if (!input.correlationId || typeof input.correlationId !== "string") {
    return "correlationId is required"
  }
  return null
}

// ---------------------------------------------------------------------------
// Event Writer
// ---------------------------------------------------------------------------

export interface WriteEventResult {
  success: boolean
  event: PlatformEvent | null
  duplicate: boolean
  error: string | null
}

/**
 * Write a canonical platform event with idempotency protection.
 *
 * Uses the in-memory store (synchronous). Suitable for tests and
 * contexts where Prisma is unavailable.
 */
export function writeEvent(input: EventWriteInput): WriteEventResult {
  const validationError = validateEventInput(input)
  if (validationError) {
    return { success: false, event: null, duplicate: false, error: validationError }
  }

  // Idempotency check (in-memory)
  if (input.idempotencyKey) {
    const existing = eventStore.find(
      (e) => e.idempotencyKey === input.idempotencyKey
    )
    if (existing) {
      return { success: true, event: existing, duplicate: true, error: null }
    }
  }

  const now = new Date().toISOString()
  const event: PlatformEvent = {
    id: crypto.randomUUID(),
    eventType: input.eventType,
    eventVersion: 1,
    entityType: input.entityType,
    entityId: input.entityId,
    parentEntityId: input.parentEntityId ?? null,
    workspaceId: input.workspaceId ?? null,
    actorId: input.actorId,
    actorType: input.actorType,
    sourceModule: input.sourceModule,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey ?? null,
    payload: input.payload ?? {},
    processingStatus: ProcessingStatuses.RECORDED,
    createdAt: now,
  }

  eventStore.push(event)
  return { success: true, event, duplicate: false, error: null }
}

/**
 * Write a canonical platform event to the database (async, Prisma-backed).
 *
 * This is the production entry point — it persists to platform_events
 * with real idempotency protection via the unique idempotencyKey constraint.
 * Falls back to the synchronous in-memory writer when Prisma is unavailable.
 */
export async function writeEventAsync(input: EventWriteInput): Promise<WriteEventResult> {
  const validationError = validateEventInput(input)
  if (validationError) {
    return { success: false, event: null, duplicate: false, error: validationError }
  }

  const db = getPrismaClient()
  if (!db) {
    return writeEvent(input)
  }

  try {
    // Idempotency check via DB unique constraint
    if (input.idempotencyKey) {
      const existing = await db.platformEvent.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      })
      if (existing) {
        return {
          success: true,
          event: mapDbRowToEvent(existing),
          duplicate: true,
          error: null,
        }
      }
    }

    const row = await db.platformEvent.create({
      data: {
        eventType: input.eventType,
        eventVersion: 1,
        entityType: input.entityType,
        entityId: input.entityId,
        parentEntityId: input.parentEntityId ?? null,
        workspaceId: input.workspaceId ?? null,
        actorId: input.actorId,
        actorType: input.actorType,
        sourceModule: input.sourceModule,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey ?? null,
        payload: input.payload ?? {},
        processingStatus: ProcessingStatuses.RECORDED,
      },
    })

    return { success: true, event: mapDbRowToEvent(row), duplicate: false, error: null }
  } catch (err: any) {
    // Handle unique constraint violation (idempotency key collision)
    if (err?.code === "P2002" && input.idempotencyKey) {
      const existing = await db.platformEvent.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      })
      if (existing) {
        return {
          success: true,
          event: mapDbRowToEvent(existing),
          duplicate: true,
          error: null,
        }
      }
    }
    return { success: false, event: null, duplicate: false, error: err?.message ?? "Unknown error" }
  }
}

function mapDbRowToEvent(row: any): PlatformEvent {
  return {
    id: row.id,
    eventType: row.eventType as PlatformEventType,
    eventVersion: row.eventVersion,
    entityType: row.entityType as EntityType,
    entityId: row.entityId,
    parentEntityId: row.parentEntityId,
    workspaceId: row.workspaceId,
    actorId: row.actorId,
    actorType: row.actorType,
    sourceModule: row.sourceModule,
    correlationId: row.correlationId,
    idempotencyKey: row.idempotencyKey,
    payload: row.payload as Record<string, unknown>,
    processingStatus: row.processingStatus,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  }
}

// ---------------------------------------------------------------------------
// Event Summary Generator
// ---------------------------------------------------------------------------

const EVENT_SUMMARY_MAP: Partial<Record<PlatformEventType, string>> = {
  BUYER_ACCOUNT_CREATED: "Buyer account created",
  BUYER_PROFILE_COMPLETED: "Buyer profile completed",
  BUYER_PREQUALIFIED: "Buyer pre-qualified",
  EXTERNAL_PREAPPROVAL_SUBMITTED: "External pre-approval submitted",
  EXTERNAL_PREAPPROVAL_APPROVED: "External pre-approval approved",
  EXTERNAL_PREAPPROVAL_REJECTED: "External pre-approval rejected",
  EXTERNAL_PREAPPROVAL_EXPIRED: "External pre-approval expired",
  EXTERNAL_PREAPPROVAL_SUPERSEDED: "External pre-approval superseded",
  BUYER_REQUEST_CREATED: "Vehicle request created",
  AUCTION_CREATED: "Auction created",
  DEALER_INVITED: "Dealer invited to auction",
  OFFER_SUBMITTED: "Offer submitted",
  OFFER_SELECTED: "Offer selected",
  FINANCING_CHOSEN: "Financing option chosen",
  FEE_PAID: "Concierge fee paid",
  INSURANCE_COMPLETED: "Insurance completed",
  CONTRACT_UPLOADED: "Contract uploaded",
  CONTRACT_SCAN_COMPLETED: "Contract scan completed",
  CONTRACT_FAILED: "Contract scan failed",
  CONTRACT_REVIEW_READY: "Contract ready for review",
  CONTRACT_PASSED: "Contract passed",
  CMA_OPENED: "Manual review opened",
  CMA_APPROVED: "Manual review approved",
  CMA_RETURNED_INTERNAL_FIX: "Manual review returned for internal fix",
  CMA_REVOKED: "Manual review revoked",
  ESIGN_SENT: "E-sign envelope sent",
  ESIGN_COMPLETED: "E-sign completed",
  PICKUP_SCHEDULED: "Pickup scheduled",
  REFUND_REQUESTED: "Refund requested",
  REFUND_APPROVED: "Refund approved",
  REFUND_DENIED: "Refund denied",
  PAYOUT_HELD: "Payout held",
  PAYOUT_RELEASED: "Payout released",
  AFFILIATE_COMMISSION_CREATED: "Commission created",
  AFFILIATE_COMMISSION_HELD: "Commission held",
  AFFILIATE_COMMISSION_RELEASED: "Commission released",
  DEAL_STATUS_CHANGED: "Deal status changed",
  DEAL_CANCELLED: "Deal cancelled",
  DEAL_COMPLETED: "Deal completed",
}

function generateEventSummary(event: PlatformEvent): string {
  return EVENT_SUMMARY_MAP[event.eventType] ?? event.eventType
}

// ---------------------------------------------------------------------------
// Timeline Query
// ---------------------------------------------------------------------------

/**
 * Query the event ledger to reconstruct a canonical timeline.
 *
 * Uses the in-memory store (synchronous).
 */
export function queryTimeline(options: TimelineQueryOptions): TimelineResult {
  let filtered = [...eventStore]

  if (options.entityType) {
    filtered = filtered.filter((e) => e.entityType === options.entityType)
  }
  if (options.entityId) {
    filtered = filtered.filter((e) => e.entityId === options.entityId)
  }
  if (options.eventTypes && options.eventTypes.length > 0) {
    const typeSet = new Set<string>(options.eventTypes)
    filtered = filtered.filter((e) => typeSet.has(e.eventType))
  }
  if (options.actorId) {
    filtered = filtered.filter((e) => e.actorId === options.actorId)
  }
  if (options.correlationId) {
    filtered = filtered.filter((e) => e.correlationId === options.correlationId)
  }
  if (options.since) {
    const sinceDate = new Date(options.since)
    filtered = filtered.filter((e) => new Date(e.createdAt) >= sinceDate)
  }
  if (options.until) {
    const untilDate = new Date(options.until)
    filtered = filtered.filter((e) => new Date(e.createdAt) <= untilDate)
  }

  filtered.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const total = filtered.length
  const offset = options.offset ?? 0
  const limit = options.limit ?? 50
  const paged = filtered.slice(offset, offset + limit)

  const entries: TimelineEntry[] = paged.map((event) => ({
    id: event.id,
    eventType: event.eventType,
    entityType: event.entityType,
    entityId: event.entityId,
    actorId: event.actorId,
    actorType: event.actorType,
    sourceModule: event.sourceModule,
    correlationId: event.correlationId,
    summary: generateEventSummary(event),
    payload: event.payload,
    createdAt: event.createdAt,
  }))

  return {
    entries,
    total,
    hasMore: offset + limit < total,
  }
}

/**
 * Query the event ledger via Prisma (async, database-backed).
 * Falls back to in-memory query when Prisma is unavailable.
 */
export async function queryTimelineAsync(options: TimelineQueryOptions): Promise<TimelineResult> {
  const db = getPrismaClient()
  if (!db) return queryTimeline(options)

  const where: Record<string, unknown> = {}
  if (options.entityType) where.entityType = options.entityType
  if (options.entityId) where.entityId = options.entityId
  if (options.eventTypes?.length) where.eventType = { in: options.eventTypes }
  if (options.actorId) where.actorId = options.actorId
  if (options.correlationId) where.correlationId = options.correlationId
  if (options.since || options.until) {
    const createdAt: Record<string, Date> = {}
    if (options.since) createdAt.gte = new Date(options.since)
    if (options.until) createdAt.lte = new Date(options.until)
    where.createdAt = createdAt
  }

  const offset = options.offset ?? 0
  const limit = options.limit ?? 50

  const [rows, total] = await Promise.all([
    db.platformEvent.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: offset,
      take: limit,
    }),
    db.platformEvent.count({ where }),
  ])

  const entries: TimelineEntry[] = rows.map((row: any) => {
    const event = mapDbRowToEvent(row)
    return {
      id: event.id,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      actorId: event.actorId,
      actorType: event.actorType,
      sourceModule: event.sourceModule,
      correlationId: event.correlationId,
      summary: generateEventSummary(event),
      payload: event.payload,
      createdAt: event.createdAt,
    }
  })

  return { entries, total, hasMore: offset + limit < total }
}

// ---------------------------------------------------------------------------
// Entity Timeline Shortcuts
// ---------------------------------------------------------------------------

/**
 * Get the complete timeline for a specific entity.
 */
export function getEntityTimeline(
  entityType: EntityType,
  entityId: string,
  limit?: number
): TimelineResult {
  return queryTimeline({ entityType, entityId, limit: limit ?? 100 })
}

/**
 * Get events by correlation ID (for tracing related actions).
 */
export function getCorrelatedEvents(correlationId: string): TimelineResult {
  return queryTimeline({ correlationId, limit: 200 })
}
