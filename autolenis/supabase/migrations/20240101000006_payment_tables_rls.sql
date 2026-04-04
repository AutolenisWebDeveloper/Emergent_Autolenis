-- BLOCKER 9 FIX: Enable RLS on payment and financial tables
--
-- The following tables had no ENABLE ROW LEVEL SECURITY statement and no
-- policies. Any client using the anon key could read or write full payment,
-- transaction, chargeback, and financial audit data.
--
-- Policy approach: deny all access via the anon/authenticated role at the RLS
-- layer. All reads/writes to these tables must go through service_role (server-
-- side API routes) which bypasses RLS. This is the correct pattern for tables
-- that must never be directly exposed to client-side Supabase queries.

ALTER TABLE "DepositPayment"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceFeePayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Chargeback"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialAuditLog" ENABLE ROW LEVEL SECURITY;

-- Deny-all policies: USING (false) means no row passes the predicate for any
-- non-service_role role. service_role bypasses RLS entirely in Supabase.
-- DROP IF EXISTS before each CREATE so this migration is idempotent.

DROP POLICY IF EXISTS "service_role_only" ON "DepositPayment";
CREATE POLICY "service_role_only"
  ON "DepositPayment"
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "service_role_only" ON "ServiceFeePayment";
CREATE POLICY "service_role_only"
  ON "ServiceFeePayment"
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "service_role_only" ON "Transaction";
CREATE POLICY "service_role_only"
  ON "Transaction"
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "service_role_only" ON "Chargeback";
CREATE POLICY "service_role_only"
  ON "Chargeback"
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "service_role_only" ON "FinancialAuditLog";
CREATE POLICY "service_role_only"
  ON "FinancialAuditLog"
  USING (false)
  WITH CHECK (false);
