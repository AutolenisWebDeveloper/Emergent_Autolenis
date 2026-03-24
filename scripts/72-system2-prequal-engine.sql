-- System 2: Buyer Profile & Pre-Qualification Engine
-- Additive migrations only - do not drop existing tables

-- 1. Add missing columns to BuyerProfile if they don't exist
ALTER TABLE "BuyerProfile" 
ADD COLUMN IF NOT EXISTS "address_line1" text,
ADD COLUMN IF NOT EXISTS "address_line2" text,
ADD COLUMN IF NOT EXISTS "date_of_birth" date,
ADD COLUMN IF NOT EXISTS "employment_status" text,
ADD COLUMN IF NOT EXISTS "employer_name" text,
ADD COLUMN IF NOT EXISTS "monthly_income_cents" integer,
ADD COLUMN IF NOT EXISTS "monthly_housing_cents" integer,
ADD COLUMN IF NOT EXISTS "country" text DEFAULT 'US';

-- 2. Add missing columns to PreQualification if they don't exist
ALTER TABLE "PreQualification"
ADD COLUMN IF NOT EXISTS "prequal_status" text DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS "provider_name" text,
ADD COLUMN IF NOT EXISTS "provider_reference_id" text,
ADD COLUMN IF NOT EXISTS "raw_response_json" jsonb,
ADD COLUMN IF NOT EXISTS "max_otd_amount_cents" integer,
ADD COLUMN IF NOT EXISTS "min_monthly_payment_cents" integer,
ADD COLUMN IF NOT EXISTS "max_monthly_payment_cents" integer,
ADD COLUMN IF NOT EXISTS "dti_ratio" numeric(5,2);

-- 3. Create credit_consent_events table
CREATE TABLE IF NOT EXISTS "credit_consent_events" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "consent_given" boolean NOT NULL,
  "consent_text" text NOT NULL,
  "provider_name" text NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "credit_consent_events_user_id_idx" ON "credit_consent_events"("user_id");

-- 4. Create prequal_provider_events table
CREATE TABLE IF NOT EXISTS "prequal_provider_events" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "pre_qualification_id" text REFERENCES "PreQualification"("id") ON DELETE SET NULL,
  "request_payload" jsonb NOT NULL,
  "response_payload" jsonb,
  "status" text NOT NULL CHECK (status IN ('SUCCESS', 'ERROR')),
  "error_message" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "prequal_provider_events_user_id_idx" ON "prequal_provider_events"("user_id");
CREATE INDEX IF NOT EXISTS "prequal_provider_events_prequal_id_idx" ON "prequal_provider_events"("pre_qualification_id");

-- 5. Create partial unique index for one ACTIVE prequal per user
-- Drop existing index if it exists with wrong name
DROP INDEX IF EXISTS "prequal_active_user_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "prequal_one_active_per_user" 
ON "PreQualification"("buyerId") 
WHERE "prequal_status" = 'ACTIVE';

-- 6. Migrate existing data - set status to ACTIVE for non-expired, EXPIRED for expired
UPDATE "PreQualification"
SET "prequal_status" = CASE 
  WHEN "expiresAt" IS NULL OR "expiresAt" > now() THEN 'ACTIVE'
  ELSE 'EXPIRED'
END
WHERE "prequal_status" IS NULL;

-- 7. Convert existing maxOtd to cents if needed
UPDATE "PreQualification"
SET "max_otd_amount_cents" = COALESCE("maxOtd", 0) * 100
WHERE "max_otd_amount_cents" IS NULL AND "maxOtd" IS NOT NULL;

UPDATE "PreQualification"
SET "max_monthly_payment_cents" = COALESCE("estimatedMonthlyMax", 0) * 100
WHERE "max_monthly_payment_cents" IS NULL AND "estimatedMonthlyMax" IS NOT NULL;

UPDATE "PreQualification"
SET "min_monthly_payment_cents" = COALESCE("estimatedMonthlyMin", 0) * 100
WHERE "min_monthly_payment_cents" IS NULL AND "estimatedMonthlyMin" IS NOT NULL;

UPDATE "PreQualification"
SET "dti_ratio" = "dti"
WHERE "dti_ratio" IS NULL AND "dti" IS NOT NULL;
