-- Migration: Add workspace_id to ALL domain models for complete tenant isolation
-- Previous migration (04) only added workspace_id to User table.
-- This migration extends workspace isolation to every domain table that holds
-- user-facing data, ensuring LIVE and TEST data never mix.

-- ===== PROFILE TABLES =====

ALTER TABLE "BuyerProfile"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "BuyerProfile_workspaceId_idx" ON "BuyerProfile"("workspaceId");
ALTER TABLE "BuyerProfile"
  DROP CONSTRAINT IF EXISTS "BuyerProfile_workspaceId_fkey";
ALTER TABLE "BuyerProfile"
  ADD CONSTRAINT "BuyerProfile_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Dealer"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "Dealer_workspaceId_idx" ON "Dealer"("workspaceId");
ALTER TABLE "Dealer"
  DROP CONSTRAINT IF EXISTS "Dealer_workspaceId_fkey";
ALTER TABLE "Dealer"
  ADD CONSTRAINT "Dealer_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DealerUser"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "DealerUser_workspaceId_idx" ON "DealerUser"("workspaceId");
ALTER TABLE "DealerUser"
  DROP CONSTRAINT IF EXISTS "DealerUser_workspaceId_fkey";
ALTER TABLE "DealerUser"
  ADD CONSTRAINT "DealerUser_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdminUser"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "AdminUser_workspaceId_idx" ON "AdminUser"("workspaceId");
ALTER TABLE "AdminUser"
  DROP CONSTRAINT IF EXISTS "AdminUser_workspaceId_fkey";
ALTER TABLE "AdminUser"
  ADD CONSTRAINT "AdminUser_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Affiliate"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "Affiliate_workspaceId_idx" ON "Affiliate"("workspaceId");
ALTER TABLE "Affiliate"
  DROP CONSTRAINT IF EXISTS "Affiliate_workspaceId_fkey";
ALTER TABLE "Affiliate"
  ADD CONSTRAINT "Affiliate_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== PRE-QUALIFICATION & PREFERENCES =====

ALTER TABLE "PreQualification"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "PreQualification_workspaceId_idx" ON "PreQualification"("workspaceId");
ALTER TABLE "PreQualification"
  DROP CONSTRAINT IF EXISTS "PreQualification_workspaceId_fkey";
ALTER TABLE "PreQualification"
  ADD CONSTRAINT "PreQualification_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BuyerPreferences"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "BuyerPreferences_workspaceId_idx" ON "BuyerPreferences"("workspaceId");
ALTER TABLE "BuyerPreferences"
  DROP CONSTRAINT IF EXISTS "BuyerPreferences_workspaceId_fkey";
ALTER TABLE "BuyerPreferences"
  ADD CONSTRAINT "BuyerPreferences_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== INVENTORY & SHORTLISTS =====

ALTER TABLE "InventoryItem"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "InventoryItem_workspaceId_idx" ON "InventoryItem"("workspaceId");
ALTER TABLE "InventoryItem"
  DROP CONSTRAINT IF EXISTS "InventoryItem_workspaceId_fkey";
ALTER TABLE "InventoryItem"
  ADD CONSTRAINT "InventoryItem_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Shortlist"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "Shortlist_workspaceId_idx" ON "Shortlist"("workspaceId");
ALTER TABLE "Shortlist"
  DROP CONSTRAINT IF EXISTS "Shortlist_workspaceId_fkey";
ALTER TABLE "Shortlist"
  ADD CONSTRAINT "Shortlist_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== AUCTIONS =====

ALTER TABLE "Auction"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "Auction_workspaceId_idx" ON "Auction"("workspaceId");
ALTER TABLE "Auction"
  DROP CONSTRAINT IF EXISTS "Auction_workspaceId_fkey";
ALTER TABLE "Auction"
  ADD CONSTRAINT "Auction_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuctionParticipant"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "AuctionParticipant_workspaceId_idx" ON "AuctionParticipant"("workspaceId");
