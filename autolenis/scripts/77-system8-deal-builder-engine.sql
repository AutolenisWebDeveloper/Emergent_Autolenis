-- System 8: Deal Builder & Buyer Decision Engine
-- Extend SelectedDeal and related tables for complete deal workflow

-- Add missing columns to SelectedDeal for deal state machine
ALTER TABLE "SelectedDeal" ADD COLUMN IF NOT EXISTS "auction_offer_id" TEXT;
ALTER TABLE "SelectedDeal" ADD COLUMN IF NOT EXISTS "payment_type" TEXT DEFAULT 'FINANCED';
ALTER TABLE "SelectedDeal" ADD COLUMN IF NOT EXISTS "concierge_fee_method" TEXT DEFAULT 'UNDECIDED';
ALTER TABLE "SelectedDeal" ADD COLUMN IF NOT EXISTS "concierge_fee_status" TEXT DEFAULT 'PENDING';
ALTER TABLE "SelectedDeal" ADD COLUMN IF NOT EXISTS "insurance_status" TEXT DEFAULT 'NOT_SELECTED';
ALTER TABLE "SelectedDeal" ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT;
ALTER TABLE "SelectedDeal" ADD COLUMN IF NOT EXISTS "primary_monthly_payment_cents" INTEGER;
ALTER TABLE "SelectedDeal" ADD COLUMN IF NOT EXISTS "term_months" INTEGER;

-- Add columns to FinancingOffer for System 8
ALTER TABLE "FinancingOffer" ADD COLUMN IF NOT EXISTS "selected_deal_id" TEXT;
ALTER TABLE "FinancingOffer" ADD COLUMN IF NOT EXISTS "lender_name" TEXT;
ALTER TABLE "FinancingOffer" ADD COLUMN IF NOT EXISTS "down_payment_cents" INTEGER;
ALTER TABLE "FinancingOffer" ADD COLUMN IF NOT EXISTS "est_monthly_payment_cents" INTEGER;
ALTER TABLE "FinancingOffer" ADD COLUMN IF NOT EXISTS "is_primary_choice" BOOLEAN DEFAULT FALSE;
ALTER TABLE "FinancingOffer" ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'AUTOLENIS_PARTNER';

-- Add selected_deal_id foreign key to ExternalPreApproval if not exists
ALTER TABLE "ExternalPreApproval" ADD COLUMN IF NOT EXISTS "selected_deal_id" TEXT;

-- Create indexes for deal queries
CREATE INDEX IF NOT EXISTS idx_selected_deal_user_status ON "SelectedDeal"("user_id", "deal_status");
CREATE INDEX IF NOT EXISTS idx_selected_deal_auction ON "SelectedDeal"("auctionId");
CREATE INDEX IF NOT EXISTS idx_financing_offer_deal ON "FinancingOffer"("selected_deal_id");
CREATE INDEX IF NOT EXISTS idx_external_preapproval_deal ON "ExternalPreApproval"("selected_deal_id");

-- Create deal_status_history table for audit trail
CREATE TABLE IF NOT EXISTS "deal_status_history" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "selected_deal_id" TEXT NOT NULL,
  "previous_status" TEXT,
  "new_status" TEXT NOT NULL,
  "changed_by_user_id" TEXT,
  "changed_by_role" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_status_history_deal ON "deal_status_history"("selected_deal_id");

-- Migrate existing data
UPDATE "SelectedDeal" SET "auction_offer_id" = "offerId" WHERE "auction_offer_id" IS NULL AND "offerId" IS NOT NULL;
UPDATE "SelectedDeal" SET "payment_type" = 'FINANCED' WHERE "payment_type" IS NULL;
UPDATE "SelectedDeal" SET "concierge_fee_method" = 'UNDECIDED' WHERE "concierge_fee_method" IS NULL;
UPDATE "SelectedDeal" SET "concierge_fee_status" = 'PENDING' WHERE "concierge_fee_status" IS NULL;
UPDATE "SelectedDeal" SET "insurance_status" = 'NOT_SELECTED' WHERE "insurance_status" IS NULL;
UPDATE "FinancingOffer" SET "selected_deal_id" = "dealId" WHERE "selected_deal_id" IS NULL AND "dealId" IS NOT NULL;
UPDATE "FinancingOffer" SET "lender_name" = "lenderName" WHERE "lender_name" IS NULL AND "lenderName" IS NOT NULL;
