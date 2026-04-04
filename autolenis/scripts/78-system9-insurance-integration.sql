-- System 9: Insurance Integration System
-- Add missing columns to existing tables and create new tables

-- ========== Insurance Providers (configuration) ==========
CREATE TABLE IF NOT EXISTS "insurance_providers" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "api_base_url" TEXT,
  "api_key_ref" TEXT,
  "active" BOOLEAN DEFAULT true,
  "config_json" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- ========== Insurance Events (audit logging) ==========
CREATE TABLE IF NOT EXISTS "insurance_events" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "selected_deal_id" TEXT REFERENCES "SelectedDeal"("id") ON DELETE SET NULL,
  "user_id" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "type" TEXT NOT NULL, -- QUOTE_REQUESTED, QUOTE_RECEIVED, QUOTE_FAILED, QUOTE_SELECTED, POLICY_BOUND, POLICY_UPLOAD, POLICY_VERIFIED, ERROR
  "provider_name" TEXT,
  "details" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW()
);

-- ========== Add missing columns to InsuranceQuote ==========
ALTER TABLE "InsuranceQuote" ADD COLUMN IF NOT EXISTS "selected_deal_id" TEXT REFERENCES "SelectedDeal"("id") ON DELETE CASCADE;
ALTER TABLE "InsuranceQuote" ADD COLUMN IF NOT EXISTS "quote_ref" TEXT;
ALTER TABLE "InsuranceQuote" ADD COLUMN IF NOT EXISTS "quote_status" TEXT DEFAULT 'NEW'; -- NEW, VIEWED, SELECTED, EXPIRED, CONVERTED
ALTER TABLE "InsuranceQuote" ADD COLUMN IF NOT EXISTS "valid_until" TIMESTAMP;
ALTER TABLE "InsuranceQuote" ADD COLUMN IF NOT EXISTS "vehicle_vin" TEXT;
ALTER TABLE "InsuranceQuote" ADD COLUMN IF NOT EXISTS "premium_annual_cents" INTEGER;
ALTER TABLE "InsuranceQuote" ADD COLUMN IF NOT EXISTS "provider_name" TEXT;

-- ========== Add missing columns to InsurancePolicy ==========
ALTER TABLE "InsurancePolicy" ADD COLUMN IF NOT EXISTS "selected_deal_id" TEXT REFERENCES "SelectedDeal"("id") ON DELETE SET NULL;
ALTER TABLE "InsurancePolicy" ADD COLUMN IF NOT EXISTS "raw_policy_json" JSONB;
ALTER TABLE "InsurancePolicy" ADD COLUMN IF NOT EXISTS "is_verified" BOOLEAN DEFAULT false;
ALTER TABLE "InsurancePolicy" ADD COLUMN IF NOT EXISTS "vehicle_vin" TEXT;

-- ========== Create indexes ==========
CREATE INDEX IF NOT EXISTS "idx_insurance_quotes_deal" ON "InsuranceQuote"("selected_deal_id");
CREATE INDEX IF NOT EXISTS "idx_insurance_quotes_status" ON "InsuranceQuote"("quote_status");
CREATE INDEX IF NOT EXISTS "idx_insurance_policies_deal" ON "InsurancePolicy"("selected_deal_id");
CREATE INDEX IF NOT EXISTS "idx_insurance_events_deal" ON "insurance_events"("selected_deal_id");
CREATE INDEX IF NOT EXISTS "idx_insurance_events_type" ON "insurance_events"("type");

-- ========== Seed default providers ==========
INSERT INTO "insurance_providers" ("name", "api_base_url", "active", "config_json")
VALUES 
  ('AutoLenis Partner Network', 'https://api.autolenis-insurance.com', true, '{"default": true}'),
  ('Progressive Direct', 'https://api.progressive.com', false, '{}'),
  ('Geico Partner', 'https://partner.geico.com', false, '{}')
ON CONFLICT DO NOTHING;
