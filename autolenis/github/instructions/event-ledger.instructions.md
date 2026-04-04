---
applyTo: "lib/services/event-ledger/**|app/api/admin/audit/**|app/api/admin/events/**"
---
# Event Ledger & Audit Trail (Non-Negotiable)

## Event Writing
- Every auditable state transition must write to the event ledger via `writeEvent()` from `lib/services/event-ledger`.
- Events are immutable — once written, they cannot be modified or deleted.
- Every event must include: `eventType`, `entityType`, `entityId`, `actorId`, `actorType`, `sourceModule`, and `correlationId`.
- Use the `PlatformEventType` enum for event types — never use raw strings.
- Use the `EntityType` enum for entity types — ensures consistent categorization.

## Correlation Context
- All related operations within a single request must share the same `correlationId`.
- Pass `correlationId` through the entire call chain: route handler → service → event ledger.
- Include `correlationId` in error responses for incident investigation.

## Query & Timeline
- Timeline queries via `queryTimeline()` must scope to the entity being investigated.
- Admin audit log entries must be queryable by actor, entity, time range, and event type.
- Never expose event ledger data to non-admin roles without explicit authorization.

## Testing Requirements
- Test event writing: valid events are stored, invalid events are rejected.
- Test timeline queries: correct events returned, scoped correctly.
- Test immutability: verify events cannot be modified after writing.
