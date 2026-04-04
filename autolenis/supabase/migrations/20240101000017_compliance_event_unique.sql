-- FIX 17: ComplianceEvent idempotency unique constraint
-- Add eventId field (used together with eventType for deduplication)
-- and a partial unique index on (eventType, eventId) when eventId is not null.

ALTER TABLE "ComplianceEvent"
  ADD COLUMN IF NOT EXISTS "eventId" TEXT;

-- Partial unique index: only enforce uniqueness when eventId is populated
CREATE UNIQUE INDEX IF NOT EXISTS "idx_compliance_event_type_event_id_unique"
  ON "ComplianceEvent" ("eventType", "eventId")
  WHERE "eventId" IS NOT NULL;
