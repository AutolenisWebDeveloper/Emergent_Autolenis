-- ==========================================================================
-- AutoLenis RLS Policy Migration — Production-Safe, Merge-Ready
-- ==========================================================================
--
-- Purpose: Comprehensive RLS coverage for all 31 user/business-data tables.
--          Fixes type-safety issues, schema-qualifies all helper functions,
--          uses lookup-backed dealer access (no JWT dealer_id dependency),
--          and ensures idempotent (rerunnable) execution.
--
-- Rollback: scripts/rollback-rls-policies.sql
--
-- Tables covered (31):
--   Tier 1 — Core user-facing (17): User, BuyerProfile, Dealer, Affiliate,
--     Auction, AuctionOffer, SelectedDeal, InventoryItem, ContractDocument,
--     FinancingOffer, InsuranceQuote, InsurancePolicy, PickupAppointment,
--     Referral, Commission, Payout, TradeIn
--   Tier 2 — Previously missing (14): DealerUser, PreQualification,
--     ContractShieldScan, ESignEnvelope, Workspace, BuyerPreferences,
--     Vehicle, Shortlist, ShortlistItem, ExternalPreApproval, Click,
--     PaymentMethod, InsuranceUpload, DealerApplication
--
-- Helper functions referenced (all schema-qualified, all pre-existing):
--   public.current_user_id()    → TEXT  (maps auth.uid() → User.id CUID)
--   public.is_admin()           → BOOL  (checks User.role via auth.uid())
--   public.current_dealer_ids() → SETOF TEXT (Dealer + DealerUser lookup)
--   public.current_affiliate_ids() → SETOF TEXT (Affiliate lookup)
--   public.current_user_id_uuid()  → UUID (safe UUID cast)
--   public.current_user_id_text()  → TEXT (JWT sub/user_id as text)
--
-- Key design decisions:
--   1. All user ID comparisons use public.current_user_id() which returns
--      the CUID User.id, NOT auth.uid() which returns a UUID.
--   2. Buyer-owned tables with buyerId referencing BuyerProfile.id use a
--      subquery: buyerId IN (SELECT id FROM "BuyerProfile" WHERE "userId" = ...)
--   3. Dealer access uses public.current_dealer_ids() which queries both
--      Dealer.userId and DealerUser.userId — no JWT dealer_id claim.
--   4. Affiliate access uses public.current_affiliate_ids() which queries
--      Affiliate.userId — no JWT affiliate_id claim.
--   5. Every policy uses DROP IF EXISTS before CREATE for idempotency.
-- ==========================================================================

BEGIN;

-- ==========================================================================
-- SECTION 1: Enable RLS on all 31 tables (idempotent)
-- ==========================================================================

-- Tier 1: Core user-facing tables
ALTER TABLE "User"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BuyerProfile"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dealer"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Affiliate"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Auction"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuctionOffer"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SelectedDeal"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryItem"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContractDocument"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancingOffer"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InsuranceQuote"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InsurancePolicy"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PickupAppointment"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Referral"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Commission"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payout"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TradeIn"            ENABLE ROW LEVEL SECURITY;

-- Tier 2: Previously missing tables
ALTER TABLE "DealerUser"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PreQualification"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContractShieldScan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ESignEnvelope"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BuyerPreferences"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vehicle"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shortlist"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShortlistItem"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExternalPreApproval" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Click"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentMethod"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InsuranceUpload"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DealerApplication"  ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- SECTION 2: Policies for Tier 1 tables (corrected, schema-qualified)
-- ==========================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 1. User
--    Access: Own row via id = public.current_user_id(), admin ALL
--    Code refs: lib/services/buyer.service.ts, lib/auth-server.ts
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view their own data"   ON "User";
DROP POLICY IF EXISTS "Users can update their own data" ON "User";
DROP POLICY IF EXISTS "Admins have full access to users" ON "User";

CREATE POLICY "Users can view their own data"
  ON "User" FOR SELECT TO authenticated
  USING (id = public.current_user_id() OR public.is_admin());

CREATE POLICY "Users can update their own data"
  ON "User" FOR UPDATE TO authenticated
  USING (id = public.current_user_id())
  WITH CHECK (id = public.current_user_id());

