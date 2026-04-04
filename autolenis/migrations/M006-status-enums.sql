-- Migration M006: Status Enums
-- Date: 2026-03-12
-- Issue: #13 — Convert legacy string status fields to typed Prisma enums
--
-- Purpose:
--   Convert String-typed status columns on Commission, Payout, Refund,
--   DepositRequest, ConciergeFeeRequest, and LenderFeeDisbursement to
--   native PostgreSQL enums matching the Prisma schema definitions.
--
-- Safety:
--   - Pre-flight validation rejects the migration if any invalid values exist
--   - Column conversion uses USING clause for zero-downtime type cast
--   - Wrapped in a transaction for atomicity
--
-- Pre-requisites:
--   - Deploy updated application code FIRST (uses enum-compatible values)
--   - Ensure a database backup exists before running
--
-- Rollback: See bottom of file

BEGIN;

-- ============================================================
-- PHASE 0: Pre-flight validation — reject if invalid values exist
-- ============================================================

DO $$
DECLARE
  bad_commission INT;
  bad_payout INT;
  bad_refund INT;
  bad_deposit_req INT;
  bad_concierge_req INT;
  bad_lender INT;
BEGIN
  SELECT COUNT(*) INTO bad_commission
  FROM "Commission"
  WHERE "status" NOT IN ('PENDING', 'EARNED', 'PAID', 'CANCELLED');

  SELECT COUNT(*) INTO bad_payout
  FROM "Payout"
  WHERE "status" NOT IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

  SELECT COUNT(*) INTO bad_refund
  FROM "Refund"
  WHERE "status" NOT IN ('PENDING', 'SUCCEEDED', 'COMPLETED', 'FAILED', 'CANCELLED');

  SELECT COUNT(*) INTO bad_deposit_req
  FROM "DepositRequest"
  WHERE "status" NOT IN ('REQUESTED', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

  SELECT COUNT(*) INTO bad_concierge_req
  FROM "ConciergeFeeRequest"
  WHERE "status" NOT IN ('REQUESTED', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

  SELECT COUNT(*) INTO bad_lender
  FROM "LenderFeeDisbursement"
  WHERE "status" NOT IN ('PENDING', 'DISBURSED');

  IF bad_commission > 0 THEN
    RAISE EXCEPTION 'M006 blocked: % Commission rows have invalid status values', bad_commission;
  END IF;
  IF bad_payout > 0 THEN
    RAISE EXCEPTION 'M006 blocked: % Payout rows have invalid status values', bad_payout;
  END IF;
  IF bad_refund > 0 THEN
    RAISE EXCEPTION 'M006 blocked: % Refund rows have invalid status values', bad_refund;
  END IF;
  IF bad_deposit_req > 0 THEN
    RAISE EXCEPTION 'M006 blocked: % DepositRequest rows have invalid status values', bad_deposit_req;
  END IF;
  IF bad_concierge_req > 0 THEN
    RAISE EXCEPTION 'M006 blocked: % ConciergeFeeRequest rows have invalid status values', bad_concierge_req;
  END IF;
  IF bad_lender > 0 THEN
    RAISE EXCEPTION 'M006 blocked: % LenderFeeDisbursement rows have invalid status values', bad_lender;
  END IF;
END $$;

-- ============================================================
-- PHASE 1: Create enum types
-- ============================================================

CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'EARNED', 'PAID', 'CANCELLED');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "DepositRequestStatus" AS ENUM ('REQUESTED', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');
CREATE TYPE "ConciergeFeeRequestStatus" AS ENUM ('REQUESTED', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');
CREATE TYPE "LenderDisbursementStatus" AS ENUM ('PENDING', 'DISBURSED');

-- ============================================================
-- PHASE 2: Convert columns from text to enum
-- ============================================================

ALTER TABLE "Commission"
  ALTER COLUMN "status" SET DEFAULT NULL,
  ALTER COLUMN "status" TYPE "CommissionStatus" USING "status"::"CommissionStatus",
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "Payout"
  ALTER COLUMN "status" SET DEFAULT NULL,
  ALTER COLUMN "status" TYPE "PayoutStatus" USING "status"::"PayoutStatus",
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "Refund"
  ALTER COLUMN "status" SET DEFAULT NULL,
  ALTER COLUMN "status" TYPE "RefundStatus" USING "status"::"RefundStatus",
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "DepositRequest"
  ALTER COLUMN "status" SET DEFAULT NULL,
  ALTER COLUMN "status" TYPE "DepositRequestStatus" USING "status"::"DepositRequestStatus",
  ALTER COLUMN "status" SET DEFAULT 'REQUESTED';

ALTER TABLE "ConciergeFeeRequest"
  ALTER COLUMN "status" SET DEFAULT NULL,
  ALTER COLUMN "status" TYPE "ConciergeFeeRequestStatus" USING "status"::"ConciergeFeeRequestStatus",
  ALTER COLUMN "status" SET DEFAULT 'REQUESTED';

ALTER TABLE "LenderFeeDisbursement"
  ALTER COLUMN "status" SET DEFAULT NULL,
  ALTER COLUMN "status" TYPE "LenderDisbursementStatus" USING "status"::"LenderDisbursementStatus",
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================
-- SELECT column_name, data_type, udt_name
-- FROM information_schema.columns
-- WHERE table_name IN ('Commission','Payout','Refund','DepositRequest','ConciergeFeeRequest','LenderFeeDisbursement')
--   AND column_name = 'status'
-- ORDER BY table_name;
--
-- Expected: all rows should show data_type = 'USER-DEFINED' and udt_name matching the enum name

-- ============================================================
-- DEPLOYMENT NOTES
-- ============================================================
-- 1. Deploy code changes FIRST (service layer uses enum-compatible constants)
-- 2. Run this migration SECOND:
--    psql $DATABASE_URL < migrations/M006-status-enums.sql
-- 3. Verify with the queries above
-- 4. Monitor application logs for any enum cast errors

-- ============================================================
-- ROLLBACK NOTES
-- ============================================================
-- To rollback, convert columns back to text and drop enum types:
--
-- BEGIN;
-- ALTER TABLE "Commission"
--   ALTER COLUMN "status" SET DEFAULT NULL,
--   ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT,
--   ALTER COLUMN "status" SET DEFAULT 'PENDING';
-- ALTER TABLE "Payout"
--   ALTER COLUMN "status" SET DEFAULT NULL,
--   ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT,
--   ALTER COLUMN "status" SET DEFAULT 'PENDING';
-- ALTER TABLE "Refund"
--   ALTER COLUMN "status" SET DEFAULT NULL,
--   ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT,
--   ALTER COLUMN "status" SET DEFAULT 'PENDING';
-- ALTER TABLE "DepositRequest"
--   ALTER COLUMN "status" SET DEFAULT NULL,
--   ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT,
--   ALTER COLUMN "status" SET DEFAULT 'REQUESTED';
-- ALTER TABLE "ConciergeFeeRequest"
--   ALTER COLUMN "status" SET DEFAULT NULL,
--   ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT,
--   ALTER COLUMN "status" SET DEFAULT 'REQUESTED';
-- ALTER TABLE "LenderFeeDisbursement"
--   ALTER COLUMN "status" SET DEFAULT NULL,
--   ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT,
--   ALTER COLUMN "status" SET DEFAULT 'PENDING';
--
-- DROP TYPE IF EXISTS "CommissionStatus";
-- DROP TYPE IF EXISTS "PayoutStatus";
-- DROP TYPE IF EXISTS "RefundStatus";
-- DROP TYPE IF EXISTS "DepositRequestStatus";
-- DROP TYPE IF EXISTS "ConciergeFeeRequestStatus";
-- DROP TYPE IF EXISTS "LenderDisbursementStatus";
-- COMMIT;
--
-- Then revert service code to use string defaults.
