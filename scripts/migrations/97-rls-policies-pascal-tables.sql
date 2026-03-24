-- =============================================================================
-- Migration 97: RLS Policies for PascalCase Prisma-Managed Tables
-- =============================================================================
-- All 92 tables have RLS enabled but ~58 PascalCase tables have NO policies,
-- meaning ALL access is blocked for every role.
-- This migration adds defence-in-depth policies for every affected table.
--
-- Convention:
--   - Service-role (backend) bypasses RLS by default in Supabase.
--   - Authenticated users get scoped read/write based on ownership.
--   - Admin checks use the existing is_admin() / is_super_admin() functions.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper: only run a policy DDL if the policy does not already exist
-- ---------------------------------------------------------------------------
DO $$
BEGIN

  -- =========================================================================
  -- "User" (Prisma model -> "User" table, mirrors snake_case `users`)
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"User"' AND policyname='User_select_own') THEN
    EXECUTE $pol$
      CREATE POLICY "User_select_own" ON "User"
        FOR SELECT TO authenticated
        USING (id = auth.uid());
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"User"' AND policyname='User_update_own') THEN
    EXECUTE $pol$
      CREATE POLICY "User_update_own" ON "User"
        FOR UPDATE TO authenticated
        USING (id = auth.uid());
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"User"' AND policyname='User_admin_all') THEN
    EXECUTE $pol$
      CREATE POLICY "User_admin_all" ON "User"
        FOR ALL TO authenticated
        USING (is_admin() OR is_super_admin());
    $pol$;
  END IF;

  -- =========================================================================
  -- "AdminUser"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"AdminUser"' AND policyname='AdminUser_admin_all') THEN
    EXECUTE $pol$
      CREATE POLICY "AdminUser_admin_all" ON "AdminUser"
        FOR ALL TO authenticated
        USING (is_admin() OR is_super_admin());
    $pol$;
  END IF;

  -- =========================================================================
  -- "AdminAuditLog"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"AdminAuditLog"' AND policyname='AdminAuditLog_admin_read') THEN
    EXECUTE $pol$
      CREATE POLICY "AdminAuditLog_admin_read" ON "AdminAuditLog"
        FOR SELECT TO authenticated
        USING (is_admin() OR is_super_admin());
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"AdminAuditLog"' AND policyname='AdminAuditLog_system_insert') THEN
    EXECUTE $pol$
      CREATE POLICY "AdminAuditLog_system_insert" ON "AdminAuditLog"
        FOR INSERT TO authenticated
        WITH CHECK (true);
    $pol$;
  END IF;

  -- =========================================================================
  -- "Buyer" (Prisma-managed)
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Buyer"' AND policyname='Buyer_select_own') THEN
    EXECUTE $pol$
      CREATE POLICY "Buyer_select_own" ON "Buyer"
        FOR SELECT TO authenticated
        USING (
          "userId" = auth.uid()
          OR is_admin()
          OR is_super_admin()
        );
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Buyer"' AND policyname='Buyer_update_own') THEN
    EXECUTE $pol$
      CREATE POLICY "Buyer_update_own" ON "Buyer"
        FOR UPDATE TO authenticated
        USING ("userId" = auth.uid());
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Buyer"' AND policyname='Buyer_insert_own') THEN
    EXECUTE $pol$
      CREATE POLICY "Buyer_insert_own" ON "Buyer"
        FOR INSERT TO authenticated
        WITH CHECK ("userId" = auth.uid());
    $pol$;
  END IF;

  -- =========================================================================
  -- "Dealer" (Prisma-managed)
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Dealer"' AND policyname='Dealer_admin_all') THEN
    EXECUTE $pol$
      CREATE POLICY "Dealer_admin_all" ON "Dealer"
        FOR ALL TO authenticated
        USING (is_admin() OR is_super_admin());
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Dealer"' AND policyname='Dealer_self_read') THEN
    EXECUTE $pol$
      CREATE POLICY "Dealer_self_read" ON "Dealer"
        FOR SELECT TO authenticated
        USING (
          id IN (
            SELECT "dealerId" FROM "DealerUser"
            WHERE "userId" = auth.uid()
          )
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "DealerUser"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"DealerUser"' AND policyname='DealerUser_select_own') THEN
    EXECUTE $pol$
      CREATE POLICY "DealerUser_select_own" ON "DealerUser"
        FOR SELECT TO authenticated
        USING ("userId" = auth.uid() OR is_admin());
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"DealerUser"' AND policyname='DealerUser_insert_own') THEN
    EXECUTE $pol$
      CREATE POLICY "DealerUser_insert_own" ON "DealerUser"
        FOR INSERT TO authenticated
        WITH CHECK ("userId" = auth.uid());
    $pol$;
  END IF;

  -- =========================================================================
  -- "Vehicle"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Vehicle"' AND policyname='Vehicle_public_read') THEN
    EXECUTE $pol$
      CREATE POLICY "Vehicle_public_read" ON "Vehicle"
        FOR SELECT TO anon, authenticated
        USING (status = 'ACTIVE' OR is_admin());
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Vehicle"' AND policyname='Vehicle_dealer_write') THEN
    EXECUTE $pol$
      CREATE POLICY "Vehicle_dealer_write" ON "Vehicle"
        FOR ALL TO authenticated
        USING (
          "dealerId" IN (
            SELECT "dealerId" FROM "DealerUser"
            WHERE "userId" = auth.uid()
          )
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "Auction" (Prisma-managed)
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Auction"' AND policyname='Auction_buyer_read') THEN
    EXECUTE $pol$
      CREATE POLICY "Auction_buyer_read" ON "Auction"
        FOR SELECT TO authenticated
        USING (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          OR is_admin()
        );
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Auction"' AND policyname='Auction_buyer_write') THEN
    EXECUTE $pol$
      CREATE POLICY "Auction_buyer_write" ON "Auction"
        FOR INSERT TO authenticated
        WITH CHECK (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
        );
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Auction"' AND policyname='Auction_admin_all') THEN
    EXECUTE $pol$
      CREATE POLICY "Auction_admin_all" ON "Auction"
        FOR ALL TO authenticated
        USING (is_admin() OR is_super_admin());
    $pol$;
  END IF;

  -- =========================================================================
  -- "AuctionOffer"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"AuctionOffer"' AND policyname='AuctionOffer_dealer_read') THEN
    EXECUTE $pol$
      CREATE POLICY "AuctionOffer_dealer_read" ON "AuctionOffer"
        FOR SELECT TO authenticated
        USING (
          "dealerId" IN (
            SELECT "dealerId" FROM "DealerUser" WHERE "userId" = auth.uid()
          )
          OR "auctionId" IN (
            SELECT id FROM "Auction"
            WHERE "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          )
          OR is_admin()
        );
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"AuctionOffer"' AND policyname='AuctionOffer_dealer_insert') THEN
    EXECUTE $pol$
      CREATE POLICY "AuctionOffer_dealer_insert" ON "AuctionOffer"
        FOR INSERT TO authenticated
        WITH CHECK (
          "dealerId" IN (
            SELECT "dealerId" FROM "DealerUser" WHERE "userId" = auth.uid()
          )
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "Deal"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Deal"' AND policyname='Deal_parties_read') THEN
    EXECUTE $pol$
      CREATE POLICY "Deal_parties_read" ON "Deal"
        FOR SELECT TO authenticated
        USING (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          OR "dealerId" IN (
            SELECT "dealerId" FROM "DealerUser" WHERE "userId" = auth.uid()
          )
          OR is_admin()
        );
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Deal"' AND policyname='Deal_admin_write') THEN
    EXECUTE $pol$
      CREATE POLICY "Deal_admin_write" ON "Deal"
        FOR ALL TO authenticated
        USING (is_admin() OR is_super_admin());
    $pol$;
  END IF;

  -- =========================================================================
  -- "Payout"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Payout"' AND policyname='Payout_dealer_read') THEN
    EXECUTE $pol$
      CREATE POLICY "Payout_dealer_read" ON "Payout"
        FOR SELECT TO authenticated
        USING (
          "dealerId" IN (
            SELECT "dealerId" FROM "DealerUser" WHERE "userId" = auth.uid()
          )
          OR is_admin()
        );
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Payout"' AND policyname='Payout_admin_write') THEN
    EXECUTE $pol$
      CREATE POLICY "Payout_admin_write" ON "Payout"
        FOR ALL TO authenticated
        USING (is_admin() OR is_super_admin());
    $pol$;
  END IF;

  -- =========================================================================
  -- "Document"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Document"' AND policyname='Document_owner_read') THEN
    EXECUTE $pol$
      CREATE POLICY "Document_owner_read" ON "Document"
        FOR SELECT TO authenticated
        USING (
          "uploadedById" = auth.uid()
          OR is_admin()
        );
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Document"' AND policyname='Document_owner_insert') THEN
    EXECUTE $pol$
      CREATE POLICY "Document_owner_insert" ON "Document"
        FOR INSERT TO authenticated
        WITH CHECK ("uploadedById" = auth.uid());
    $pol$;
  END IF;

  -- =========================================================================
  -- "Notification"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Notification"' AND policyname='Notification_recipient_read') THEN
    EXECUTE $pol$
      CREATE POLICY "Notification_recipient_read" ON "Notification"
        FOR SELECT TO authenticated
        USING ("userId" = auth.uid() OR is_admin());
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Notification"' AND policyname='Notification_recipient_update') THEN
    EXECUTE $pol$
      CREATE POLICY "Notification_recipient_update" ON "Notification"
        FOR UPDATE TO authenticated
        USING ("userId" = auth.uid());
    $pol$;
  END IF;

  -- =========================================================================
  -- "LeadForm"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"LeadForm"' AND policyname='LeadForm_public_insert') THEN
    EXECUTE $pol$
      CREATE POLICY "LeadForm_public_insert" ON "LeadForm"
        FOR INSERT TO anon, authenticated
        WITH CHECK (true);
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"LeadForm"' AND policyname='LeadForm_admin_read') THEN
    EXECUTE $pol$
      CREATE POLICY "LeadForm_admin_read" ON "LeadForm"
        FOR SELECT TO authenticated
        USING (is_admin() OR is_super_admin());
    $pol$;
  END IF;

  -- =========================================================================
  -- "ContactMessage"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"ContactMessage"' AND policyname='ContactMessage_public_insert') THEN
    EXECUTE $pol$
      CREATE POLICY "ContactMessage_public_insert" ON "ContactMessage"
        FOR INSERT TO anon, authenticated
        WITH CHECK (true);
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"ContactMessage"' AND policyname='ContactMessage_admin_read') THEN
    EXECUTE $pol$
      CREATE POLICY "ContactMessage_admin_read" ON "ContactMessage"
        FOR SELECT TO authenticated
        USING (is_admin() OR is_super_admin());
    $pol$;
  END IF;

  -- =========================================================================
  -- "Session" (Prisma-managed)
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Session"' AND policyname='Session_user_own') THEN
    EXECUTE $pol$
      CREATE POLICY "Session_user_own" ON "Session"
        FOR ALL TO authenticated
        USING ("userId" = auth.uid());
    $pol$;
  END IF;

  -- =========================================================================
  -- "VerificationToken"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"VerificationToken"' AND policyname='VerificationToken_admin_all') THEN
    EXECUTE $pol$
      CREATE POLICY "VerificationToken_admin_all" ON "VerificationToken"
        FOR ALL TO authenticated
        USING (is_admin() OR is_super_admin());
    $pol$;
  END IF;

  -- =========================================================================
  -- "MfaFactor"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"MfaFactor"' AND policyname='MfaFactor_user_own') THEN
    EXECUTE $pol$
      CREATE POLICY "MfaFactor_user_own" ON "MfaFactor"
        FOR ALL TO authenticated
        USING ("userId" = auth.uid());
    $pol$;
  END IF;

  -- =========================================================================
  -- "Affiliate"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Affiliate"' AND policyname='Affiliate_user_own') THEN
    EXECUTE $pol$
      CREATE POLICY "Affiliate_user_own" ON "Affiliate"
        FOR SELECT TO authenticated
        USING ("userId" = auth.uid() OR is_admin());
    $pol$;
  END IF;

  -- =========================================================================
  -- "AffiliateReferral"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"AffiliateReferral"' AND policyname='AffiliateReferral_affiliate_read') THEN
    EXECUTE $pol$
      CREATE POLICY "AffiliateReferral_affiliate_read" ON "AffiliateReferral"
        FOR SELECT TO authenticated
        USING (
          "affiliateId" IN (
            SELECT id FROM "Affiliate" WHERE "userId" = auth.uid()
          )
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "TradeIn"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"TradeIn"' AND policyname='TradeIn_buyer_own') THEN
    EXECUTE $pol$
      CREATE POLICY "TradeIn_buyer_own" ON "TradeIn"
        FOR ALL TO authenticated
        USING (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "Inspection"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Inspection"' AND policyname='Inspection_parties_read') THEN
    EXECUTE $pol$
      CREATE POLICY "Inspection_parties_read" ON "Inspection"
        FOR SELECT TO authenticated
        USING (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          OR "dealerId" IN (
            SELECT "dealerId" FROM "DealerUser" WHERE "userId" = auth.uid()
          )
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "ESignDocument" (Prisma-managed, mirrors snake_case esign_documents)
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"ESignDocument"' AND policyname='ESignDocument_buyer_read') THEN
    EXECUTE $pol$
      CREATE POLICY "ESignDocument_buyer_read" ON "ESignDocument"
        FOR SELECT TO authenticated
        USING (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "ComplianceEvent"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"ComplianceEvent"' AND policyname='ComplianceEvent_admin_read') THEN
    EXECUTE $pol$
      CREATE POLICY "ComplianceEvent_admin_read" ON "ComplianceEvent"
        FOR SELECT TO authenticated
        USING (is_admin() OR is_super_admin() OR is_compliance_admin());
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"ComplianceEvent"' AND policyname='ComplianceEvent_system_insert') THEN
    EXECUTE $pol$
      CREATE POLICY "ComplianceEvent_system_insert" ON "ComplianceEvent"
        FOR INSERT TO authenticated
        WITH CHECK (true);
    $pol$;
  END IF;

  -- =========================================================================
  -- "AdminSetting"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"AdminSetting"' AND policyname='AdminSetting_admin_all') THEN
    EXECUTE $pol$
      CREATE POLICY "AdminSetting_admin_all" ON "AdminSetting"
        FOR ALL TO authenticated
        USING (is_admin() OR is_super_admin());
    $pol$;
  END IF;

  -- =========================================================================
  -- "WebhookLog"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"WebhookLog"' AND policyname='WebhookLog_admin_read') THEN
    EXECUTE $pol$
      CREATE POLICY "WebhookLog_admin_read" ON "WebhookLog"
        FOR SELECT TO authenticated
        USING (is_admin() OR is_super_admin());
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"WebhookLog"' AND policyname='WebhookLog_system_insert') THEN
    EXECUTE $pol$
      CREATE POLICY "WebhookLog_system_insert" ON "WebhookLog"
        FOR INSERT TO authenticated
        WITH CHECK (true);
    $pol$;
  END IF;

  -- =========================================================================
  -- "PaymentIntent"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"PaymentIntent"' AND policyname='PaymentIntent_buyer_read') THEN
    EXECUTE $pol$
      CREATE POLICY "PaymentIntent_buyer_read" ON "PaymentIntent"
        FOR SELECT TO authenticated
        USING (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "StripeCustomer"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"StripeCustomer"' AND policyname='StripeCustomer_user_own') THEN
    EXECUTE $pol$
      CREATE POLICY "StripeCustomer_user_own" ON "StripeCustomer"
        FOR SELECT TO authenticated
        USING ("userId" = auth.uid() OR is_admin());
    $pol$;
  END IF;

  -- =========================================================================
  -- "InventorySnapshot"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"InventorySnapshot"' AND policyname='InventorySnapshot_admin_read') THEN
    EXECUTE $pol$
      CREATE POLICY "InventorySnapshot_admin_read" ON "InventorySnapshot"
        FOR SELECT TO authenticated
        USING (is_admin() OR is_super_admin());
    $pol$;
  END IF;

  -- =========================================================================
  -- "PriceHistory"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"PriceHistory"' AND policyname='PriceHistory_public_read') THEN
    EXECUTE $pol$
      CREATE POLICY "PriceHistory_public_read" ON "PriceHistory"
        FOR SELECT TO anon, authenticated
        USING (true);
    $pol$;
  END IF;

  -- =========================================================================
  -- "SavedSearch"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"SavedSearch"' AND policyname='SavedSearch_user_own') THEN
    EXECUTE $pol$
      CREATE POLICY "SavedSearch_user_own" ON "SavedSearch"
        FOR ALL TO authenticated
        USING ("userId" = auth.uid());
    $pol$;
  END IF;

  -- =========================================================================
  -- "UserActivity"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"UserActivity"' AND policyname='UserActivity_user_own') THEN
    EXECUTE $pol$
      CREATE POLICY "UserActivity_user_own" ON "UserActivity"
        FOR SELECT TO authenticated
        USING ("userId" = auth.uid() OR is_admin());
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"UserActivity"' AND policyname='UserActivity_system_insert') THEN
    EXECUTE $pol$
      CREATE POLICY "UserActivity_system_insert" ON "UserActivity"
        FOR INSERT TO authenticated
        WITH CHECK (true);
    $pol$;
  END IF;

  -- =========================================================================
  -- "CreditApplication"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"CreditApplication"' AND policyname='CreditApplication_buyer_own') THEN
    EXECUTE $pol$
      CREATE POLICY "CreditApplication_buyer_own" ON "CreditApplication"
        FOR ALL TO authenticated
        USING (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "LoanOffer"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"LoanOffer"' AND policyname='LoanOffer_buyer_read') THEN
    EXECUTE $pol$
      CREATE POLICY "LoanOffer_buyer_read" ON "LoanOffer"
        FOR SELECT TO authenticated
        USING (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "InsuranceQuote"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"InsuranceQuote"' AND policyname='InsuranceQuote_buyer_own') THEN
    EXECUTE $pol$
      CREATE POLICY "InsuranceQuote_buyer_own" ON "InsuranceQuote"
        FOR ALL TO authenticated
        USING (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "ReviewRating"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"ReviewRating"' AND policyname='ReviewRating_public_read') THEN
    EXECUTE $pol$
      CREATE POLICY "ReviewRating_public_read" ON "ReviewRating"
        FOR SELECT TO anon, authenticated
        USING (true);
    $pol$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"ReviewRating"' AND policyname='ReviewRating_buyer_write') THEN
    EXECUTE $pol$
      CREATE POLICY "ReviewRating_buyer_write" ON "ReviewRating"
        FOR INSERT TO authenticated
        WITH CHECK (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "SupportTicket"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"SupportTicket"' AND policyname='SupportTicket_user_own') THEN
    EXECUTE $pol$
      CREATE POLICY "SupportTicket_user_own" ON "SupportTicket"
        FOR ALL TO authenticated
        USING ("userId" = auth.uid() OR is_admin());
    $pol$;
  END IF;

  -- =========================================================================
  -- "SupportMessage"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"SupportMessage"' AND policyname='SupportMessage_ticket_participant') THEN
    EXECUTE $pol$
      CREATE POLICY "SupportMessage_ticket_participant" ON "SupportMessage"
        FOR SELECT TO authenticated
        USING (
          "ticketId" IN (
            SELECT id FROM "SupportTicket" WHERE "userId" = auth.uid()
          )
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "Appointment"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"Appointment"' AND policyname='Appointment_buyer_own') THEN
    EXECUTE $pol$
      CREATE POLICY "Appointment_buyer_own" ON "Appointment"
        FOR ALL TO authenticated
        USING (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "CommunicationLog"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"CommunicationLog"' AND policyname='CommunicationLog_admin_read') THEN
    EXECUTE $pol$
      CREATE POLICY "CommunicationLog_admin_read" ON "CommunicationLog"
        FOR SELECT TO authenticated
        USING (is_admin() OR is_super_admin());
    $pol$;
  END IF;

  -- =========================================================================
  -- "ExternalPreApproval" (LEGACY READ-ONLY)
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"ExternalPreApproval"' AND policyname='ExternalPreApproval_buyer_read') THEN
    EXECUTE $pol$
      CREATE POLICY "ExternalPreApproval_buyer_read" ON "ExternalPreApproval"
        FOR SELECT TO authenticated
        USING (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "ExternalPreApprovalSubmission" (CANONICAL WRITE TARGET)
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"ExternalPreApprovalSubmission"' AND policyname='EPAS_buyer_own') THEN
    EXECUTE $pol$
      CREATE POLICY "EPAS_buyer_own" ON "ExternalPreApprovalSubmission"
        FOR ALL TO authenticated
        USING (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "DealerInventoryFeed"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"DealerInventoryFeed"' AND policyname='DealerInventoryFeed_dealer_own') THEN
    EXECUTE $pol$
      CREATE POLICY "DealerInventoryFeed_dealer_own" ON "DealerInventoryFeed"
        FOR ALL TO authenticated
        USING (
          "dealerId" IN (
            SELECT "dealerId" FROM "DealerUser" WHERE "userId" = auth.uid()
          )
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "DealerBankingInfo"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"DealerBankingInfo"' AND policyname='DealerBankingInfo_dealer_own') THEN
    EXECUTE $pol$
      CREATE POLICY "DealerBankingInfo_dealer_own" ON "DealerBankingInfo"
        FOR ALL TO authenticated
        USING (
          "dealerId" IN (
            SELECT "dealerId" FROM "DealerUser" WHERE "userId" = auth.uid()
          )
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "DealerDocument"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"DealerDocument"' AND policyname='DealerDocument_dealer_own') THEN
    EXECUTE $pol$
      CREATE POLICY "DealerDocument_dealer_own" ON "DealerDocument"
        FOR ALL TO authenticated
        USING (
          "dealerId" IN (
            SELECT "dealerId" FROM "DealerUser" WHERE "userId" = auth.uid()
          )
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "ConsentArtifact"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"ConsentArtifact"' AND policyname='ConsentArtifact_buyer_own') THEN
    EXECUTE $pol$
      CREATE POLICY "ConsentArtifact_buyer_own" ON "ConsentArtifact"
        FOR ALL TO authenticated
        USING (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "ForwardingAuthorization"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"ForwardingAuthorization"' AND policyname='ForwardingAuthorization_buyer_own') THEN
    EXECUTE $pol$
      CREATE POLICY "ForwardingAuthorization_buyer_own" ON "ForwardingAuthorization"
        FOR ALL TO authenticated
        USING (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "ProviderConsent"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"ProviderConsent"' AND policyname='ProviderConsent_buyer_own') THEN
    EXECUTE $pol$
      CREATE POLICY "ProviderConsent_buyer_own" ON "ProviderConsent"
        FOR ALL TO authenticated
        USING (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          OR is_admin()
        );
    $pol$;
  END IF;

  -- =========================================================================
  -- "PreQualResult"
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='"PreQualResult"' AND policyname='PreQualResult_buyer_own') THEN
    EXECUTE $pol$
      CREATE POLICY "PreQualResult_buyer_own" ON "PreQualResult"
        FOR ALL TO authenticated
        USING (
          "buyerId" IN (SELECT id FROM "Buyer" WHERE "userId" = auth.uid())
          OR is_admin()
        );
    $pol$;
  END IF;

END $$;

COMMIT;
