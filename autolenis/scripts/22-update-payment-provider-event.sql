-- PaymentProviderEvent already exists with snake_case columns
-- Just ensure all expected columns exist

ALTER TABLE "PaymentProviderEvent"
ADD COLUMN IF NOT EXISTS "raw_body" JSONB,
ADD COLUMN IF NOT EXISTS "received_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "event_type" TEXT,
ADD COLUMN IF NOT EXISTS "processed" BOOLEAN DEFAULT false;

-- Create index on event_type for faster lookups
CREATE INDEX IF NOT EXISTS "PaymentProviderEvent_event_type_idx" ON "PaymentProviderEvent"("event_type");
CREATE INDEX IF NOT EXISTS "PaymentProviderEvent_processed_idx" ON "PaymentProviderEvent"("processed");
CREATE INDEX IF NOT EXISTS "PaymentProviderEvent_provider_idx" ON "PaymentProviderEvent"("provider");
CREATE INDEX IF NOT EXISTS "PaymentProviderEvent_received_at_idx" ON "PaymentProviderEvent"("received_at");