CREATE POLICY "Admins have full access to users"
  ON "User" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 2. BuyerProfile
--    Access: Own row via userId = public.current_user_id(), admin ALL
--    Code refs: lib/services/buyer.service.ts, app/api/buyer/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Buyers can view their own profile"   ON "BuyerProfile";
DROP POLICY IF EXISTS "Buyers can update their own profile" ON "BuyerProfile";
DROP POLICY IF EXISTS "Admins have full access to buyer profiles" ON "BuyerProfile";

CREATE POLICY "Buyers can view their own profile"
  ON "BuyerProfile" FOR SELECT TO authenticated
  USING ("userId" = public.current_user_id() OR public.is_admin());

CREATE POLICY "Buyers can update their own profile"
  ON "BuyerProfile" FOR UPDATE TO authenticated
  USING ("userId" = public.current_user_id())
  WITH CHECK ("userId" = public.current_user_id());

CREATE POLICY "Admins have full access to buyer profiles"
  ON "BuyerProfile" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Dealer
--    Access: Own row via userId = public.current_user_id(), admin ALL
--    Code refs: app/api/dealer/, lib/services/dealer.service.ts
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Dealers can view their own dealer data"   ON "Dealer";
DROP POLICY IF EXISTS "Dealers can update their own dealer data" ON "Dealer";
DROP POLICY IF EXISTS "Admins have full access to dealers"       ON "Dealer";

CREATE POLICY "Dealers can view their own dealer data"
  ON "Dealer" FOR SELECT TO authenticated
  USING ("userId" = public.current_user_id() OR public.is_admin());

CREATE POLICY "Dealers can update their own dealer data"
  ON "Dealer" FOR UPDATE TO authenticated
  USING ("userId" = public.current_user_id())
  WITH CHECK ("userId" = public.current_user_id());

CREATE POLICY "Admins have full access to dealers"
  ON "Dealer" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Affiliate
--    Access: Own row via userId = public.current_user_id(), admin ALL
--    Code refs: app/api/affiliate/, lib/services/affiliate.service.ts
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Affiliates can view their own data"   ON "Affiliate";
DROP POLICY IF EXISTS "Affiliates can update their own data" ON "Affiliate";
DROP POLICY IF EXISTS "Admins have full access to affiliates" ON "Affiliate";

CREATE POLICY "Affiliates can view their own data"
  ON "Affiliate" FOR SELECT TO authenticated
  USING ("userId" = public.current_user_id() OR public.is_admin());

CREATE POLICY "Affiliates can update their own data"
  ON "Affiliate" FOR UPDATE TO authenticated
  USING ("userId" = public.current_user_id())
  WITH CHECK ("userId" = public.current_user_id());

CREATE POLICY "Admins have full access to affiliates"
  ON "Affiliate" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 5. Auction
--    Access: Public SELECT for active auctions, dealer SELECT for
--    participated auctions (via AuctionParticipant), admin ALL
--    Code refs: app/api/buyer/auctions/, app/api/dealer/auctions/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Everyone can view active auctions"          ON "Auction";
DROP POLICY IF EXISTS "Dealers can view auctions they participated in" ON "Auction";
DROP POLICY IF EXISTS "Admins have full access to auctions"        ON "Auction";

CREATE POLICY "Everyone can view active auctions"
  ON "Auction" FOR SELECT TO authenticated
  USING (status = 'ACTIVE' OR public.is_admin());

CREATE POLICY "Dealers can view auctions they participated in"
  ON "Auction" FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "AuctionParticipant" ap
      WHERE ap."auctionId" = "Auction".id
      AND ap."dealerId"::text IN (SELECT public.current_dealer_ids())
    )
  );

CREATE POLICY "Admins have full access to auctions"
  ON "Auction" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 6. AuctionOffer
--    Access: Dealer SELECT/INSERT via participantId → AuctionParticipant
--    → Dealer lookup, admin ALL
--    Code refs: app/api/dealer/auctions/[auctionId]/offers/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Dealers can view their own offers"        ON "AuctionOffer";
DROP POLICY IF EXISTS "Dealers can create offers"                ON "AuctionOffer";
DROP POLICY IF EXISTS "Admins have full access to auction offers" ON "AuctionOffer";

