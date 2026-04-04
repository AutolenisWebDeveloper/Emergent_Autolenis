-- BLOCKER 3 + 8 + 10 FIX: Correct RLS predicate mismatches
--
-- Root cause: auth.user_id() returns a UUID (from the Supabase JWT `sub`
-- claim) but User.id is a CUID string. Direct comparisons like
--   id = auth.user_id()::text
-- never match because a UUID != a CUID.
--
-- The correct function is public.current_user_id() which does:
--   SELECT id FROM "User" WHERE auth_user_id = auth.uid()::text
-- and returns the internal CUID.
--
-- Additionally, SelectedDeal.buyerId and InsuranceQuote.buyerId store a
-- BuyerProfile.id (not User.id), so their policies must go through a
-- BuyerProfile subquery.
--
-- Affected policies (all dropped and recreated here):
--   User                — SELECT, UPDATE
--   BuyerProfile        — SELECT, UPDATE
--   Dealer              — SELECT, UPDATE
--   Affiliate           — SELECT, UPDATE
--   SelectedDeal        — SELECT (buyer branch)
--   InsuranceQuote      — SELECT (buyer branch)
--   TradeIn             — SELECT, INSERT, UPDATE (buyer branch)

-- ─────────────────────────────────────────────────────────────────────────────
-- User
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view their own data"   ON "User";
DROP POLICY IF EXISTS "Users can update their own data" ON "User";

CREATE POLICY "Users can view their own data"
  ON "User" FOR SELECT
  USING (id = public.current_user_id() OR public.is_admin());

CREATE POLICY "Users can update their own data"
  ON "User" FOR UPDATE
  USING (id = public.current_user_id())
  WITH CHECK (id = public.current_user_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- BuyerProfile
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Buyers can view their own profile"   ON "BuyerProfile";
DROP POLICY IF EXISTS "Buyers can update their own profile" ON "BuyerProfile";

CREATE POLICY "Buyers can view their own profile"
  ON "BuyerProfile" FOR SELECT
  USING ("userId" = public.current_user_id() OR public.is_admin());

CREATE POLICY "Buyers can update their own profile"
  ON "BuyerProfile" FOR UPDATE
  USING ("userId" = public.current_user_id())
  WITH CHECK ("userId" = public.current_user_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- Dealer
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Dealers can view their own dealer data"   ON "Dealer";
DROP POLICY IF EXISTS "Dealers can update their own dealer data" ON "Dealer";

CREATE POLICY "Dealers can view their own dealer data"
  ON "Dealer" FOR SELECT
  USING ("userId" = public.current_user_id() OR public.is_admin());

CREATE POLICY "Dealers can update their own dealer data"
  ON "Dealer" FOR UPDATE
  USING ("userId" = public.current_user_id())
  WITH CHECK ("userId" = public.current_user_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- Affiliate
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Affiliates can view their own data"   ON "Affiliate";
DROP POLICY IF EXISTS "Affiliates can update their own data" ON "Affiliate";

CREATE POLICY "Affiliates can view their own data"
  ON "Affiliate" FOR SELECT
  USING ("userId" = public.current_user_id() OR public.is_admin());

CREATE POLICY "Affiliates can update their own data"
  ON "Affiliate" FOR UPDATE
  USING ("userId" = public.current_user_id())
  WITH CHECK ("userId" = public.current_user_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- SelectedDeal — BLOCKER 8
-- buyerId stores BuyerProfile.id, not User.id — must use subquery.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Buyers can view their own deals" ON "SelectedDeal";

CREATE POLICY "Buyers can view their own deals"
  ON "SelectedDeal" FOR SELECT
  USING (
    "buyerId" IN (
      SELECT id FROM "BuyerProfile"
      WHERE "userId" = public.current_user_id()
    )
    OR public.is_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- InsuranceQuote — BLOCKER 3
-- buyerId stores BuyerProfile.id, not User.id — must use subquery.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Buyers can view their insurance quotes" ON "InsuranceQuote";

CREATE POLICY "Buyers can view their insurance quotes"
  ON "InsuranceQuote" FOR SELECT
  USING (
    "buyerId" IN (
      SELECT id FROM "BuyerProfile"
      WHERE "userId" = public.current_user_id()
    )
    OR public.is_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- TradeIn — also uses buyerId = BuyerProfile.id
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "Buyers can view their trade-ins"   ON "TradeIn";
  DROP POLICY IF EXISTS "Buyers can create trade-ins"       ON "TradeIn";
  DROP POLICY IF EXISTS "Buyers can update their trade-ins" ON "TradeIn";

  CREATE POLICY "Buyers can view their trade-ins"
    ON "TradeIn" FOR SELECT
    USING (
      "buyerId" IN (
        SELECT id FROM "BuyerProfile"
        WHERE "userId" = public.current_user_id()
      )
      OR public.is_admin()
    );

  CREATE POLICY "Buyers can create trade-ins"
    ON "TradeIn" FOR INSERT
    WITH CHECK (
      "buyerId" IN (
        SELECT id FROM "BuyerProfile"
        WHERE "userId" = public.current_user_id()
      )
    );

  CREATE POLICY "Buyers can update their trade-ins"
    ON "TradeIn" FOR UPDATE
    USING (
      "buyerId" IN (
        SELECT id FROM "BuyerProfile"
        WHERE "userId" = public.current_user_id()
      )
    )
    WITH CHECK (
      "buyerId" IN (
        SELECT id FROM "BuyerProfile"
        WHERE "userId" = public.current_user_id()
      )
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
