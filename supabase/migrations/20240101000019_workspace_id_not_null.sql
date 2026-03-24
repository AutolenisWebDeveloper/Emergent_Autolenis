-- BLOCKER 11 FIX: Make workspaceId NOT NULL on all 7 financial tables
--
-- Migration 20240101000011 backfilled SelectedDeal, ServiceFeePayment,
-- Transaction, FinancingOffer, DepositPayment but intentionally left the
-- NOT NULL constraint for a follow-up migration (this one).
--
-- It also missed InsurancePolicy, ContractDocument, and ContractShieldScan.
--
-- This migration:
--   1. Backfills ALL 7 tables that will receive SET NOT NULL.
--      Migration 011 may not have caught rows created after it ran (e.g.
--      on a Supabase Preview branch cloned from production). Re-running
--      the backfill here is safe because the UPDATE WHERE IS NULL is a no-op
--      for rows that are already populated.
--   2. Applies the NOT NULL constraint to all 7 tables.
--
-- Run this AFTER 20240101000011 has been applied and all rows verified.

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Backfill all 7 tables
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  default_workspace_id TEXT;
  null_count           BIGINT;
BEGIN
  SELECT id INTO default_workspace_id
  FROM "Workspace"
  WHERE mode = 'LIVE'
  ORDER BY "createdAt"
  LIMIT 1;

  -- If no LIVE workspace exists but any of the 7 tables have NULL rows,
  -- fail fast rather than silently skipping and then crashing on SET NOT NULL.
  IF default_workspace_id IS NULL THEN
    SELECT COUNT(*) INTO null_count FROM (
      SELECT 1 FROM "SelectedDeal"       WHERE "workspaceId" IS NULL LIMIT 1
      UNION ALL
      SELECT 1 FROM "ServiceFeePayment"  WHERE "workspaceId" IS NULL LIMIT 1
      UNION ALL
      SELECT 1 FROM "DepositPayment"     WHERE "workspaceId" IS NULL LIMIT 1
      UNION ALL
      SELECT 1 FROM "FinancingOffer"     WHERE "workspaceId" IS NULL LIMIT 1
      UNION ALL
      SELECT 1 FROM "InsurancePolicy"    WHERE "workspaceId" IS NULL LIMIT 1
      UNION ALL
      SELECT 1 FROM "ContractDocument"   WHERE "workspaceId" IS NULL LIMIT 1
      UNION ALL
      SELECT 1 FROM "ContractShieldScan" WHERE "workspaceId" IS NULL LIMIT 1
    ) t;
    IF null_count > 0 THEN
      RAISE EXCEPTION
        'No LIVE workspace found but % table(s) still have NULL workspaceId rows. '
        'Create a LIVE workspace first, then re-run this migration.', null_count;
    END IF;
    -- No nulls and no workspace — nothing to backfill.
    RAISE NOTICE 'No LIVE workspace found and no NULL workspaceId rows — skipping backfill';
    RETURN;
  END IF;

  -- SelectedDeal: top-level deal entity, use default workspace directly.
  -- (Migration 011 may not have caught rows created after it ran.)
  UPDATE "SelectedDeal"
  SET "workspaceId" = default_workspace_id
  WHERE "workspaceId" IS NULL;

  -- FinancingOffer: inherit from parent SelectedDeal (JOIN, not correlated subquery)
  UPDATE "FinancingOffer" fo
  SET "workspaceId" = COALESCE(sd."workspaceId", default_workspace_id)
  FROM "SelectedDeal" sd
  WHERE sd.id = fo."dealId"
    AND fo."workspaceId" IS NULL;

  -- ServiceFeePayment: inherit from parent SelectedDeal
  UPDATE "ServiceFeePayment" sfp
  SET "workspaceId" = COALESCE(sd."workspaceId", default_workspace_id)
  FROM "SelectedDeal" sd
  WHERE sd.id = sfp."dealId"
    AND sfp."workspaceId" IS NULL;

  -- DepositPayment: inherit from parent Auction (linked by auctionId)
  UPDATE "DepositPayment" dp
  SET "workspaceId" = COALESCE(a."workspaceId", default_workspace_id)
  FROM "Auction" a
  WHERE a.id = dp."auctionId"
    AND dp."workspaceId" IS NULL;

  -- InsurancePolicy: inherit from parent SelectedDeal
  UPDATE "InsurancePolicy" ip
  SET "workspaceId" = COALESCE(sd."workspaceId", default_workspace_id)
  FROM "SelectedDeal" sd
  WHERE sd.id = ip."dealId"
    AND ip."workspaceId" IS NULL;

  -- ContractDocument: inherit from parent SelectedDeal
  UPDATE "ContractDocument" cd
  SET "workspaceId" = COALESCE(sd."workspaceId", default_workspace_id)
  FROM "SelectedDeal" sd
  WHERE sd.id = cd."dealId"
    AND cd."workspaceId" IS NULL;

  -- ContractShieldScan: inherit from parent SelectedDeal
  UPDATE "ContractShieldScan" css
  SET "workspaceId" = COALESCE(sd."workspaceId", default_workspace_id)
  FROM "SelectedDeal" sd
  WHERE sd.id = css."dealId"
    AND css."workspaceId" IS NULL;

  RAISE NOTICE 'Backfill complete for all 7 workspace-scoped tables';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Apply NOT NULL constraints
-- Any remaining NULLs will cause these to fail — fix the backfill first.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "SelectedDeal"       ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "ServiceFeePayment"  ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "DepositPayment"     ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "FinancingOffer"     ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "InsurancePolicy"    ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "ContractDocument"   ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "ContractShieldScan" ALTER COLUMN "workspaceId" SET NOT NULL;
