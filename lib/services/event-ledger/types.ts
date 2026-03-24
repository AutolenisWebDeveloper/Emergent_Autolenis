/**
 * Event-Driven Workflow and Operational Ledger — Canonical Types
 *
 * Defines the canonical event schema, event types, and processing
 * model used by the platform-wide event ledger.
 */

// ---------------------------------------------------------------------------
// Canonical Event Types
// ---------------------------------------------------------------------------

export const PlatformEventType = {
  // Buyer lifecycle
  BUYER_ACCOUNT_CREATED: "BUYER_ACCOUNT_CREATED",
  BUYER_PROFILE_COMPLETED: "BUYER_PROFILE_COMPLETED",
  BUYER_PREQUALIFIED: "BUYER_PREQUALIFIED",

  // External preapproval
  EXTERNAL_PREAPPROVAL_SUBMITTED: "EXTERNAL_PREAPPROVAL_SUBMITTED",
  EXTERNAL_PREAPPROVAL_APPROVED: "EXTERNAL_PREAPPROVAL_APPROVED",
  EXTERNAL_PREAPPROVAL_REJECTED: "EXTERNAL_PREAPPROVAL_REJECTED",
  EXTERNAL_PREAPPROVAL_EXPIRED: "EXTERNAL_PREAPPROVAL_EXPIRED",
  EXTERNAL_PREAPPROVAL_SUPERSEDED: "EXTERNAL_PREAPPROVAL_SUPERSEDED",

  // Auction lifecycle
  BUYER_REQUEST_CREATED: "BUYER_REQUEST_CREATED",
  AUCTION_CREATED: "AUCTION_CREATED",
  DEALER_INVITED: "DEALER_INVITED",
  OFFER_SUBMITTED: "OFFER_SUBMITTED",
  OFFER_SELECTED: "OFFER_SELECTED",

  // Deal lifecycle
  FINANCING_CHOSEN: "FINANCING_CHOSEN",
  FEE_PAID: "FEE_PAID",
  INSURANCE_COMPLETED: "INSURANCE_COMPLETED",

  // Contract lifecycle
  CONTRACT_UPLOADED: "CONTRACT_UPLOADED",
  CONTRACT_SCAN_COMPLETED: "CONTRACT_SCAN_COMPLETED",
  CONTRACT_FAILED: "CONTRACT_FAILED",
  CONTRACT_REVIEW_READY: "CONTRACT_REVIEW_READY",
  CONTRACT_PASSED: "CONTRACT_PASSED",

  // CMA lifecycle
  CMA_OPENED: "CMA_OPENED",
  CMA_APPROVED: "CMA_APPROVED",
  CMA_RETURNED_INTERNAL_FIX: "CMA_RETURNED_INTERNAL_FIX",
  CMA_REVOKED: "CMA_REVOKED",

  // E-sign lifecycle
  ESIGN_SENT: "ESIGN_SENT",
  ESIGN_COMPLETED: "ESIGN_COMPLETED",

  // Pickup
  PICKUP_SCHEDULED: "PICKUP_SCHEDULED",

  // Financial lifecycle
  REFUND_REQUESTED: "REFUND_REQUESTED",
  REFUND_APPROVED: "REFUND_APPROVED",
  REFUND_DENIED: "REFUND_DENIED",
  PAYOUT_HELD: "PAYOUT_HELD",
  PAYOUT_RELEASED: "PAYOUT_RELEASED",

  // Affiliate lifecycle
  AFFILIATE_COMMISSION_CREATED: "AFFILIATE_COMMISSION_CREATED",
  AFFILIATE_COMMISSION_HELD: "AFFILIATE_COMMISSION_HELD",
  AFFILIATE_COMMISSION_RELEASED: "AFFILIATE_COMMISSION_RELEASED",

  // Deal status
  DEAL_STATUS_CHANGED: "DEAL_STATUS_CHANGED",
  DEAL_CANCELLED: "DEAL_CANCELLED",
  DEAL_COMPLETED: "DEAL_COMPLETED",

  // Dealer onboarding lifecycle
  DEALER_APPLICATION_CREATED: "DEALER_APPLICATION_CREATED",
  DEALER_APPLICATION_SUBMITTED: "DEALER_APPLICATION_SUBMITTED",
  DEALER_DOC_UPLOADED: "DEALER_DOC_UPLOADED",
  DEALER_INFO_REQUESTED: "DEALER_INFO_REQUESTED",
  DEALER_AGREEMENT_SENT: "DEALER_AGREEMENT_SENT",
  DEALER_AGREEMENT_SIGNED: "DEALER_AGREEMENT_SIGNED",
  DEALER_APPROVED: "DEALER_APPROVED",
  DEALER_REJECTED: "DEALER_REJECTED",
  DEALER_ACTIVATED: "DEALER_ACTIVATED",
  DEALER_SUSPENDED: "DEALER_SUSPENDED",

  // Dealer agreement lifecycle (DocuSign-backed)
  DEALER_AGREEMENT_REQUIRED: "DEALER_AGREEMENT_REQUIRED",
  DEALER_AGREEMENT_VIEWED: "DEALER_AGREEMENT_VIEWED",
  DEALER_AGREEMENT_COMPLETED: "DEALER_AGREEMENT_COMPLETED",
  DEALER_AGREEMENT_DECLINED: "DEALER_AGREEMENT_DECLINED",
  DEALER_AGREEMENT_VOIDED: "DEALER_AGREEMENT_VOIDED",
  DEALER_ACTIVATION_BLOCKED: "DEALER_ACTIVATION_BLOCKED",
} as const

