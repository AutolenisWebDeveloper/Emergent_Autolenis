-- Migration M001: Deal status canonicalization
-- Purpose: Backfill legacy deal_status values into status, then drop deal_status column
--
-- This migration canonicalizes SelectedDeal.status as the ONLY lifecycle field.
-- All code has been updated to read/write status exclusively.
--
-- Run in a transaction. Ensure application code is deployed BEFORE running this migration.

BEGIN;

-- Step 1: Backfill — copy deal_status into status where status is missing or stale
-- Also normalize known legacy values to canonical Prisma enum values
UPDATE "SelectedDeal"
SET "status" = CASE
  WHEN "deal_status" = 'PENDING_FINANCING'  THEN 'FINANCING_PENDING'
  WHEN "deal_status" = 'FINANCING_CHOSEN'   THEN 'FINANCING_APPROVED'
  WHEN "deal_status" = 'INSURANCE_READY'    THEN 'INSURANCE_PENDING'
  WHEN "deal_status" = 'CONTRACT_PASSED'    THEN 'CONTRACT_APPROVED'
  WHEN "deal_status" = 'COMPLETE'           THEN 'COMPLETED'
  ELSE "deal_status"  -- Pass through values already matching canonical DealStatus enum
END
WHERE "deal_status" IS NOT NULL
  AND "deal_status" != ''
  AND ("status" IS NULL OR "status" = 'SELECTED');

-- Step 2: For rows where deal_status was more advanced than status, prefer deal_status
-- This catches cases where dual-write was out of sync
UPDATE "SelectedDeal"
SET "status" = CASE
  WHEN "deal_status" = 'PENDING_FINANCING'  THEN 'FINANCING_PENDING'
  WHEN "deal_status" = 'FINANCING_CHOSEN'   THEN 'FINANCING_APPROVED'
  WHEN "deal_status" = 'INSURANCE_READY'    THEN 'INSURANCE_PENDING'
  WHEN "deal_status" = 'CONTRACT_PASSED'    THEN 'CONTRACT_APPROVED'
  WHEN "deal_status" = 'COMPLETE'           THEN 'COMPLETED'
  ELSE "deal_status"  -- Pass through values already matching canonical DealStatus enum
END
WHERE "deal_status" IS NOT NULL
  AND "deal_status" != ''
  AND "deal_status" != "status";

-- Step 3: Drop the deal_status column
ALTER TABLE "SelectedDeal" DROP COLUMN IF EXISTS "deal_status";

COMMIT;
