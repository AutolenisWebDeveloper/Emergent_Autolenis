-- Add fields to InsuranceQuote
ALTER TABLE "InsuranceQuote"
ADD COLUMN IF NOT EXISTS "productName" TEXT,
ADD COLUMN IF NOT EXISTS "monthlyPremiumCents" INTEGER,
ADD COLUMN IF NOT EXISTS "semiAnnualPremiumCents" INTEGER,
ADD COLUMN IF NOT EXISTS "coverageJson" JSONB;

UPDATE "InsuranceQuote" SET "monthlyPremiumCents" = CAST("monthlyPremium" * 100 AS INTEGER) WHERE "monthlyPremium" IS NOT NULL;
UPDATE "InsuranceQuote" SET "semiAnnualPremiumCents" = CAST("sixMonthPremium" * 100 AS INTEGER) WHERE "sixMonthPremium" IS NOT NULL;

-- Add type field to InsurancePolicy
DO $$ BEGIN
  CREATE TYPE "InsurancePolicyType" AS ENUM ('AUTOLENIS', 'EXTERNAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "InsurancePolicy"
ADD COLUMN IF NOT EXISTS "type" "InsurancePolicyType",
ADD COLUMN IF NOT EXISTS "userId" TEXT,
ADD COLUMN IF NOT EXISTS "startDate" DATE,
ADD COLUMN IF NOT EXISTS "endDate" DATE;