export type PlatformEventType =
  (typeof PlatformEventType)[keyof typeof PlatformEventType]

// ---------------------------------------------------------------------------
// Entity Types
// ---------------------------------------------------------------------------

export const EntityType = {
  BUYER: "BUYER",
  DEALER: "DEALER",
  DEALER_APPLICATION: "DEALER_APPLICATION",
  DEALER_AGREEMENT: "DEALER_AGREEMENT",
  DEAL: "DEAL",
  AUCTION: "AUCTION",
  CONTRACT: "CONTRACT",
  SCAN: "SCAN",
  MANUAL_REVIEW: "MANUAL_REVIEW",
  ESIGN_ENVELOPE: "ESIGN_ENVELOPE",
  PICKUP: "PICKUP",
  PAYMENT: "PAYMENT",
  REFUND: "REFUND",
  PAYOUT: "PAYOUT",
  COMMISSION: "COMMISSION",
  AFFILIATE: "AFFILIATE",
  PREAPPROVAL: "PREAPPROVAL",
  PREQUAL: "PREQUAL",
  INSURANCE: "INSURANCE",
} as const

export type EntityType = (typeof EntityType)[keyof typeof EntityType]

// ---------------------------------------------------------------------------
// Actor Types
// ---------------------------------------------------------------------------

export const ActorType = {
  BUYER: "BUYER",
  DEALER: "DEALER",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
  WEBHOOK: "WEBHOOK",
  CRON: "CRON",
} as const

export type ActorType = (typeof ActorType)[keyof typeof ActorType]

// ---------------------------------------------------------------------------
// Processing Status
// ---------------------------------------------------------------------------

export const EventProcessingStatus = {
  RECORDED: "RECORDED",
  PROCESSING: "PROCESSING",
  PROCESSED: "PROCESSED",
  FAILED: "FAILED",
} as const

export type EventProcessingStatus =
  (typeof EventProcessingStatus)[keyof typeof EventProcessingStatus]

// ---------------------------------------------------------------------------
// Canonical Event Schema
// ---------------------------------------------------------------------------

export interface PlatformEvent {
  id: string
  eventType: PlatformEventType
  eventVersion: number
  entityType: EntityType
  entityId: string
  parentEntityId: string | null
  workspaceId: string | null
  actorId: string
  actorType: ActorType
  sourceModule: string
  correlationId: string
  idempotencyKey: string | null
  payload: Record<string, unknown>
  processingStatus: EventProcessingStatus
  createdAt: string
}

// ---------------------------------------------------------------------------
// Event Write Input
// ---------------------------------------------------------------------------

export interface EventWriteInput {
  eventType: PlatformEventType
  entityType: EntityType
  entityId: string
  parentEntityId?: string | null
  workspaceId?: string | null
  actorId: string
  actorType: ActorType
  sourceModule: string
  correlationId: string
  idempotencyKey?: string | null
  payload?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Timeline Query Options
// ---------------------------------------------------------------------------

export interface TimelineQueryOptions {
  entityType?: EntityType
  entityId?: string
  eventTypes?: PlatformEventType[]
  actorId?: string
  correlationId?: string
  since?: string
  until?: string
  limit?: number
  offset?: number
}

// ---------------------------------------------------------------------------
// Timeline Result
// ---------------------------------------------------------------------------

export interface TimelineEntry {
  id: string
  eventType: PlatformEventType
  entityType: EntityType
  entityId: string
  actorId: string
  actorType: ActorType
  sourceModule: string
  correlationId: string
  summary: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface TimelineResult {
  entries: TimelineEntry[]
  total: number
  hasMore: boolean
}
