-- ==========================================================================
-- AutoLenis RLS Policy Rollback
-- ==========================================================================
--
-- Reverses all policies created by scripts/add-missing-rls-policies.sql.
-- Each DROP POLICY IF EXISTS is safe to run even if the policy was never
-- created. This script does NOT disable RLS on any table — it only removes
-- the policies, returning the table to a deny-all posture for non-service-role
-- connections.
--
-- To fully disable RLS on a table, run:
--   ALTER TABLE "TableName" DISABLE ROW LEVEL SECURITY;
-- This is intentionally NOT done here to avoid accidentally opening tables
-- to unrestricted access.
--
-- Usage:
--   psql -f scripts/rollback-rls-policies.sql
--   -- or run in Supabase SQL editor
-- ==========================================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. User
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own data"    ON "User";
DROP POLICY IF EXISTS "Users can update their own data"  ON "User";
DROP POLICY IF EXISTS "Admins have full access to users" ON "User";

-- ──────────────────────────────────────────────────────────────────────────
-- 2. BuyerProfile
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Buyers can view their own profile"        ON "BuyerProfile";
DROP POLICY IF EXISTS "Buyers can update their own profile"      ON "BuyerProfile";
DROP POLICY IF EXISTS "Admins have full access to buyer profiles" ON "BuyerProfile";

-- ──────────────────────────────────────────────────────────────────────────
-- 3. Dealer
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Dealers can view their own dealer data"   ON "Dealer";
DROP POLICY IF EXISTS "Dealers can update their own dealer data" ON "Dealer";
DROP POLICY IF EXISTS "Admins have full access to dealers"       ON "Dealer";

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Affiliate
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Affiliates can view their own data"   ON "Affiliate";
DROP POLICY IF EXISTS "Affiliates can update their own data" ON "Affiliate";
DROP POLICY IF EXISTS "Admins have full access to affiliates" ON "Affiliate";

-- ──────────────────────────────────────────────────────────────────────────
-- 5. Auction
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Everyone can view active auctions"              ON "Auction";
DROP POLICY IF EXISTS "Dealers can view auctions they participated in" ON "Auction";
DROP POLICY IF EXISTS "Admins have full access to auctions"            ON "Auction";

-- ──────────────────────────────────────────────────────────────────────────
-- 6. AuctionOffer
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Dealers can view their own offers"        ON "AuctionOffer";
DROP POLICY IF EXISTS "Dealers can create offers"                ON "AuctionOffer";
DROP POLICY IF EXISTS "Admins have full access to auction offers" ON "AuctionOffer";

-- ──────────────────────────────────────────────────────────────────────────
-- 7. SelectedDeal
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Buyers can view their own deals"            ON "SelectedDeal";
DROP POLICY IF EXISTS "Dealers can view deals for their inventory" ON "SelectedDeal";
DROP POLICY IF EXISTS "Admins have full access to deals"           ON "SelectedDeal";

-- ──────────────────────────────────────────────────────────────────────────
-- 8. InventoryItem
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Everyone can view active inventory"     ON "InventoryItem";
DROP POLICY IF EXISTS "Dealers can manage their own inventory" ON "InventoryItem";

-- ──────────────────────────────────────────────────────────────────────────
-- 9. ContractDocument
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Buyers can view their contracts"            ON "ContractDocument";
DROP POLICY IF EXISTS "Dealers can view contracts for their deals" ON "ContractDocument";
DROP POLICY IF EXISTS "Admins have full access to contracts"       ON "ContractDocument";

-- ──────────────────────────────────────────────────────────────────────────
-- 10. FinancingOffer
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Buyers can view their financing offers"      ON "FinancingOffer";
DROP POLICY IF EXISTS "Admins have full access to financing offers" ON "FinancingOffer";

-- ──────────────────────────────────────────────────────────────────────────
-- 11. InsuranceQuote
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Buyers can view their insurance quotes"      ON "InsuranceQuote";
DROP POLICY IF EXISTS "Admins have full access to insurance quotes" ON "InsuranceQuote";

-- ──────────────────────────────────────────────────────────────────────────
-- 12. InsurancePolicy
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Buyers can view their insurance policies"      ON "InsurancePolicy";
DROP POLICY IF EXISTS "Admins have full access to insurance policies" ON "InsurancePolicy";

-- ──────────────────────────────────────────────────────────────────────────
-- 13. PickupAppointment
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Buyers can view their pickup appointments"            ON "PickupAppointment";
DROP POLICY IF EXISTS "Dealers can view pickup appointments for their deals" ON "PickupAppointment";
DROP POLICY IF EXISTS "Admins have full access to pickup appointments"       ON "PickupAppointment";

-- ──────────────────────────────────────────────────────────────────────────
-- 14. Referral
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Affiliates can view their referrals"  ON "Referral";
DROP POLICY IF EXISTS "Admins have full access to referrals" ON "Referral";

-- ──────────────────────────────────────────────────────────────────────────
-- 15. Commission
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Affiliates can view their commissions"  ON "Commission";
DROP POLICY IF EXISTS "Admins have full access to commissions" ON "Commission";

-- ──────────────────────────────────────────────────────────────────────────
-- 16. Payout
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Affiliates can view their payouts"  ON "Payout";
DROP POLICY IF EXISTS "Admins have full access to payouts" ON "Payout";

