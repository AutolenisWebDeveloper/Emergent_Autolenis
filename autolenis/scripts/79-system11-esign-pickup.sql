-- System 11: E-Sign & Pickup Scheduling Enhancements
-- Adds missing columns and creates esign_events audit table

-- Add missing columns to ESignEnvelope
ALTER TABLE "ESignEnvelope" ADD COLUMN IF NOT EXISTS "selected_deal_id" TEXT REFERENCES "SelectedDeal"("id");
ALTER TABLE "ESignEnvelope" ADD COLUMN IF NOT EXISTS "meta_json" JSONB;

-- Migrate dealId to selected_deal_id if needed
UPDATE "ESignEnvelope" SET "selected_deal_id" = "dealId" WHERE "selected_deal_id" IS NULL AND "dealId" IS NOT NULL;

-- Add missing columns to PickupAppointment  
ALTER TABLE "PickupAppointment" ADD COLUMN IF NOT EXISTS "selected_deal_id" TEXT REFERENCES "SelectedDeal"("id");
ALTER TABLE "PickupAppointment" ADD COLUMN IF NOT EXISTS "buyer_id" TEXT REFERENCES "User"("id");
ALTER TABLE "PickupAppointment" ADD COLUMN IF NOT EXISTS "dealer_id" TEXT REFERENCES "Dealer"("id");
ALTER TABLE "PickupAppointment" ADD COLUMN IF NOT EXISTS "meta_json" JSONB;

-- Migrate existing data
UPDATE "PickupAppointment" SET "selected_deal_id" = "dealId" WHERE "selected_deal_id" IS NULL AND "dealId" IS NOT NULL;
UPDATE "PickupAppointment" SET "buyer_id" = "buyerId" WHERE "buyer_id" IS NULL AND "buyerId" IS NOT NULL;
UPDATE "PickupAppointment" SET "dealer_id" = "dealerId" WHERE "dealer_id" IS NULL AND "dealerId" IS NOT NULL;

-- Create esign_events audit table
CREATE TABLE IF NOT EXISTS "esign_events" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "selected_deal_id" TEXT REFERENCES "SelectedDeal"("id"),
  "envelope_id" TEXT,
  "type" TEXT NOT NULL,
  "provider" TEXT,
  "details" JSONB,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Create pickup_events audit table
CREATE TABLE IF NOT EXISTS "pickup_events" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pickup_appointment_id" TEXT REFERENCES "PickupAppointment"("id"),
  "selected_deal_id" TEXT REFERENCES "SelectedDeal"("id"),
  "type" TEXT NOT NULL,
  "changed_by_user_id" TEXT REFERENCES "User"("id"),
  "changed_by_role" TEXT,
  "details" JSONB,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_esign_events_deal" ON "esign_events"("selected_deal_id");
CREATE INDEX IF NOT EXISTS "idx_esign_events_envelope" ON "esign_events"("envelope_id");
CREATE INDEX IF NOT EXISTS "idx_pickup_events_deal" ON "pickup_events"("selected_deal_id");
CREATE INDEX IF NOT EXISTS "idx_pickup_events_appointment" ON "pickup_events"("pickup_appointment_id");
CREATE INDEX IF NOT EXISTS "idx_esign_envelope_deal" ON "ESignEnvelope"("selected_deal_id");
CREATE INDEX IF NOT EXISTS "idx_pickup_appointment_deal" ON "PickupAppointment"("selected_deal_id");
CREATE INDEX IF NOT EXISTS "idx_pickup_appointment_dealer" ON "PickupAppointment"("dealer_id");
CREATE INDEX IF NOT EXISTS "idx_pickup_appointment_status" ON "PickupAppointment"("status");
