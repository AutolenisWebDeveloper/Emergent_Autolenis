-- ============================================================
-- M007 — Refund Status Canonicalization
-- ============================================================
-- Converts any RefundStatus = 'COMPLETED' rows to 'SUCCEEDED'
-- to align with the canonical terminal state defined in
-- prisma/schema.prisma (RefundStatus enum).
--
-- Safe to run multiple times (idempotent).
-- Should be run BEFORE deploying the Prisma schema change that
-- removes COMPLETED from the RefundStatus enum.
-- ============================================================

-- Step 1: Add SUCCEEDED to the enum if it doesn't exist yet
-- (Required if M006 was already applied with COMPLETED only)
DO $$
BEGIN
  -- Check if SUCCEEDED already exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'SUCCEEDED'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'RefundStatus')
  ) THEN
    ALTER TYPE "RefundStatus" ADD VALUE 'SUCCEEDED';
  END IF;
END $$;

-- Step 2: Convert all COMPLETED refund rows to SUCCEEDED
UPDATE "Refund"
SET "status" = 'SUCCEEDED'::"RefundStatus"
WHERE "status" = 'COMPLETED'::"RefundStatus";

-- Step 3: Report affected rows (for operator verification)
-- Run this SELECT separately to see the count:
-- SELECT COUNT(*) AS migrated_rows FROM "Refund" WHERE "status" = 'SUCCEEDED';
-- SELECT COUNT(*) AS remaining_completed FROM "Refund" WHERE "status" = 'COMPLETED';

-- ============================================================
-- NOTE: After this migration, the COMPLETED value remains in
-- the PostgreSQL enum type but is DEPRECATED and must never be
-- used in new writes. PostgreSQL does not support removing
-- values from an enum without recreating the type.
--
-- Source of truth: prisma/schema.prisma defines RefundStatus as
-- ['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED'] — COMPLETED
-- is intentionally excluded. All application code writes
-- SUCCEEDED as the canonical terminal refund status.
-- ============================================================