ALTER TABLE "AuctionParticipant"
  DROP CONSTRAINT IF EXISTS "AuctionParticipant_workspaceId_fkey";
ALTER TABLE "AuctionParticipant"
  ADD CONSTRAINT "AuctionParticipant_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuctionOffer"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "AuctionOffer_workspaceId_idx" ON "AuctionOffer"("workspaceId");
ALTER TABLE "AuctionOffer"
  DROP CONSTRAINT IF EXISTS "AuctionOffer_workspaceId_fkey";
ALTER TABLE "AuctionOffer"
  ADD CONSTRAINT "AuctionOffer_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== BEST PRICE & DEALS =====

ALTER TABLE "BestPriceOption"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "BestPriceOption_workspaceId_idx" ON "BestPriceOption"("workspaceId");
ALTER TABLE "BestPriceOption"
  DROP CONSTRAINT IF EXISTS "BestPriceOption_workspaceId_fkey";
ALTER TABLE "BestPriceOption"
  ADD CONSTRAINT "BestPriceOption_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SelectedDeal"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "SelectedDeal_workspaceId_idx" ON "SelectedDeal"("workspaceId");
ALTER TABLE "SelectedDeal"
  DROP CONSTRAINT IF EXISTS "SelectedDeal_workspaceId_fkey";
ALTER TABLE "SelectedDeal"
  ADD CONSTRAINT "SelectedDeal_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FinancingOffer"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "FinancingOffer_workspaceId_idx" ON "FinancingOffer"("workspaceId");
ALTER TABLE "FinancingOffer"
  DROP CONSTRAINT IF EXISTS "FinancingOffer_workspaceId_fkey";
ALTER TABLE "FinancingOffer"
  ADD CONSTRAINT "FinancingOffer_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExternalPreApproval"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "ExternalPreApproval_workspaceId_idx" ON "ExternalPreApproval"("workspaceId");
ALTER TABLE "ExternalPreApproval"
  DROP CONSTRAINT IF EXISTS "ExternalPreApproval_workspaceId_fkey";
ALTER TABLE "ExternalPreApproval"
  ADD CONSTRAINT "ExternalPreApproval_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== INSURANCE =====

ALTER TABLE "InsuranceQuote"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "InsuranceQuote_workspaceId_idx" ON "InsuranceQuote"("workspaceId");
ALTER TABLE "InsuranceQuote"
  DROP CONSTRAINT IF EXISTS "InsuranceQuote_workspaceId_fkey";
ALTER TABLE "InsuranceQuote"
  ADD CONSTRAINT "InsuranceQuote_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InsurancePolicy"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "InsurancePolicy_workspaceId_idx" ON "InsurancePolicy"("workspaceId");
ALTER TABLE "InsurancePolicy"
  DROP CONSTRAINT IF EXISTS "InsurancePolicy_workspaceId_fkey";
ALTER TABLE "InsurancePolicy"
  ADD CONSTRAINT "InsurancePolicy_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== CONTRACT SHIELD =====

ALTER TABLE "ContractDocument"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "ContractDocument_workspaceId_idx" ON "ContractDocument"("workspaceId");
ALTER TABLE "ContractDocument"
  DROP CONSTRAINT IF EXISTS "ContractDocument_workspaceId_fkey";
ALTER TABLE "ContractDocument"
  ADD CONSTRAINT "ContractDocument_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContractShieldScan"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "ContractShieldScan_workspaceId_idx" ON "ContractShieldScan"("workspaceId");
ALTER TABLE "ContractShieldScan"
  DROP CONSTRAINT IF EXISTS "ContractShieldScan_workspaceId_fkey";
ALTER TABLE "ContractShieldScan"
  ADD CONSTRAINT "ContractShieldScan_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== E-SIGNATURE =====

ALTER TABLE "ESignEnvelope"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "ESignEnvelope_workspaceId_idx" ON "ESignEnvelope"("workspaceId");
ALTER TABLE "ESignEnvelope"
  DROP CONSTRAINT IF EXISTS "ESignEnvelope_workspaceId_fkey";
