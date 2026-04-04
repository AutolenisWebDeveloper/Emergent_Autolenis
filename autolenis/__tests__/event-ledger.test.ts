/**
 * Event-Driven Workflow and Operational Ledger — Unit Tests
 *
 * Tests the canonical event ledger for event emission, replay safety,
 * idempotency protection, and timeline reconstruction.
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  writeEvent,
  queryTimeline,
  getEntityTimeline,
  getCorrelatedEvents,
  validateEventInput,
  resetEventStore,
  getEventStore,
  PlatformEventType,
  EntityType,
  ActorType,
} from "@/lib/services/event-ledger"
import type { EventWriteInput } from "@/lib/services/event-ledger"

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function makeEventInput(overrides?: Partial<EventWriteInput>): EventWriteInput {
  return {
    eventType: PlatformEventType.BUYER_ACCOUNT_CREATED,
    entityType: EntityType.BUYER,
    entityId: "buyer-1",
    actorId: "system",
    actorType: ActorType.SYSTEM,
    sourceModule: "auth.service",
    correlationId: "corr-123",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Event Ledger", () => {
  beforeEach(() => {
    resetEventStore()
  })

  describe("writeEvent", () => {
    it("writes a valid event successfully", () => {
      const result = writeEvent(makeEventInput())

      expect(result.success).toBe(true)
      expect(result.event).not.toBeNull()
      expect(result.duplicate).toBe(false)
      expect(result.error).toBeNull()
    })

    it("assigns an event ID", () => {
      const result = writeEvent(makeEventInput())
      expect(result.event?.id).toBeDefined()
      expect(typeof result.event?.id).toBe("string")
    })

    it("sets event version to 1", () => {
      const result = writeEvent(makeEventInput())
      expect(result.event?.eventVersion).toBe(1)
    })

    it("sets processing status to RECORDED", () => {
      const result = writeEvent(makeEventInput())
      expect(result.event?.processingStatus).toBe("RECORDED")
    })

    it("sets createdAt timestamp", () => {
      const result = writeEvent(makeEventInput())
      expect(result.event?.createdAt).toBeDefined()
      expect(new Date(result.event!.createdAt).getTime()).toBeGreaterThan(0)
    })

    it("preserves all input fields", () => {
      const input = makeEventInput({
        parentEntityId: "parent-1",
        workspaceId: "ws-1",
        payload: { key: "value" },
      })
      const result = writeEvent(input)
      const event = result.event!

      expect(event.eventType).toBe(PlatformEventType.BUYER_ACCOUNT_CREATED)
      expect(event.entityType).toBe(EntityType.BUYER)
      expect(event.entityId).toBe("buyer-1")
      expect(event.parentEntityId).toBe("parent-1")
      expect(event.workspaceId).toBe("ws-1")
      expect(event.actorId).toBe("system")
      expect(event.actorType).toBe(ActorType.SYSTEM)
      expect(event.sourceModule).toBe("auth.service")
      expect(event.correlationId).toBe("corr-123")
      expect(event.payload).toEqual({ key: "value" })
    })

    it("writes to the event store", () => {
      writeEvent(makeEventInput())
      expect(getEventStore().length).toBe(1)
    })

    it("writes multiple events", () => {
      writeEvent(makeEventInput({ entityId: "buyer-1" }))
      writeEvent(makeEventInput({ entityId: "buyer-2" }))
      writeEvent(makeEventInput({ entityId: "buyer-3" }))
      expect(getEventStore().length).toBe(3)
    })
  })

  // ---------------------------------------------------------------------------
  // Idempotency Tests
  // ---------------------------------------------------------------------------

  describe("idempotency", () => {
    it("prevents duplicate events with same idempotencyKey", () => {
      const input = makeEventInput({ idempotencyKey: "idem-1" })
      const first = writeEvent(input)
      const second = writeEvent(input)

      expect(first.success).toBe(true)
      expect(first.duplicate).toBe(false)
      expect(second.success).toBe(true)
      expect(second.duplicate).toBe(true)
      expect(second.event?.id).toBe(first.event?.id)
      expect(getEventStore().length).toBe(1)
    })

    it("allows events without idempotencyKey to be duplicated", () => {
      const input = makeEventInput()
      writeEvent(input)
      writeEvent(input)
      expect(getEventStore().length).toBe(2)
    })

    it("allows different idempotencyKeys", () => {
      writeEvent(makeEventInput({ idempotencyKey: "idem-1" }))
      writeEvent(makeEventInput({ idempotencyKey: "idem-2" }))
      expect(getEventStore().length).toBe(2)
    })
  })

  // ---------------------------------------------------------------------------
  // Validation Tests
  // ---------------------------------------------------------------------------

  describe("validateEventInput", () => {
    it("returns null for valid input", () => {
      expect(validateEventInput(makeEventInput())).toBeNull()
    })

    it("rejects missing eventType", () => {
      const input = makeEventInput({ eventType: "" as PlatformEventType })
      expect(validateEventInput(input)).toContain("Invalid eventType")
    })

    it("rejects missing entityId", () => {
      const input = makeEventInput({ entityId: "" })
      expect(validateEventInput(input)).toContain("entityId")
    })

    it("rejects missing actorId", () => {
      const input = makeEventInput({ actorId: "" })
      expect(validateEventInput(input)).toContain("actorId")
    })

    it("rejects missing sourceModule", () => {
      const input = makeEventInput({ sourceModule: "" })
      expect(validateEventInput(input)).toContain("sourceModule")
    })

    it("rejects missing correlationId", () => {
      const input = makeEventInput({ correlationId: "" })
      expect(validateEventInput(input)).toContain("correlationId")
    })

    it("writeEvent fails for invalid input", () => {
      const input = makeEventInput({ entityId: "" })
      const result = writeEvent(input)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  // ---------------------------------------------------------------------------
  // Timeline Query Tests
  // ---------------------------------------------------------------------------

  describe("queryTimeline", () => {
    beforeEach(() => {
      // Create a series of events for a deal lifecycle
      writeEvent(
        makeEventInput({
          eventType: PlatformEventType.BUYER_ACCOUNT_CREATED,
          entityType: EntityType.BUYER,
          entityId: "buyer-1",
          correlationId: "corr-deal-1",
        })
      )
      writeEvent(
        makeEventInput({
          eventType: PlatformEventType.AUCTION_CREATED,
          entityType: EntityType.AUCTION,
          entityId: "auction-1",
          parentEntityId: "buyer-1",
          correlationId: "corr-deal-1",
        })
      )
      writeEvent(
        makeEventInput({
          eventType: PlatformEventType.OFFER_SELECTED,
          entityType: EntityType.DEAL,
          entityId: "deal-1",
          parentEntityId: "auction-1",
          correlationId: "corr-deal-1",
        })
      )
      writeEvent(
        makeEventInput({
          eventType: PlatformEventType.CONTRACT_UPLOADED,
          entityType: EntityType.CONTRACT,
          entityId: "contract-1",
          parentEntityId: "deal-1",
          correlationId: "corr-deal-1",
        })
      )
    })

    it("returns all events when no filters", () => {
      const result = queryTimeline({})
      expect(result.total).toBe(4)
      expect(result.entries.length).toBe(4)
    })

    it("filters by entityType", () => {
      const result = queryTimeline({ entityType: EntityType.BUYER })
      expect(result.total).toBe(1)
      expect(result.entries[0].entityId).toBe("buyer-1")
    })

    it("filters by entityId", () => {
      const result = queryTimeline({ entityId: "deal-1" })
      expect(result.total).toBe(1)
      expect(result.entries[0].eventType).toBe(PlatformEventType.OFFER_SELECTED)
    })

    it("filters by eventTypes", () => {
      const result = queryTimeline({
        eventTypes: [
          PlatformEventType.BUYER_ACCOUNT_CREATED,
          PlatformEventType.AUCTION_CREATED,
        ],
      })
      expect(result.total).toBe(2)
    })

    it("filters by correlationId", () => {
      // Add an event with different correlation
      writeEvent(
        makeEventInput({
          entityId: "buyer-2",
          correlationId: "corr-other",
        })
      )

      const result = queryTimeline({ correlationId: "corr-deal-1" })
      expect(result.total).toBe(4)
    })

    it("applies pagination", () => {
      const result = queryTimeline({ limit: 2, offset: 0 })
      expect(result.entries.length).toBe(2)
      expect(result.hasMore).toBe(true)
      expect(result.total).toBe(4)

      const page2 = queryTimeline({ limit: 2, offset: 2 })
      expect(page2.entries.length).toBe(2)
      expect(page2.hasMore).toBe(false)
    })

    it("generates human-readable summaries", () => {
      const result = queryTimeline({})
      expect(result.entries[0].summary).toBe("Buyer account created")
      expect(result.entries[1].summary).toBe("Auction created")
      expect(result.entries[2].summary).toBe("Offer selected")
      expect(result.entries[3].summary).toBe("Contract uploaded")
    })
  })

  // ---------------------------------------------------------------------------
  // Entity Timeline Tests
  // ---------------------------------------------------------------------------

  describe("getEntityTimeline", () => {
    it("returns timeline for a specific entity", () => {
      writeEvent(
        makeEventInput({
          entityType: EntityType.DEAL,
          entityId: "deal-1",
          eventType: PlatformEventType.OFFER_SELECTED,
        })
      )
      writeEvent(
        makeEventInput({
          entityType: EntityType.DEAL,
          entityId: "deal-1",
          eventType: PlatformEventType.FINANCING_CHOSEN,
        })
      )
      writeEvent(
        makeEventInput({
          entityType: EntityType.DEAL,
          entityId: "deal-2",
          eventType: PlatformEventType.OFFER_SELECTED,
        })
      )

      const result = getEntityTimeline(EntityType.DEAL, "deal-1")
      expect(result.total).toBe(2)
      expect(result.entries.every((e) => e.entityId === "deal-1")).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Correlated Events Tests
  // ---------------------------------------------------------------------------

  describe("getCorrelatedEvents", () => {
    it("returns all events sharing a correlationId", () => {
      writeEvent(makeEventInput({ correlationId: "corr-1", entityId: "a" }))
      writeEvent(makeEventInput({ correlationId: "corr-1", entityId: "b" }))
      writeEvent(makeEventInput({ correlationId: "corr-2", entityId: "c" }))

      const result = getCorrelatedEvents("corr-1")
      expect(result.total).toBe(2)
    })
  })

  // ---------------------------------------------------------------------------
  // Event Lifecycle Coverage
  // ---------------------------------------------------------------------------

  describe("event lifecycle coverage", () => {
    it("covers all major deal lifecycle events", () => {
      const lifecycleEvents: PlatformEventType[] = [
        PlatformEventType.BUYER_ACCOUNT_CREATED,
        PlatformEventType.BUYER_PREQUALIFIED,
        PlatformEventType.AUCTION_CREATED,
        PlatformEventType.OFFER_SUBMITTED,
        PlatformEventType.OFFER_SELECTED,
        PlatformEventType.FINANCING_CHOSEN,
        PlatformEventType.FEE_PAID,
        PlatformEventType.INSURANCE_COMPLETED,
        PlatformEventType.CONTRACT_UPLOADED,
        PlatformEventType.CONTRACT_SCAN_COMPLETED,
        PlatformEventType.CONTRACT_PASSED,
        PlatformEventType.ESIGN_SENT,
        PlatformEventType.ESIGN_COMPLETED,
        PlatformEventType.PICKUP_SCHEDULED,
        PlatformEventType.DEAL_COMPLETED,
      ]

      for (const eventType of lifecycleEvents) {
        const result = writeEvent(
          makeEventInput({
            eventType,
            idempotencyKey: `lifecycle-${eventType}`,
          })
        )
        expect(result.success).toBe(true)
      }

      expect(getEventStore().length).toBe(lifecycleEvents.length)
    })

    it("covers CMA lifecycle events", () => {
      const cmaEvents: PlatformEventType[] = [
        PlatformEventType.CMA_OPENED,
        PlatformEventType.CMA_APPROVED,
        PlatformEventType.CMA_RETURNED_INTERNAL_FIX,
        PlatformEventType.CMA_REVOKED,
      ]

      for (const eventType of cmaEvents) {
        const result = writeEvent(makeEventInput({ eventType }))
        expect(result.success).toBe(true)
      }
    })

    it("covers affiliate lifecycle events", () => {
      const affiliateEvents: PlatformEventType[] = [
        PlatformEventType.AFFILIATE_COMMISSION_CREATED,
        PlatformEventType.AFFILIATE_COMMISSION_HELD,
        PlatformEventType.AFFILIATE_COMMISSION_RELEASED,
      ]

      for (const eventType of affiliateEvents) {
        const result = writeEvent(makeEventInput({ eventType }))
        expect(result.success).toBe(true)
      }
    })

    it("covers refund and payout events", () => {
      const financialEvents: PlatformEventType[] = [
        PlatformEventType.REFUND_REQUESTED,
        PlatformEventType.REFUND_APPROVED,
        PlatformEventType.REFUND_DENIED,
        PlatformEventType.PAYOUT_HELD,
        PlatformEventType.PAYOUT_RELEASED,
      ]

      for (const eventType of financialEvents) {
        const result = writeEvent(makeEventInput({ eventType }))
        expect(result.success).toBe(true)
      }
    })
  })
})
