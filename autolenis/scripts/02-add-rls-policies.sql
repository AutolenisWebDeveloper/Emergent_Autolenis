-- AutoLenis Row Level Security (RLS) Policies
-- This script implements comprehensive RLS policies for all tables
-- Critical for data security and authorization

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BuyerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dealer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Affiliate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Auction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuctionOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SelectedDeal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContractDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancingOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InsuranceQuote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InsurancePolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PickupAppointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Referral" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Commission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TradeIn" ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user ID from JWT
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS uuid AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    (current_setting('request.jwt.claims', true)::json->>'user_id')
  )::uuid;
$$ LANGUAGE SQL STABLE;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS boolean AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role') IN ('ADMIN', 'SUPER_ADMIN'),
    false
  );
$$ LANGUAGE SQL STABLE;

-- User Table Policies
CREATE POLICY "Users can view their own data"
  ON "User" FOR SELECT
  USING (id = auth.user_id() OR auth.is_admin());

CREATE POLICY "Users can update their own data"
  ON "User" FOR UPDATE
  USING (id = auth.user_id())
  WITH CHECK (id = auth.user_id());

CREATE POLICY "Admins have full access to users"
  ON "User" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- BuyerProfile Policies
CREATE POLICY "Buyers can view their own profile"
  ON "BuyerProfile" FOR SELECT
  USING ("userId" = auth.user_id() OR auth.is_admin());

CREATE POLICY "Buyers can update their own profile"
  ON "BuyerProfile" FOR UPDATE
  USING ("userId" = auth.user_id())
  WITH CHECK ("userId" = auth.user_id());

CREATE POLICY "Admins have full access to buyer profiles"
  ON "BuyerProfile" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Dealer Policies
CREATE POLICY "Dealers can view their own dealer data"
  ON "Dealer" FOR SELECT
  USING ("userId" = auth.user_id() OR auth.is_admin());

CREATE POLICY "Dealers can update their own dealer data"
  ON "Dealer" FOR UPDATE
  USING ("userId" = auth.user_id())
  WITH CHECK ("userId" = auth.user_id());

CREATE POLICY "Admins have full access to dealers"
  ON "Dealer" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Affiliate Policies
CREATE POLICY "Affiliates can view their own data"
  ON "Affiliate" FOR SELECT
  USING ("userId" = auth.user_id() OR auth.is_admin());

CREATE POLICY "Affiliates can update their own data"
  ON "Affiliate" FOR UPDATE
  USING ("userId" = auth.user_id())
  WITH CHECK ("userId" = auth.user_id());

CREATE POLICY "Admins have full access to affiliates"
  ON "Affiliate" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Auction Policies
CREATE POLICY "Everyone can view active auctions"
  ON "Auction" FOR SELECT
  USING (status = 'ACTIVE' OR auth.is_admin());

CREATE POLICY "Dealers can view auctions they participated in"
  ON "Auction" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "AuctionOffer" ao
      WHERE ao."auctionId" = "Auction".id
      AND ao."dealer_id" IN (SELECT id FROM "Dealer" WHERE "userId" = auth.user_id())
    )
  );

CREATE POLICY "Admins have full access to auctions"
  ON "Auction" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- AuctionOffer Policies