-- ──────────────────────────────────────────────────────────────────────────
-- 17. TradeIn
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Buyers can view their trade-ins"      ON "TradeIn";
DROP POLICY IF EXISTS "Buyers can create trade-ins"          ON "TradeIn";
DROP POLICY IF EXISTS "Buyers can update their trade-ins"    ON "TradeIn";
DROP POLICY IF EXISTS "Admins have full access to trade-ins" ON "TradeIn";

-- ──────────────────────────────────────────────────────────────────────────
-- 18. DealerUser
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "DealerUser_own_select"    ON "DealerUser";
DROP POLICY IF EXISTS "DealerUser_dealer_select" ON "DealerUser";
DROP POLICY IF EXISTS "DealerUser_admin_all"     ON "DealerUser";

-- ──────────────────────────────────────────────────────────────────────────
-- 19. PreQualification
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "PreQualification_buyer_select" ON "PreQualification";
DROP POLICY IF EXISTS "PreQualification_admin_all"    ON "PreQualification";

-- ──────────────────────────────────────────────────────────────────────────
-- 20. ContractShieldScan
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ContractShieldScan_service_only" ON "ContractShieldScan";
DROP POLICY IF EXISTS "ContractShieldScan_admin_select" ON "ContractShieldScan";

-- ──────────────────────────────────────────────────────────────────────────
-- 21. ESignEnvelope
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ESignEnvelope_buyer_select"  ON "ESignEnvelope";
DROP POLICY IF EXISTS "ESignEnvelope_dealer_select" ON "ESignEnvelope";
DROP POLICY IF EXISTS "ESignEnvelope_admin_all"     ON "ESignEnvelope";

-- ──────────────────────────────────────────────────────────────────────────
-- 22. Workspace
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Workspace_member_select" ON "Workspace";
DROP POLICY IF EXISTS "Workspace_admin_all"     ON "Workspace";

-- ──────────────────────────────────────────────────────────────────────────
-- 23. BuyerPreferences
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "BuyerPreferences_buyer_select" ON "BuyerPreferences";
DROP POLICY IF EXISTS "BuyerPreferences_buyer_update" ON "BuyerPreferences";
DROP POLICY IF EXISTS "BuyerPreferences_admin_all"    ON "BuyerPreferences";

-- ──────────────────────────────────────────────────────────────────────────
-- 24. Vehicle
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Vehicle_authenticated_select" ON "Vehicle";
DROP POLICY IF EXISTS "Vehicle_admin_all"            ON "Vehicle";

-- ──────────────────────────────────────────────────────────────────────────
-- 25. Shortlist
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Shortlist_buyer_select" ON "Shortlist";
DROP POLICY IF EXISTS "Shortlist_buyer_insert" ON "Shortlist";
DROP POLICY IF EXISTS "Shortlist_buyer_update" ON "Shortlist";
DROP POLICY IF EXISTS "Shortlist_buyer_delete" ON "Shortlist";
DROP POLICY IF EXISTS "Shortlist_admin_all"    ON "Shortlist";

-- ──────────────────────────────────────────────────────────────────────────
-- 26. ShortlistItem
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ShortlistItem_buyer_select" ON "ShortlistItem";
DROP POLICY IF EXISTS "ShortlistItem_buyer_insert" ON "ShortlistItem";
DROP POLICY IF EXISTS "ShortlistItem_buyer_delete" ON "ShortlistItem";
DROP POLICY IF EXISTS "ShortlistItem_admin_all"    ON "ShortlistItem";

-- ──────────────────────────────────────────────────────────────────────────
-- 27. ExternalPreApproval
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ExternalPreApproval_buyer_select" ON "ExternalPreApproval";
DROP POLICY IF EXISTS "ExternalPreApproval_admin_all"    ON "ExternalPreApproval";

-- ──────────────────────────────────────────────────────────────────────────
-- 28. Click
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Click_affiliate_select" ON "Click";
DROP POLICY IF EXISTS "Click_admin_all"        ON "Click";

-- ──────────────────────────────────────────────────────────────────────────
-- 29. PaymentMethod
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "PaymentMethod_owner_select" ON "PaymentMethod";
DROP POLICY IF EXISTS "PaymentMethod_owner_insert" ON "PaymentMethod";
DROP POLICY IF EXISTS "PaymentMethod_owner_update" ON "PaymentMethod";
DROP POLICY IF EXISTS "PaymentMethod_owner_delete" ON "PaymentMethod";
DROP POLICY IF EXISTS "PaymentMethod_admin_all"    ON "PaymentMethod";

-- ──────────────────────────────────────────────────────────────────────────
-- 30. InsuranceUpload
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "InsuranceUpload_buyer_select" ON "InsuranceUpload";
DROP POLICY IF EXISTS "InsuranceUpload_admin_all"    ON "InsuranceUpload";

-- ──────────────────────────────────────────────────────────────────────────
-- 31. DealerApplication
-- ──────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "DealerApplication_applicant_select" ON "DealerApplication";
DROP POLICY IF EXISTS "DealerApplication_dealer_select"    ON "DealerApplication";
DROP POLICY IF EXISTS "DealerApplication_admin_all"        ON "DealerApplication";

COMMIT;