CREATE POLICY "Dealers can view their own offers"
  ON "AuctionOffer" FOR SELECT TO authenticated
  USING (
    "participantId" IN (
      SELECT ap.id FROM "AuctionParticipant" ap
      WHERE ap."dealerId"::text IN (SELECT public.current_dealer_ids())
    )
    OR public.is_admin()
  );

CREATE POLICY "Dealers can create offers"
  ON "AuctionOffer" FOR INSERT TO authenticated
  WITH CHECK (
    "participantId" IN (
      SELECT ap.id FROM "AuctionParticipant" ap
      WHERE ap."dealerId"::text IN (SELECT public.current_dealer_ids())
    )
  );

CREATE POLICY "Admins have full access to auction offers"
  ON "AuctionOffer" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 7. SelectedDeal
--    Access: Buyer SELECT via buyerId → BuyerProfile (NOT User.id),
--    dealer SELECT via inventoryItemId → InventoryItem → Dealer, admin ALL
--    Code refs: lib/services/deal/, app/api/buyer/deals/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Buyers can view their own deals"          ON "SelectedDeal";
DROP POLICY IF EXISTS "Dealers can view deals for their inventory" ON "SelectedDeal";
DROP POLICY IF EXISTS "Admins have full access to deals"         ON "SelectedDeal";

CREATE POLICY "Buyers can view their own deals"
  ON "SelectedDeal" FOR SELECT TO authenticated
  USING (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
    OR public.is_admin()
  );

