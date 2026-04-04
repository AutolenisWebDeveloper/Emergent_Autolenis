-- Migration: Add RLS Policies for Insurance Tables
-- Date: 2026-02-08
-- Purpose: Add row-level security policies for InsuranceQuote and InsurancePolicy tables

-- ==================================================
-- INSURANCE QUOTE POLICIES
-- ==================================================

-- Policy: Buyers can read their own insurance quotes
CREATE POLICY "buyer_read_insurance_quotes" ON "InsuranceQuote"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "SelectedDeal" sd
      JOIN "BuyerProfile" bp ON sd."buyerId" = bp.id
      WHERE sd.id = "InsuranceQuote"."selected_deal_id"
        AND bp."userId" = auth.uid()::text
    )
  );

-- Policy: Buyers can insert their own insurance quotes
CREATE POLICY "buyer_insert_insurance_quotes" ON "InsuranceQuote"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "SelectedDeal" sd
      JOIN "BuyerProfile" bp ON sd."buyerId" = bp.id
      WHERE sd.id = "InsuranceQuote"."selected_deal_id"
        AND bp."userId" = auth.uid()::text
    )
  );

-- Policy: Admins can read all insurance quotes
CREATE POLICY "admin_read_all_insurance_quotes" ON "InsuranceQuote"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      JOIN "AdminUser" a ON u.id = a."userId"
      WHERE u.id = auth.uid()::text
    )
  );

-- ==================================================
-- INSURANCE POLICY POLICIES
-- ==================================================

-- Policy: Buyers can read their own insurance policies
CREATE POLICY "buyer_read_insurance_policies" ON "InsurancePolicy"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "SelectedDeal" sd
      JOIN "BuyerProfile" bp ON sd."buyerId" = bp.id
      WHERE sd.id = "InsurancePolicy"."dealId"
        AND bp."userId" = auth.uid()::text
    )
  );

-- Policy: Buyers can update their own insurance policies
CREATE POLICY "buyer_update_insurance_policies" ON "InsurancePolicy"
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "SelectedDeal" sd
      JOIN "BuyerProfile" bp ON sd."buyerId" = bp.id
      WHERE sd.id = "InsurancePolicy"."dealId"
        AND bp."userId" = auth.uid()::text
    )
  );

-- Policy: Buyers can insert their own insurance policies
CREATE POLICY "buyer_insert_insurance_policies" ON "InsurancePolicy"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "SelectedDeal" sd
      JOIN "BuyerProfile" bp ON sd."buyerId" = bp.id
      WHERE sd.id = "InsurancePolicy"."dealId"
        AND bp."userId" = auth.uid()::text
    )
  );

-- Policy: Dealers can read insurance policies for their deals
CREATE POLICY "dealer_read_insurance_policies" ON "InsurancePolicy"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "SelectedDeal" sd
      JOIN "Dealer" d ON sd."dealerId" = d.id
      WHERE sd.id = "InsurancePolicy"."dealId"
        AND d."userId" = auth.uid()::text
    )
  );

-- Policy: Admins can read all insurance policies
CREATE POLICY "admin_read_all_insurance_policies" ON "InsurancePolicy"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      JOIN "AdminUser" a ON u.id = a."userId"
      WHERE u.id = auth.uid()::text
    )
  );

-- Policy: Admins can update all insurance policies
CREATE POLICY "admin_update_all_insurance_policies" ON "InsurancePolicy"
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      JOIN "AdminUser" a ON u.id = a."userId"
      WHERE u.id = auth.uid()::text
    )
  );

-- ==================================================
-- INSURANCE EVENT POLICIES
-- ==================================================

-- Policy: Users can read their own insurance events
CREATE POLICY "user_read_insurance_events" ON "insurance_events"
  FOR SELECT
  TO authenticated
  USING (
    "user_id" = auth.uid()::text
  );

-- Policy: Admins can read all insurance events
CREATE POLICY "admin_read_all_insurance_events" ON "insurance_events"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      JOIN "AdminUser" a ON u.id = a."userId"
      WHERE u.id = auth.uid()::text
    )
  );

-- Policy: Authenticated users can insert their own insurance events
CREATE POLICY "user_insert_insurance_events" ON "insurance_events"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "user_id" = auth.uid()::text
  );
