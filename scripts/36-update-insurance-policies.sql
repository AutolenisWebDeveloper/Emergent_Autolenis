-- Update InsurancePolicy with type field
DO $$ BEGIN
  CREATE TYPE "InsurancePolicyType" AS ENUM ('AUTOLENIS', 'EXTERNAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "InsurancePolicy" ADD COLUMN IF NOT EXISTS "type" "InsurancePolicyType";
ALTER TABLE "InsurancePolicy" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "InsurancePolicy" ADD COLUMN IF NOT EXISTS "start_date" DATE;
ALTER TABLE "InsurancePolicy" ADD COLUMN IF NOT EXISTS "end_date" DATE;
ALTER TABLE "InsurancePolicy" ADD COLUMN IF NOT EXISTS "policy_number_v2" TEXT;

-- Migrate dates
UPDATE "InsurancePolicy" SET "start_date" = "effectiveDate"::date WHERE "effectiveDate" IS NOT NULL;
UPDATE "InsurancePolicy" SET "end_date" = "expirationDate"::date WHERE "expirationDate" IS NOT NULL;
UPDATE "InsurancePolicy" SET "policy_number_v2" = "policyNumber" WHERE "policy_number_v2" IS NULL;
