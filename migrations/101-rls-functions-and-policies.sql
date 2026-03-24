-- Supabase RLS Helper Functions + Policies
-- These functions allow RLS policies to reference the current user's internal identity.

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Map Supabase auth.uid() to internal User.id
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM "User" WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Map Supabase auth.uid() to internal workspaceId
CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "workspaceId" FROM "User" WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Check whether the current user is an admin (ADMIN or SUPER_ADMIN)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "User"
    WHERE auth_user_id = auth.uid()
      AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$;

-- Check whether a given workspace_id matches the current user's workspace
CREATE OR REPLACE FUNCTION public.in_current_workspace(ws_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ws_id = public.current_workspace_id();
$$;


-- ============================================================
-- ENABLE RLS ON ALL CORE TABLES
-- ============================================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BuyerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dealer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DealerUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Affiliate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;

-- Workspace-scoped tables (enable only if they exist)
DO $$ BEGIN ALTER TABLE "Deal" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PreQualification" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Auction" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "FinancingOffer" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "InsuranceQuote" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ContractShieldScan" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN undefined_table THEN NULL; END $$;


-- ============================================================
-- USER TABLE POLICIES
-- ============================================================

-- Users can read their own row; admins can read all
DROP POLICY IF EXISTS user_select_own ON "User";
CREATE POLICY user_select_own ON "User"
  FOR SELECT USING (
    id = public.current_user_id() OR public.is_admin()
  );

-- Users can update their own row (non-role fields); admins can update any
DROP POLICY IF EXISTS user_update_own ON "User";
CREATE POLICY user_update_own ON "User"
  FOR UPDATE USING (
    id = public.current_user_id() OR public.is_admin()
  ) WITH CHECK (
    id = public.current_user_id() OR public.is_admin()
  );


-- ============================================================
-- BUYER PROFILE POLICIES
-- ============================================================

DROP POLICY IF EXISTS buyer_profile_select ON "BuyerProfile";
CREATE POLICY buyer_profile_select ON "BuyerProfile"
  FOR SELECT USING (
    "userId" = public.current_user_id() OR public.is_admin()
  );

DROP POLICY IF EXISTS buyer_profile_update ON "BuyerProfile";
CREATE POLICY buyer_profile_update ON "BuyerProfile"
  FOR UPDATE USING (
    "userId" = public.current_user_id() OR public.is_admin()
  ) WITH CHECK (
    "userId" = public.current_user_id() OR public.is_admin()
  );


-- ============================================================
-- DEALER POLICIES
-- ============================================================

DROP POLICY IF EXISTS dealer_select ON "Dealer";
CREATE POLICY dealer_select ON "Dealer"
  FOR SELECT USING (
    "userId" = public.current_user_id()
    OR EXISTS (
      SELECT 1 FROM "DealerUser"
      WHERE "DealerUser"."dealerId" = "Dealer".id
        AND "DealerUser"."userId" = public.current_user_id()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS dealer_update ON "Dealer";
CREATE POLICY dealer_update ON "Dealer"
  FOR UPDATE USING (
    "userId" = public.current_user_id() OR public.is_admin()
  ) WITH CHECK (
    "userId" = public.current_user_id() OR public.is_admin()
  );


-- ============================================================
-- DEALER USER POLICIES
-- ============================================================

DROP POLICY IF EXISTS dealer_user_select ON "DealerUser";
CREATE POLICY dealer_user_select ON "DealerUser"
  FOR SELECT USING (
    "userId" = public.current_user_id() OR public.is_admin()
  );

DROP POLICY IF EXISTS dealer_user_insert ON "DealerUser";
CREATE POLICY dealer_user_insert ON "DealerUser"
  FOR INSERT WITH CHECK (
    public.is_admin()
  );

DROP POLICY IF EXISTS dealer_user_update ON "DealerUser";
CREATE POLICY dealer_user_update ON "DealerUser"
  FOR UPDATE USING (
    public.is_admin()
  ) WITH CHECK (
    public.is_admin()
  );


-- ============================================================
-- AFFILIATE POLICIES
-- ============================================================

DROP POLICY IF EXISTS affiliate_select ON "Affiliate";
CREATE POLICY affiliate_select ON "Affiliate"
  FOR SELECT USING (
    "userId" = public.current_user_id() OR public.is_admin()
  );

DROP POLICY IF EXISTS affiliate_update ON "Affiliate";
CREATE POLICY affiliate_update ON "Affiliate"
  FOR UPDATE USING (
    "userId" = public.current_user_id() OR public.is_admin()
  ) WITH CHECK (
    "userId" = public.current_user_id() OR public.is_admin()
  );


-- ============================================================
-- ADMIN USER POLICIES
-- ============================================================

DROP POLICY IF EXISTS admin_user_select ON "AdminUser";
CREATE POLICY admin_user_select ON "AdminUser"
  FOR SELECT USING (
    "userId" = public.current_user_id() OR public.is_admin()
  );


-- ============================================================
-- WORKSPACE-SCOPED TABLE POLICIES (generic pattern)
-- Applied to tables that have a workspaceId column.
-- ============================================================

-- Helper: create workspace-scoped select policy on a table if it exists
CREATE OR REPLACE FUNCTION _create_ws_select_policy(tbl TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'DROP POLICY IF EXISTS ws_select ON %I; CREATE POLICY ws_select ON %I FOR SELECT USING ("workspaceId" = public.current_workspace_id() OR public.is_admin());',
    tbl, tbl
  );
EXCEPTION WHEN undefined_table THEN
  -- Table doesn't exist, skip
  NULL;
END;
$$;

-- Apply workspace-scoped policies to tables that have workspaceId
SELECT _create_ws_select_policy('Deal');
SELECT _create_ws_select_policy('PreQualification');
SELECT _create_ws_select_policy('Auction');
SELECT _create_ws_select_policy('FinancingOffer');
SELECT _create_ws_select_policy('InsuranceQuote');
SELECT _create_ws_select_policy('ContractShieldScan');
SELECT _create_ws_select_policy('Document');
SELECT _create_ws_select_policy('Payment');

-- Cleanup helper
DROP FUNCTION IF EXISTS _create_ws_select_policy(TEXT);


-- ============================================================
-- SERVICE ROLE BYPASS
-- Supabase service_role key bypasses RLS by default.
-- The policies above only restrict anon and authenticated roles.
-- ============================================================
