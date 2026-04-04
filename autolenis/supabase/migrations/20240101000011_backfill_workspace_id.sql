-- FIX 11: Backfill workspaceId for rows where it is NULL
-- This migration sets workspaceId on records that are missing it by inheriting
-- from the first available LIVE workspace. After this backfill, a follow-up
-- migration can make the column NOT NULL.
--
-- NOTE: Do NOT make workspaceId NOT NULL until ALL rows have been backfilled
-- and verified. The schema.prisma columns remain nullable (String?) until then.

-- Identify the first LIVE workspace to use as fallback
DO $$
DECLARE
  default_workspace_id TEXT;
BEGIN
  SELECT id INTO default_workspace_id
  FROM "Workspace"
  WHERE mode = 'LIVE'
  ORDER BY "createdAt"
  LIMIT 1;

  IF default_workspace_id IS NULL THEN
    RAISE NOTICE 'No LIVE workspace found — skipping backfill';
    RETURN;
  END IF;

  -- SelectedDeal
  UPDATE "SelectedDeal"
  SET "workspaceId" = default_workspace_id
  WHERE "workspaceId" IS NULL;

  -- ServiceFeePayment
  UPDATE "ServiceFeePayment"
  SET "workspaceId" = default_workspace_id
  WHERE "workspaceId" IS NULL;

  -- Transaction
  UPDATE "Transaction"
  SET "workspaceId" = default_workspace_id
  WHERE "workspaceId" IS NULL;

  -- FinancingOffer
  UPDATE "FinancingOffer"
  SET "workspaceId" = default_workspace_id
  WHERE "workspaceId" IS NULL;

  -- DepositPayment
  UPDATE "DepositPayment"
  SET "workspaceId" = default_workspace_id
  WHERE "workspaceId" IS NULL;

  RAISE NOTICE 'workspaceId backfill complete using workspace %', default_workspace_id;
END $$;
