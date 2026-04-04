/**
 * RLS Policies Migration
 * Adds comprehensive Row Level Security policies to all tables
 *
 * Run this with: bun run scripts/migrations/02-add-rls-policies.ts
 * Or execute 02-add-rls-policies.sql through Supabase Dashboard SQL Editor
 */

import { createClient } from "@supabase/supabase-js"
import { logger } from "@/lib/logger"

const supabaseUrl = process.env['SUPABASE_URL']!
const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error("Missing required environment variables", {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
  })
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: "public",
  },
})

const rlsPoliciesSQL = `
-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BuyerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dealer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Affiliate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Auction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuctionOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SelectedDeal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Offer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;
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

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own data" ON "User";
DROP POLICY IF EXISTS "Users can update their own data" ON "User";
DROP POLICY IF EXISTS "Admins have full access to users" ON "User";
DROP POLICY IF EXISTS "Buyers can view their own profile" ON "BuyerProfile";
DROP POLICY IF EXISTS "Buyers can update their own profile" ON "BuyerProfile";
DROP POLICY IF EXISTS "Admins have full access to buyer profiles" ON "BuyerProfile";
DROP POLICY IF EXISTS "Dealers can view their own dealer data" ON "Dealer";
DROP POLICY IF EXISTS "Dealers can update their own dealer data" ON "Dealer";
DROP POLICY IF EXISTS "Admins have full access to dealers" ON "Dealer";
DROP POLICY IF EXISTS "Affiliates can view their own data" ON "Affiliate";
DROP POLICY IF EXISTS "Affiliates can update their own data" ON "Affiliate";
DROP POLICY IF EXISTS "Admins have full access to affiliates" ON "Affiliate";

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
`

async function runMigration() {
  try {
    logger.info("Starting RLS policies migration...")

    const { error } = await supabase.rpc("exec_sql", {
      sql: rlsPoliciesSQL,
    })

    if (error) {
      logger.error("Migration failed", { error })
      process.exit(1)
    }

    logger.info("RLS policies migration completed successfully!")
    logger.info("Next steps:")
    logger.info("1. Verify policies in Supabase Dashboard > Database > Policies")
    logger.info("2. Test authentication flows to ensure proper access control")
    logger.info("3. Monitor logs for any RLS-related errors")
  } catch (error) {
    logger.error("Migration error", { error })
    process.exit(1)
  }
}

runMigration()
