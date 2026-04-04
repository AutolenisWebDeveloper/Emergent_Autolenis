-- Update PreQualification with additional fields
-- Removed PreQualStatus enum creation since PreQualification uses existing columns without this enum

-- Add new fields to PreQualification table if they don't exist
ALTER TABLE "PreQualification"
ADD COLUMN IF NOT EXISTS "max_otd_amount_cents" INTEGER,
ADD COLUMN IF NOT EXISTS "min_monthly_payment_cents" INTEGER,
ADD COLUMN IF NOT EXISTS "max_monthly_payment_cents" INTEGER,
ADD COLUMN IF NOT EXISTS "dti_ratio" NUMERIC;

-- Migrate existing data to cents columns (only if source columns have data)
UPDATE "PreQualification" 
SET "max_otd_amount_cents" = CAST("maxOtd" * 100 AS INTEGER) 
WHERE "maxOtd" IS NOT NULL AND "max_otd_amount_cents" IS NULL;

UPDATE "PreQualification" 
SET "min_monthly_payment_cents" = CAST("estimatedMonthlyMin" * 100 AS INTEGER) 
WHERE "estimatedMonthlyMin" IS NOT NULL AND "min_monthly_payment_cents" IS NULL;

UPDATE "PreQualification" 
SET "max_monthly_payment_cents" = CAST("estimatedMonthlyMax" * 100 AS INTEGER) 
WHERE "estimatedMonthlyMax" IS NOT NULL AND "max_monthly_payment_cents" IS NULL;

UPDATE "PreQualification" 
SET "dti_ratio" = "dti" 
WHERE "dti" IS NOT NULL AND "dti_ratio" IS NULL;