ALTER TABLE "ESignEnvelope"
  ADD CONSTRAINT "ESignEnvelope_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== PICKUP =====

ALTER TABLE "PickupAppointment"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "PickupAppointment_workspaceId_idx" ON "PickupAppointment"("workspaceId");
ALTER TABLE "PickupAppointment"
  DROP CONSTRAINT IF EXISTS "PickupAppointment_workspaceId_fkey";
ALTER TABLE "PickupAppointment"
  ADD CONSTRAINT "PickupAppointment_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== AFFILIATE ENGINE =====

ALTER TABLE "Referral"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "Referral_workspaceId_idx" ON "Referral"("workspaceId");
ALTER TABLE "Referral"
  DROP CONSTRAINT IF EXISTS "Referral_workspaceId_fkey";
ALTER TABLE "Referral"
  ADD CONSTRAINT "Referral_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Click"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "Click_workspaceId_idx" ON "Click"("workspaceId");
ALTER TABLE "Click"
  DROP CONSTRAINT IF EXISTS "Click_workspaceId_fkey";
ALTER TABLE "Click"
  ADD CONSTRAINT "Click_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Commission"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "Commission_workspaceId_idx" ON "Commission"("workspaceId");
ALTER TABLE "Commission"
  DROP CONSTRAINT IF EXISTS "Commission_workspaceId_fkey";
ALTER TABLE "Commission"
  ADD CONSTRAINT "Commission_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payout"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "Payout_workspaceId_idx" ON "Payout"("workspaceId");
ALTER TABLE "Payout"
  DROP CONSTRAINT IF EXISTS "Payout_workspaceId_fkey";
ALTER TABLE "Payout"
  ADD CONSTRAINT "Payout_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AffiliateShareEvent"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "AffiliateShareEvent_workspaceId_idx" ON "AffiliateShareEvent"("workspaceId");
ALTER TABLE "AffiliateShareEvent"
  DROP CONSTRAINT IF EXISTS "AffiliateShareEvent_workspaceId_fkey";
ALTER TABLE "AffiliateShareEvent"
  ADD CONSTRAINT "AffiliateShareEvent_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== PAYMENTS =====

ALTER TABLE "DepositPayment"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "DepositPayment_workspaceId_idx" ON "DepositPayment"("workspaceId");
ALTER TABLE "DepositPayment"
  DROP CONSTRAINT IF EXISTS "DepositPayment_workspaceId_fkey";
ALTER TABLE "DepositPayment"
  ADD CONSTRAINT "DepositPayment_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ServiceFeePayment"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "ServiceFeePayment_workspaceId_idx" ON "ServiceFeePayment"("workspaceId");
ALTER TABLE "ServiceFeePayment"
  DROP CONSTRAINT IF EXISTS "ServiceFeePayment_workspaceId_fkey";
ALTER TABLE "ServiceFeePayment"
  ADD CONSTRAINT "ServiceFeePayment_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentMethod"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "PaymentMethod_workspaceId_idx" ON "PaymentMethod"("workspaceId");
ALTER TABLE "PaymentMethod"
  DROP CONSTRAINT IF EXISTS "PaymentMethod_workspaceId_fkey";
ALTER TABLE "PaymentMethod"
  ADD CONSTRAINT "PaymentMethod_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== TRADE-IN =====

ALTER TABLE "TradeIn"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "TradeIn_workspaceId_idx" ON "TradeIn"("workspaceId");
ALTER TABLE "TradeIn"
  DROP CONSTRAINT IF EXISTS "TradeIn_workspaceId_fkey";
ALTER TABLE "TradeIn"
  ADD CONSTRAINT "TradeIn_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== DOCUMENTS =====

ALTER TABLE "DealDocument"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "DealDocument_workspaceId_idx" ON "DealDocument"("workspaceId");
ALTER TABLE "DealDocument"
  DROP CONSTRAINT IF EXISTS "DealDocument_workspaceId_fkey";