CREATE POLICY "Dealers can view their own offers"
  ON "AuctionOffer" FOR SELECT
  USING (
    "dealer_id" IN (SELECT id FROM "Dealer" WHERE "userId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Dealers can create offers"
  ON "AuctionOffer" FOR INSERT
  WITH CHECK (
    "dealer_id" IN (SELECT id FROM "Dealer" WHERE "userId" = auth.user_id())
  );

CREATE POLICY "Admins have full access to auction offers"
  ON "AuctionOffer" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- SelectedDeal Policies
CREATE POLICY "Buyers can view their own deals"
  ON "SelectedDeal" FOR SELECT
  USING ("buyerId" = auth.user_id() OR auth.is_admin());

CREATE POLICY "Dealers can view deals for their inventory"
  ON "SelectedDeal" FOR SELECT
  USING (
    "inventoryItemId" IN (
      SELECT id FROM "InventoryItem"
      WHERE "dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = auth.user_id())
    )
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to deals"
  ON "SelectedDeal" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- InventoryItem Policies
CREATE POLICY "Everyone can view active inventory"
  ON "InventoryItem" FOR SELECT
  USING (status = 'AVAILABLE' OR auth.is_admin());

CREATE POLICY "Dealers can manage their own inventory"
  ON "InventoryItem" FOR ALL
  USING (
    "dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = auth.user_id())
    OR auth.is_admin()
  )
  WITH CHECK (
    "dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = auth.user_id())
    OR auth.is_admin()
  );

-- ContractDocument Policies
CREATE POLICY "Buyers can view their contracts"
  ON "ContractDocument" FOR SELECT
  USING (
    "dealId" IN (SELECT id FROM "SelectedDeal" WHERE "buyerId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Dealers can view contracts for their deals"
  ON "ContractDocument" FOR SELECT
  USING (
    "dealId" IN (
      SELECT sd.id FROM "SelectedDeal" sd
      JOIN "InventoryItem" ii ON sd."inventoryItemId" = ii.id
      WHERE ii."dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = auth.user_id())
    )
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to contracts"
  ON "ContractDocument" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- FinancingOffer Policies
CREATE POLICY "Buyers can view their financing offers"
  ON "FinancingOffer" FOR SELECT
  USING (
    "dealId" IN (SELECT id FROM "SelectedDeal" WHERE "buyerId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to financing offers"
  ON "FinancingOffer" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- InsuranceQuote Policies
CREATE POLICY "Buyers can view their insurance quotes"
  ON "InsuranceQuote" FOR SELECT
  USING (
    "dealId" IN (SELECT id FROM "SelectedDeal" WHERE "buyerId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to insurance quotes"
  ON "InsuranceQuote" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- InsurancePolicy Policies
CREATE POLICY "Buyers can view their insurance policies"
  ON "InsurancePolicy" FOR SELECT
  USING (
    "quoteId" IN (
      SELECT iq.id FROM "InsuranceQuote" iq
      JOIN "SelectedDeal" sd ON iq."dealId" = sd.id
      WHERE sd."buyerId" = auth.user_id()
    )
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to insurance policies"
  ON "InsurancePolicy" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- PickupAppointment Policies
CREATE POLICY "Buyers can view their pickup appointments"
  ON "PickupAppointment" FOR SELECT
  USING (
    "dealId" IN (SELECT id FROM "SelectedDeal" WHERE "buyerId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Dealers can view pickup appointments for their deals"
  ON "PickupAppointment" FOR SELECT
  USING (
    "dealId" IN (
      SELECT sd.id FROM "SelectedDeal" sd
      JOIN "InventoryItem" ii ON sd."inventoryItemId" = ii.id
      WHERE ii."dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = auth.user_id())
    )
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to pickup appointments"
  ON "PickupAppointment" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Referral Policies
CREATE POLICY "Affiliates can view their referrals"
  ON "Referral" FOR SELECT
  USING (
    "affiliateId" IN (SELECT id FROM "Affiliate" WHERE "userId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to referrals"
  ON "Referral" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Commission Policies
CREATE POLICY "Affiliates can view their commissions"
  ON "Commission" FOR SELECT
  USING (
    "affiliateId" IN (SELECT id FROM "Affiliate" WHERE "userId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to commissions"
  ON "Commission" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Payout Policies
CREATE POLICY "Affiliates can view their payouts"
  ON "Payout" FOR SELECT
  USING (
    "affiliateId" IN (SELECT id FROM "Affiliate" WHERE "userId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to payouts"
  ON "Payout" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- TradeIn Policies
CREATE POLICY "Buyers can view their trade-ins"
  ON "TradeIn" FOR SELECT
  USING ("userId" = auth.user_id() OR auth.is_admin());

CREATE POLICY "Buyers can create trade-ins"
  ON "TradeIn" FOR INSERT
  WITH CHECK ("userId" = auth.user_id());

CREATE POLICY "Buyers can update their trade-ins"
  ON "TradeIn" FOR UPDATE
  USING ("userId" = auth.user_id())
  WITH CHECK ("userId" = auth.user_id());

CREATE POLICY "Admins have full access to trade-ins"
  ON "TradeIn" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

COMMENT ON SCHEMA public IS 'AutoLenis Platform Database - RLS Policies Enabled';
