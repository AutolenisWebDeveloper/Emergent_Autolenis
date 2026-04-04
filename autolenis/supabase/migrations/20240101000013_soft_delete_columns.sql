-- FIX 10: Add soft-delete deletedAt columns to financial/account tables
-- These columns replace ON DELETE CASCADE with soft deletion.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

ALTER TABLE "BuyerProfile"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

ALTER TABLE "SelectedDeal"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

ALTER TABLE "ServiceFeePayment"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ;

-- Index for efficient soft-deleted record filtering
CREATE INDEX IF NOT EXISTS "idx_user_deleted_at" ON "User" ("deletedAt") WHERE "deletedAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_buyer_profile_deleted_at" ON "BuyerProfile" ("deletedAt") WHERE "deletedAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_selected_deal_deleted_at" ON "SelectedDeal" ("deletedAt") WHERE "deletedAt" IS NOT NULL;
