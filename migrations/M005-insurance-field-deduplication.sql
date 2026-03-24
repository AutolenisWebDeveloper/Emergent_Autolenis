-- Migration M005: Insurance Field Deduplication
-- Date: 2026-03-11
-- Issue: #12 — Deduplicate InsuranceQuote and InsurancePolicy fields
--
-- Purpose:
--   1. Backfill canonical camelCase date fields from legacy duplicates
--   2. Drop legacy duplicate columns from InsurancePolicy (userId, startDate, endDate)
--   3. Drop any remaining legacy snake_case columns from both tables
--
-- Safety:
--   - All backfills use COALESCE semantics (only fill where canonical IS NULL)
--   - Column drops use IF EXISTS to be idempotent
--   - Wrap in transaction for atomicity
--
-- Rollback: See bottom of file

BEGIN;

-- ============================================================
-- PHASE 1: Backfill canonical fields in InsurancePolicy
-- ============================================================

-- Backfill effectiveDate from startDate where effectiveDate is NULL
UPDATE "InsurancePolicy"
SET "effectiveDate" = "startDate"
WHERE "effectiveDate" IS NULL
  AND "startDate" IS NOT NULL;

-- Backfill expirationDate from endDate where expirationDate is NULL
UPDATE "InsurancePolicy"
SET "expirationDate" = "endDate"
WHERE "expirationDate" IS NULL
  AND "endDate" IS NOT NULL;

-- ============================================================
-- PHASE 2: Verification queries (run before proceeding)
-- ============================================================

-- Verify no data loss: count rows where canonical dates are still NULL
-- but legacy dates had values (should return 0 after backfill)
DO $$
DECLARE
  orphaned_effective INT;
  orphaned_expiration INT;
BEGIN
  SELECT COUNT(*) INTO orphaned_effective
  FROM "InsurancePolicy"
  WHERE "effectiveDate" IS NULL AND "startDate" IS NOT NULL;

  SELECT COUNT(*) INTO orphaned_expiration
  FROM "InsurancePolicy"
  WHERE "expirationDate" IS NULL AND "endDate" IS NOT NULL;

  IF orphaned_effective > 0 OR orphaned_expiration > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % effectiveDate orphans, % expirationDate orphans',
      orphaned_effective, orphaned_expiration;
  END IF;
END $$;

-- ============================================================
-- PHASE 3: Drop legacy duplicate columns from InsurancePolicy
-- ============================================================

ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "startDate";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "endDate";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "userId";

-- Drop remaining legacy snake_case columns from InsurancePolicy (if they exist)
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "deal_id";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "selected_deal_id";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "carrier_name";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "policy_number";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "policy_number_v2";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "coverage_type";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "monthly_premium";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "start_date";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "end_date";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "document_url";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "premium_annual_cents";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "six_month_premium";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "coverage_json";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "coverage_limits";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "provider_name";

-- ============================================================
-- PHASE 4: Drop remaining legacy snake_case columns from InsuranceQuote
-- ============================================================

ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "buyer_id";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "vehicle_id";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "selected_deal_id";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "carrier_name";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "product_name";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "premium_monthly_cents";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "premium_semi_annual_cents";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "premium_annual_cents";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "six_month_premium";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "monthly_premium";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "coverage_limits";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "coverage_json";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "quote_ref";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "quote_status";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "valid_until";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "provider_name";

COMMIT;

-- ============================================================
-- DEPLOYMENT NOTES
-- ============================================================
-- 1. Deploy code changes FIRST (service layer uses canonical fields)
-- 2. Run this migration SECOND
-- 3. Verify with:
--    SELECT COUNT(*) FROM "InsurancePolicy" WHERE "effectiveDate" IS NOT NULL;
--    SELECT COUNT(*) FROM "InsurancePolicy" WHERE "expirationDate" IS NOT NULL;
--    SELECT column_name FROM information_schema.columns
--      WHERE table_name = 'InsurancePolicy'
--      ORDER BY ordinal_position;
-- 4. Monitor application logs for any column-not-found errors

-- ============================================================
-- ROLLBACK NOTES
-- ============================================================
-- To rollback, re-add the dropped columns:
--
-- ALTER TABLE "InsurancePolicy" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP;
-- ALTER TABLE "InsurancePolicy" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP;
-- ALTER TABLE "InsurancePolicy" ADD COLUMN IF NOT EXISTS "userId" TEXT;
--
-- Then backfill from canonical:
-- UPDATE "InsurancePolicy" SET "startDate" = "effectiveDate" WHERE "startDate" IS NULL;
-- UPDATE "InsurancePolicy" SET "endDate" = "expirationDate" WHERE "endDate" IS NULL;
--
-- Then revert service code to use startDate/endDate/userId.
