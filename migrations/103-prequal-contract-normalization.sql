-- ============================================
-- Migration 103: PreQual & Contract Normalization
-- Purpose: Normalize prequal fields to canonical camelCase cents-based format
--          and ensure contract tables have consistent naming
-- Date: 2026-03-07
-- ============================================
-- This migration is idempotent and safe to run multiple times.
-- ============================================

-- 1. Ensure canonical cents-based columns exist on PreQualification
-- ----------------------------------------------------------------
-- maxOtdAmountCents, minMonthlyPaymentCents, maxMonthlyPaymentCents, dtiRatio
-- are the canonical fields. Legacy float columns (maxOtd, estimatedMonthlyMin,
-- estimatedMonthlyMax, dti) are kept for backward-compat reads but new writes
-- MUST target the cents columns.

DO $$
BEGIN
  ALTER TABLE public."PreQualification"
    ADD COLUMN IF NOT EXISTS "maxOtdAmountCents" INTEGER;
  ALTER TABLE public."PreQualification"
    ADD COLUMN IF NOT EXISTS "minMonthlyPaymentCents" INTEGER;
  ALTER TABLE public."PreQualification"
    ADD COLUMN IF NOT EXISTS "maxMonthlyPaymentCents" INTEGER;
  ALTER TABLE public."PreQualification"
    ADD COLUMN IF NOT EXISTS "dtiRatio" DOUBLE PRECISION;
  ALTER TABLE public."PreQualification"
    ADD COLUMN IF NOT EXISTS "providerReferenceId" TEXT;
  ALTER TABLE public."PreQualification"
    ADD COLUMN IF NOT EXISTS "rawResponseJson" JSONB;
  RAISE NOTICE '✓ PreQualification canonical columns ensured';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'PreQualification columns already exist';
END $$;

-- 2. Backfill cents columns from legacy float columns (one-time, idempotent)
-- ---------------------------------------------------------------------------
UPDATE public."PreQualification"
SET
  "maxOtdAmountCents"      = CASE WHEN "maxOtdAmountCents" IS NULL AND "maxOtd" IS NOT NULL
                                  THEN FLOOR("maxOtd" * 100)::INTEGER
                                  ELSE "maxOtdAmountCents" END,
  "minMonthlyPaymentCents" = CASE WHEN "minMonthlyPaymentCents" IS NULL AND "estimatedMonthlyMin" IS NOT NULL
                                  THEN FLOOR("estimatedMonthlyMin" * 100)::INTEGER
                                  ELSE "minMonthlyPaymentCents" END,
  "maxMonthlyPaymentCents" = CASE WHEN "maxMonthlyPaymentCents" IS NULL AND "estimatedMonthlyMax" IS NOT NULL
                                  THEN FLOOR("estimatedMonthlyMax" * 100)::INTEGER
                                  ELSE "maxMonthlyPaymentCents" END,
  "dtiRatio"               = CASE WHEN "dtiRatio" IS NULL AND "dti" IS NOT NULL
                                  THEN "dti"
                                  ELSE "dtiRatio" END
WHERE "maxOtdAmountCents" IS NULL
   OR "minMonthlyPaymentCents" IS NULL
   OR "maxMonthlyPaymentCents" IS NULL
   OR "dtiRatio" IS NULL;

-- 3. Ensure ContractScan and ContractFixItem table structures are consistent
-- --------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public."ContractScan"
    ADD COLUMN IF NOT EXISTS "correlationId" TEXT;
  RAISE NOTICE '✓ ContractScan.correlationId ensured';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'ContractScan table does not exist yet — skipping';
  WHEN duplicate_column THEN
    RAISE NOTICE 'ContractScan.correlationId already exists';
END $$;

-- ============================================
-- Verification
-- ============================================
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'PreQualification'
    AND column_name IN ('maxOtdAmountCents', 'minMonthlyPaymentCents', 'maxMonthlyPaymentCents', 'dtiRatio');

  IF col_count = 4 THEN
    RAISE NOTICE '✓ All canonical PreQualification columns present';
  ELSE
    RAISE EXCEPTION '✗ Missing PreQualification columns (found %/4)', col_count;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 103: PreQual & Contract Normalization Complete';
  RAISE NOTICE '========================================';
END $$;
