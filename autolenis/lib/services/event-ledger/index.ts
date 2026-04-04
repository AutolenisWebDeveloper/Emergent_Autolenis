/**
 * Event-Driven Workflow and Operational Ledger
 *
 * Canonical event ledger for platform-wide auditable, replayable events.
 */

export {
  writeEvent,
  writeEventAsync,
  queryTimeline,
  queryTimelineAsync,
  getEntityTimeline,
  getCorrelatedEvents,
  validateEventInput,
  resetEventStore,
  getEventStore,
} from "./writer"

export type {
  PlatformEvent,
  EventWriteInput,
  TimelineQueryOptions,
  TimelineEntry,
  TimelineResult,
} from "./types"

export {
  PlatformEventType,
  EntityType,
  ActorType,
  EventProcessingStatus,
} from "./types"

