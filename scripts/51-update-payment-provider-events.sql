-- PaymentProviderEvent table doesn't exist, create it first
CREATE TABLE IF NOT EXISTS "PaymentProviderEvent" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "provider" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "event_id_v2" TEXT,
  "raw_body" JSONB,
  "processed" BOOLEAN DEFAULT false,
  "received_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PaymentProviderEvent_provider_idx" ON "PaymentProviderEvent"("provider");
CREATE INDEX IF NOT EXISTS "PaymentProviderEvent_event_type_idx" ON "PaymentProviderEvent"("event_type");
CREATE INDEX IF NOT EXISTS "PaymentProviderEvent_processed_idx" ON "PaymentProviderEvent"("processed");