ALTER TABLE "DealDocument"
  ADD CONSTRAINT "DealDocument_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentRequest"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "DocumentRequest_workspaceId_idx" ON "DocumentRequest"("workspaceId");
ALTER TABLE "DocumentRequest"
  DROP CONSTRAINT IF EXISTS "DocumentRequest_workspaceId_fkey";
ALTER TABLE "DocumentRequest"
  ADD CONSTRAINT "DocumentRequest_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== REFINANCE =====

ALTER TABLE "RefinanceLead"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "RefinanceLead_workspaceId_idx" ON "RefinanceLead"("workspaceId");
ALTER TABLE "RefinanceLead"
  DROP CONSTRAINT IF EXISTS "RefinanceLead_workspaceId_fkey";
ALTER TABLE "RefinanceLead"
  ADD CONSTRAINT "RefinanceLead_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== INSURANCE DOCS =====

ALTER TABLE "InsuranceDocRequest"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;
CREATE INDEX IF NOT EXISTS "InsuranceDocRequest_workspaceId_idx" ON "InsuranceDocRequest"("workspaceId");
ALTER TABLE "InsuranceDocRequest"
  DROP CONSTRAINT IF EXISTS "InsuranceDocRequest_workspaceId_fkey";
ALTER TABLE "InsuranceDocRequest"
  ADD CONSTRAINT "InsuranceDocRequest_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== BACKFILL: Set all existing records to LIVE workspace =====

UPDATE "BuyerProfile"       SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "Dealer"              SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "DealerUser"          SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "AdminUser"           SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "Affiliate"           SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "PreQualification"    SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "BuyerPreferences"    SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "InventoryItem"       SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "Shortlist"           SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "Auction"             SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "AuctionParticipant"  SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "AuctionOffer"        SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "BestPriceOption"     SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "SelectedDeal"        SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "FinancingOffer"      SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "ExternalPreApproval" SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "InsuranceQuote"      SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "InsurancePolicy"     SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "ContractDocument"    SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "ContractShieldScan"  SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "ESignEnvelope"       SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "PickupAppointment"   SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "Referral"            SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "Click"               SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "Commission"          SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "Payout"              SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "AffiliateShareEvent" SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "DepositPayment"      SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "ServiceFeePayment"   SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "PaymentMethod"       SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "TradeIn"             SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "DealDocument"        SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "DocumentRequest"     SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "RefinanceLead"       SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;
UPDATE "InsuranceDocRequest" SET "workspaceId" = 'ws_live_default' WHERE "workspaceId" IS NULL;

-- ===== RLS POLICIES: Enforce workspace isolation on all domain tables =====
-- These policies ensure that queries only return rows matching the session workspace_id.
-- The application must set `app.workspace_id` on each database session before queries.

DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'BuyerProfile', 'Dealer', 'DealerUser', 'AdminUser', 'Affiliate',
      'PreQualification', 'BuyerPreferences', 'InventoryItem', 'Shortlist',
      'Auction', 'AuctionParticipant', 'AuctionOffer', 'BestPriceOption',
      'SelectedDeal', 'FinancingOffer', 'ExternalPreApproval',
      'InsuranceQuote', 'InsurancePolicy',
      'ContractDocument', 'ContractShieldScan',
      'ESignEnvelope', 'PickupAppointment',
      'Referral', 'Click', 'Commission', 'Payout', 'AffiliateShareEvent',
      'DepositPayment', 'ServiceFeePayment', 'PaymentMethod',
      'TradeIn', 'DealDocument', 'DocumentRequest',
      'RefinanceLead', 'InsuranceDocRequest'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "workspace_isolation" ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY "workspace_isolation" ON %I FOR ALL USING ("workspaceId" = current_setting(''app.workspace_id'', true))',
      tbl
    );
  END LOOP;
END $$;