CREATE POLICY "Dealers can view deals for their inventory"
  ON "SelectedDeal" FOR SELECT TO authenticated
  USING (
    "inventoryItemId" IN (
      SELECT ii.id FROM "InventoryItem" ii
      WHERE ii."dealerId"::text IN (SELECT public.current_dealer_ids())
    )
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to deals"
  ON "SelectedDeal" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 8. InventoryItem
--    Access: Public SELECT for available items, dealer ALL for own
--    inventory via public.current_dealer_ids(), admin ALL
--    Code refs: app/api/dealer/inventory/, lib/services/inventory.service.ts
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Everyone can view active inventory"     ON "InventoryItem";
DROP POLICY IF EXISTS "Dealers can manage their own inventory" ON "InventoryItem";

CREATE POLICY "Everyone can view active inventory"
  ON "InventoryItem" FOR SELECT TO authenticated
  USING (status = 'AVAILABLE' OR public.is_admin());

CREATE POLICY "Dealers can manage their own inventory"
  ON "InventoryItem" FOR ALL TO authenticated
  USING (
    "dealerId"::text IN (SELECT public.current_dealer_ids())
    OR public.is_admin()
  )
  WITH CHECK (
    "dealerId"::text IN (SELECT public.current_dealer_ids())
    OR public.is_admin()
  );

-- ──────────────────────────────────────────────────────────────────────────
-- 9. ContractDocument
--    Access: Buyer SELECT via dealId → SelectedDeal → BuyerProfile,
--    dealer SELECT via dealerId, admin ALL
--    Code refs: app/api/buyer/deals/[dealId]/contracts/,
--               app/api/dealer/deals/[dealId]/contracts/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Buyers can view their contracts"            ON "ContractDocument";
DROP POLICY IF EXISTS "Dealers can view contracts for their deals" ON "ContractDocument";
DROP POLICY IF EXISTS "Admins have full access to contracts"       ON "ContractDocument";

CREATE POLICY "Buyers can view their contracts"
  ON "ContractDocument" FOR SELECT TO authenticated
  USING (
    "dealId" IN (
      SELECT sd.id FROM "SelectedDeal" sd
      WHERE sd."buyerId" IN (
        SELECT bp.id FROM "BuyerProfile" bp
        WHERE bp."userId" = public.current_user_id()
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "Dealers can view contracts for their deals"
  ON "ContractDocument" FOR SELECT TO authenticated
  USING (
    "dealerId"::text IN (SELECT public.current_dealer_ids())
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to contracts"
  ON "ContractDocument" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 10. FinancingOffer
--     Access: Buyer SELECT via dealId → SelectedDeal → BuyerProfile,
--     admin ALL
--     Code refs: app/api/buyer/deals/[dealId]/financing/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Buyers can view their financing offers"      ON "FinancingOffer";
DROP POLICY IF EXISTS "Admins have full access to financing offers" ON "FinancingOffer";

CREATE POLICY "Buyers can view their financing offers"
  ON "FinancingOffer" FOR SELECT TO authenticated
  USING (
    "dealId" IN (
      SELECT sd.id FROM "SelectedDeal" sd
      WHERE sd."buyerId" IN (
        SELECT bp.id FROM "BuyerProfile" bp
        WHERE bp."userId" = public.current_user_id()
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to financing offers"
  ON "FinancingOffer" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 11. InsuranceQuote
--     Access: Buyer SELECT via buyerId → BuyerProfile (NOT User.id),
--     admin ALL
--     Code refs: app/api/buyer/insurance/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Buyers can view their insurance quotes"      ON "InsuranceQuote";
DROP POLICY IF EXISTS "Admins have full access to insurance quotes" ON "InsuranceQuote";

CREATE POLICY "Buyers can view their insurance quotes"
  ON "InsuranceQuote" FOR SELECT TO authenticated
  USING (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to insurance quotes"
  ON "InsuranceQuote" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 12. InsurancePolicy
--     Access: Buyer SELECT via dealId → SelectedDeal → BuyerProfile,
--     admin ALL
--     Code refs: app/api/buyer/insurance/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Buyers can view their insurance policies"      ON "InsurancePolicy";
DROP POLICY IF EXISTS "Admins have full access to insurance policies" ON "InsurancePolicy";

CREATE POLICY "Buyers can view their insurance policies"
  ON "InsurancePolicy" FOR SELECT TO authenticated
  USING (
    "dealId" IN (
      SELECT sd.id FROM "SelectedDeal" sd
      WHERE sd."buyerId" IN (
        SELECT bp.id FROM "BuyerProfile" bp
        WHERE bp."userId" = public.current_user_id()
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to insurance policies"
  ON "InsurancePolicy" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 13. PickupAppointment
--     Access: Buyer SELECT via dealId → SelectedDeal → BuyerProfile,
--     dealer SELECT via dealId → SelectedDeal → InventoryItem → Dealer,
--     admin ALL
--     Code refs: app/api/buyer/deals/[dealId]/pickup/,
--                app/api/dealer/deals/[dealId]/pickup/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Buyers can view their pickup appointments"              ON "PickupAppointment";
DROP POLICY IF EXISTS "Dealers can view pickup appointments for their deals"   ON "PickupAppointment";
DROP POLICY IF EXISTS "Admins have full access to pickup appointments"         ON "PickupAppointment";

CREATE POLICY "Buyers can view their pickup appointments"
  ON "PickupAppointment" FOR SELECT TO authenticated
  USING (
    "dealId" IN (
      SELECT sd.id FROM "SelectedDeal" sd
      WHERE sd."buyerId" IN (
        SELECT bp.id FROM "BuyerProfile" bp
        WHERE bp."userId" = public.current_user_id()
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "Dealers can view pickup appointments for their deals"
  ON "PickupAppointment" FOR SELECT TO authenticated
  USING (
    "dealId" IN (
      SELECT sd.id FROM "SelectedDeal" sd
      JOIN "InventoryItem" ii ON sd."inventoryItemId" = ii.id
      WHERE ii."dealerId"::text IN (SELECT public.current_dealer_ids())
    )
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to pickup appointments"
  ON "PickupAppointment" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 14. Referral
--     Access: Affiliate SELECT via affiliateId → Affiliate lookup,
--     admin ALL
--     Code refs: app/api/affiliate/referrals/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Affiliates can view their referrals"  ON "Referral";
DROP POLICY IF EXISTS "Admins have full access to referrals" ON "Referral";

CREATE POLICY "Affiliates can view their referrals"
  ON "Referral" FOR SELECT TO authenticated
  USING (
    "affiliateId"::text IN (SELECT public.current_affiliate_ids())
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to referrals"
  ON "Referral" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 15. Commission
--     Access: Affiliate SELECT via affiliateId → Affiliate lookup,
--     admin ALL
--     Code refs: app/api/affiliate/commissions/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Affiliates can view their commissions"  ON "Commission";
DROP POLICY IF EXISTS "Admins have full access to commissions" ON "Commission";

CREATE POLICY "Affiliates can view their commissions"
  ON "Commission" FOR SELECT TO authenticated
  USING (
    "affiliateId"::text IN (SELECT public.current_affiliate_ids())
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to commissions"
  ON "Commission" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 16. Payout
--     Access: Affiliate SELECT via affiliateId → Affiliate lookup,
--     admin ALL
--     Code refs: app/api/affiliate/payouts/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Affiliates can view their payouts"  ON "Payout";
DROP POLICY IF EXISTS "Admins have full access to payouts" ON "Payout";

CREATE POLICY "Affiliates can view their payouts"
  ON "Payout" FOR SELECT TO authenticated
  USING (
    "affiliateId"::text IN (SELECT public.current_affiliate_ids())
    OR public.is_admin()
  );

CREATE POLICY "Admins have full access to payouts"
  ON "Payout" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 17. TradeIn
--     Access: Buyer SELECT/INSERT/UPDATE via buyerId → BuyerProfile
--     (buyerId references BuyerProfile.id, NOT User.id), admin ALL
--     Code refs: app/api/buyer/deals/[dealId]/trade-in/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Buyers can view their trade-ins"   ON "TradeIn";
DROP POLICY IF EXISTS "Buyers can create trade-ins"       ON "TradeIn";
DROP POLICY IF EXISTS "Buyers can update their trade-ins" ON "TradeIn";
DROP POLICY IF EXISTS "Admins have full access to trade-ins" ON "TradeIn";

CREATE POLICY "Buyers can view their trade-ins"
  ON "TradeIn" FOR SELECT TO authenticated
  USING (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
    OR public.is_admin()
  );

CREATE POLICY "Buyers can create trade-ins"
  ON "TradeIn" FOR INSERT TO authenticated
  WITH CHECK (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
  );

CREATE POLICY "Buyers can update their trade-ins"
  ON "TradeIn" FOR UPDATE TO authenticated
  USING (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
  )
  WITH CHECK (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
  );

CREATE POLICY "Admins have full access to trade-ins"
  ON "TradeIn" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ==========================================================================
-- SECTION 3: Policies for Tier 2 tables (previously missing)
-- ==========================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- 18. DealerUser
--     Access: Own row (userId = current_user_id), dealer owner can see
--     staff (dealerId in current_dealer_ids), admin ALL
--     Code refs: app/api/dealer/team/, lib/services/dealer.service.ts
--     Note: RLS was enabled but no policies existed — all access was denied.
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "DealerUser_own_select" ON "DealerUser";
DROP POLICY IF EXISTS "DealerUser_dealer_select" ON "DealerUser";
DROP POLICY IF EXISTS "DealerUser_admin_all" ON "DealerUser";

CREATE POLICY "DealerUser_own_select"
  ON "DealerUser" FOR SELECT TO authenticated
  USING ("userId" = public.current_user_id());

CREATE POLICY "DealerUser_dealer_select"
  ON "DealerUser" FOR SELECT TO authenticated
  USING (
    "dealerId"::text IN (SELECT public.current_dealer_ids())
    OR public.is_admin()
  );

CREATE POLICY "DealerUser_admin_all"
  ON "DealerUser" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 19. PreQualification
--     Access: Buyer SELECT via buyerId → BuyerProfile, admin ALL
--     Code refs: app/api/buyer/prequal/, lib/services/prequal/
--     Note: RLS was enabled but no policies existed — all access was denied.
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "PreQualification_buyer_select" ON "PreQualification";
DROP POLICY IF EXISTS "PreQualification_admin_all"    ON "PreQualification";

CREATE POLICY "PreQualification_buyer_select"
  ON "PreQualification" FOR SELECT TO authenticated
  USING (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
    OR public.is_admin()
  );

CREATE POLICY "PreQualification_admin_all"
  ON "PreQualification" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 20. ContractShieldScan
--     Access: Service-role only (deny all authenticated). Contract Shield
--     scans are managed exclusively via Prisma (service_role bypass).
--     Dealers and buyers access scan results through API routes, not
--     direct Supabase client queries.
--     Code refs: lib/services/contract-shield/, app/api/admin/contract-shield/
--     Note: RLS was enabled but no policies existed — all access was denied.
--     This formalizes the deny-all posture with an explicit policy.
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "ContractShieldScan_service_only" ON "ContractShieldScan";
DROP POLICY IF EXISTS "ContractShieldScan_admin_select" ON "ContractShieldScan";

CREATE POLICY "ContractShieldScan_service_only"
  ON "ContractShieldScan" FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "ContractShieldScan_admin_select"
  ON "ContractShieldScan" FOR SELECT TO authenticated
  USING (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 21. ESignEnvelope
--     Access: Buyer SELECT via dealId → SelectedDeal → BuyerProfile,
--     dealer SELECT via dealId → SelectedDeal → InventoryItem → Dealer,
--     admin ALL
--     Code refs: app/api/buyer/deals/[dealId]/esign/,
--                lib/services/esign.service.ts
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "ESignEnvelope_buyer_select"  ON "ESignEnvelope";
DROP POLICY IF EXISTS "ESignEnvelope_dealer_select" ON "ESignEnvelope";
DROP POLICY IF EXISTS "ESignEnvelope_admin_all"     ON "ESignEnvelope";

CREATE POLICY "ESignEnvelope_buyer_select"
  ON "ESignEnvelope" FOR SELECT TO authenticated
  USING (
    "dealId" IN (
      SELECT sd.id FROM "SelectedDeal" sd
      WHERE sd."buyerId" IN (
        SELECT bp.id FROM "BuyerProfile" bp
        WHERE bp."userId" = public.current_user_id()
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "ESignEnvelope_dealer_select"
  ON "ESignEnvelope" FOR SELECT TO authenticated
  USING (
    "dealId" IN (
      SELECT sd.id FROM "SelectedDeal" sd
      JOIN "InventoryItem" ii ON sd."inventoryItemId" = ii.id
      WHERE ii."dealerId"::text IN (SELECT public.current_dealer_ids())
    )
    OR public.is_admin()
  );

CREATE POLICY "ESignEnvelope_admin_all"
  ON "ESignEnvelope" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 22. Workspace
--     Access: Admin-only. Workspace config is managed through admin UI.
--     Users implicitly belong to a workspace but do not query it directly.
--     Code refs: app/api/admin/workspace/, lib/auth-server.ts
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Workspace_admin_all"    ON "Workspace";
DROP POLICY IF EXISTS "Workspace_member_select" ON "Workspace";

CREATE POLICY "Workspace_member_select"
  ON "Workspace" FOR SELECT TO authenticated
  USING (
    id = public.current_workspace_id()
    OR public.is_admin()
  );

CREATE POLICY "Workspace_admin_all"
  ON "Workspace" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 23. BuyerPreferences
--     Access: Buyer SELECT/UPDATE via buyerId → BuyerProfile, admin ALL
--     Code refs: app/api/buyer/preferences/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "BuyerPreferences_buyer_select" ON "BuyerPreferences";
DROP POLICY IF EXISTS "BuyerPreferences_buyer_update" ON "BuyerPreferences";
DROP POLICY IF EXISTS "BuyerPreferences_admin_all"    ON "BuyerPreferences";

CREATE POLICY "BuyerPreferences_buyer_select"
  ON "BuyerPreferences" FOR SELECT TO authenticated
  USING (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
    OR public.is_admin()
  );

CREATE POLICY "BuyerPreferences_buyer_update"
  ON "BuyerPreferences" FOR UPDATE TO authenticated
  USING (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
  )
  WITH CHECK (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
  );

CREATE POLICY "BuyerPreferences_admin_all"
  ON "BuyerPreferences" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 24. Vehicle
--     Access: Public reference data. All authenticated users can SELECT.
--     Writes are service-role only (inventory import pipelines).
--     Code refs: lib/services/inventory.service.ts (vehicle creation)
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Vehicle_authenticated_select" ON "Vehicle";
DROP POLICY IF EXISTS "Vehicle_admin_all"            ON "Vehicle";

CREATE POLICY "Vehicle_authenticated_select"
  ON "Vehicle" FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Vehicle_admin_all"
  ON "Vehicle" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 25. Shortlist
--     Access: Buyer SELECT/INSERT/UPDATE/DELETE via buyerId → BuyerProfile,
--     admin ALL
--     Code refs: app/api/buyer/shortlist/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Shortlist_buyer_select" ON "Shortlist";
DROP POLICY IF EXISTS "Shortlist_buyer_insert" ON "Shortlist";
DROP POLICY IF EXISTS "Shortlist_buyer_update" ON "Shortlist";
DROP POLICY IF EXISTS "Shortlist_buyer_delete" ON "Shortlist";
DROP POLICY IF EXISTS "Shortlist_admin_all"    ON "Shortlist";

CREATE POLICY "Shortlist_buyer_select"
  ON "Shortlist" FOR SELECT TO authenticated
  USING (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
    OR public.is_admin()
  );

CREATE POLICY "Shortlist_buyer_insert"
  ON "Shortlist" FOR INSERT TO authenticated
  WITH CHECK (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
  );

CREATE POLICY "Shortlist_buyer_update"
  ON "Shortlist" FOR UPDATE TO authenticated
  USING (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
  )
  WITH CHECK (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
  );

CREATE POLICY "Shortlist_buyer_delete"
  ON "Shortlist" FOR DELETE TO authenticated
  USING (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
  );

CREATE POLICY "Shortlist_admin_all"
  ON "Shortlist" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 26. ShortlistItem
--     Access: Buyer SELECT/INSERT/DELETE via shortlistId → Shortlist
--     → BuyerProfile, admin ALL
--     Code refs: app/api/buyer/shortlist/[shortlistId]/items/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "ShortlistItem_buyer_select" ON "ShortlistItem";
DROP POLICY IF EXISTS "ShortlistItem_buyer_insert" ON "ShortlistItem";
DROP POLICY IF EXISTS "ShortlistItem_buyer_delete" ON "ShortlistItem";
DROP POLICY IF EXISTS "ShortlistItem_admin_all"    ON "ShortlistItem";

CREATE POLICY "ShortlistItem_buyer_select"
  ON "ShortlistItem" FOR SELECT TO authenticated
  USING (
    "shortlistId" IN (
      SELECT s.id FROM "Shortlist" s
      WHERE s."buyerId" IN (
        SELECT bp.id FROM "BuyerProfile" bp
        WHERE bp."userId" = public.current_user_id()
      )
    )
    OR public.is_admin()
  );

CREATE POLICY "ShortlistItem_buyer_insert"
  ON "ShortlistItem" FOR INSERT TO authenticated
  WITH CHECK (
    "shortlistId" IN (
      SELECT s.id FROM "Shortlist" s
      WHERE s."buyerId" IN (
        SELECT bp.id FROM "BuyerProfile" bp
        WHERE bp."userId" = public.current_user_id()
      )
    )
  );

CREATE POLICY "ShortlistItem_buyer_delete"
  ON "ShortlistItem" FOR DELETE TO authenticated
  USING (
    "shortlistId" IN (
      SELECT s.id FROM "Shortlist" s
      WHERE s."buyerId" IN (
        SELECT bp.id FROM "BuyerProfile" bp
        WHERE bp."userId" = public.current_user_id()
      )
    )
  );

CREATE POLICY "ShortlistItem_admin_all"
  ON "ShortlistItem" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 27. ExternalPreApproval
--     Access: Buyer SELECT via buyerId → BuyerProfile, admin ALL
--     Code refs: app/api/buyer/prequal/external/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "ExternalPreApproval_buyer_select" ON "ExternalPreApproval";
DROP POLICY IF EXISTS "ExternalPreApproval_admin_all"    ON "ExternalPreApproval";

CREATE POLICY "ExternalPreApproval_buyer_select"
  ON "ExternalPreApproval" FOR SELECT TO authenticated
  USING (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
    OR public.is_admin()
  );

CREATE POLICY "ExternalPreApproval_admin_all"
  ON "ExternalPreApproval" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 28. Click
--     Access: Service-role only for writes (tracking pipeline).
--     Affiliate SELECT for own clicks via affiliateId, admin ALL.
--     Code refs: app/api/affiliate/clicks/,
--                lib/services/affiliate.service.ts
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Click_affiliate_select" ON "Click";
DROP POLICY IF EXISTS "Click_admin_all"        ON "Click";

CREATE POLICY "Click_affiliate_select"
  ON "Click" FOR SELECT TO authenticated
  USING (
    "affiliateId"::text IN (SELECT public.current_affiliate_ids())
    OR public.is_admin()
  );

CREATE POLICY "Click_admin_all"
  ON "Click" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 29. PaymentMethod
--     Access: Own row via userId = public.current_user_id(), admin ALL
--     Code refs: app/api/buyer/payment-methods/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "PaymentMethod_owner_select" ON "PaymentMethod";
DROP POLICY IF EXISTS "PaymentMethod_owner_insert" ON "PaymentMethod";
DROP POLICY IF EXISTS "PaymentMethod_owner_update" ON "PaymentMethod";
DROP POLICY IF EXISTS "PaymentMethod_owner_delete" ON "PaymentMethod";
DROP POLICY IF EXISTS "PaymentMethod_admin_all"    ON "PaymentMethod";

CREATE POLICY "PaymentMethod_owner_select"
  ON "PaymentMethod" FOR SELECT TO authenticated
  USING ("userId" = public.current_user_id() OR public.is_admin());

CREATE POLICY "PaymentMethod_owner_insert"
  ON "PaymentMethod" FOR INSERT TO authenticated
  WITH CHECK ("userId" = public.current_user_id());

CREATE POLICY "PaymentMethod_owner_update"
  ON "PaymentMethod" FOR UPDATE TO authenticated
  USING ("userId" = public.current_user_id())
  WITH CHECK ("userId" = public.current_user_id());

CREATE POLICY "PaymentMethod_owner_delete"
  ON "PaymentMethod" FOR DELETE TO authenticated
  USING ("userId" = public.current_user_id());

CREATE POLICY "PaymentMethod_admin_all"
  ON "PaymentMethod" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 30. InsuranceUpload
--     Access: Buyer SELECT via buyerId → BuyerProfile, admin ALL.
--     Writes are service-role only (file upload API route).
--     Code refs: app/api/buyer/insurance/upload/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "InsuranceUpload_buyer_select" ON "InsuranceUpload";
DROP POLICY IF EXISTS "InsuranceUpload_admin_all"    ON "InsuranceUpload";

CREATE POLICY "InsuranceUpload_buyer_select"
  ON "InsuranceUpload" FOR SELECT TO authenticated
  USING (
    "buyerId" IN (
      SELECT bp.id FROM "BuyerProfile" bp
      WHERE bp."userId" = public.current_user_id()
    )
    OR public.is_admin()
  );

CREATE POLICY "InsuranceUpload_admin_all"
  ON "InsuranceUpload" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- 31. DealerApplication
--     Access: Applicant SELECT via applicantUserId = current_user_id()
--     OR dealer owner SELECT via dealerId, admin ALL
--     Code refs: app/api/dealer/application/,
--                app/api/admin/dealers/applications/
-- ──────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "DealerApplication_applicant_select" ON "DealerApplication";
DROP POLICY IF EXISTS "DealerApplication_dealer_select"    ON "DealerApplication";
DROP POLICY IF EXISTS "DealerApplication_admin_all"        ON "DealerApplication";

CREATE POLICY "DealerApplication_applicant_select"
  ON "DealerApplication" FOR SELECT TO authenticated
  USING (
    "applicantUserId" = public.current_user_id()
  );

CREATE POLICY "DealerApplication_dealer_select"
  ON "DealerApplication" FOR SELECT TO authenticated
  USING (
    "dealerId"::text IN (SELECT public.current_dealer_ids())
    OR public.is_admin()
  );

CREATE POLICY "DealerApplication_admin_all"
  ON "DealerApplication" FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMIT;
