-- =====================================================
-- AFFILIATE SYSTEM HARDENING - Professional Grade
-- =====================================================

-- 1. Add missing columns to Affiliate table for professional setup
ALTER TABLE "Affiliate" ADD COLUMN IF NOT EXISTS "landing_slug" TEXT;
ALTER TABLE "Affiliate" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'US';
ALTER TABLE "Affiliate" ADD COLUMN IF NOT EXISTS "payout_method" TEXT DEFAULT 'BANK_TRANSFER';
ALTER TABLE "Affiliate" ADD COLUMN IF NOT EXISTS "payout_email" TEXT;
ALTER TABLE "Affiliate" ADD COLUMN IF NOT EXISTS "tax_status" TEXT DEFAULT 'PENDING';
ALTER TABLE "Affiliate" ADD COLUMN IF NOT EXISTS "w9_on_file" BOOLEAN DEFAULT false;
ALTER TABLE "Affiliate" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';
ALTER TABLE "Affiliate" ADD COLUMN IF NOT EXISTS "available_balance_cents" INTEGER DEFAULT 0;
ALTER TABLE "Affiliate" ADD COLUMN IF NOT EXISTS "lifetime_earnings_cents" INTEGER DEFAULT 0;
ALTER TABLE "Affiliate" ADD COLUMN IF NOT EXISTS "lifetime_paid_cents" INTEGER DEFAULT 0;

-- Create unique index on landing_slug
CREATE UNIQUE INDEX IF NOT EXISTS "Affiliate_landing_slug_idx" ON "Affiliate"("landing_slug") WHERE "landing_slug" IS NOT NULL;

-- 2. Add cookie tracking and attribution window to Click
ALTER TABLE "Click" ADD COLUMN IF NOT EXISTS "cookie_id" TEXT;
ALTER TABLE "Click" ADD COLUMN IF NOT EXISTS "attributed_user_id" TEXT;
ALTER TABLE "Click" ADD COLUMN IF NOT EXISTS "attributed_at" TIMESTAMP;
ALTER TABLE "Click" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP;

-- 3. Enhance Referral for better chain tracking
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "is_self_referral" BOOLEAN DEFAULT false;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "attribution_source" TEXT DEFAULT 'LINK';
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "cookie_id" TEXT;

-- Add unique constraint to prevent duplicate referrals
CREATE UNIQUE INDEX IF NOT EXISTS "Referral_unique_user_level" 
  ON "Referral"("referredUserId", "level") 
  WHERE "referredUserId" IS NOT NULL;

-- 4. Enhance Commission for better tracking
ALTER TABLE "Commission" ADD COLUMN IF NOT EXISTS "is_locked" BOOLEAN DEFAULT false;
ALTER TABLE "Commission" ADD COLUMN IF NOT EXISTS "locked_at" TIMESTAMP;
ALTER TABLE "Commission" ADD COLUMN IF NOT EXISTS "earned_at" TIMESTAMP;
ALTER TABLE "Commission" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP;
ALTER TABLE "Commission" ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT;

-- Create unique constraint for idempotent commission creation
CREATE UNIQUE INDEX IF NOT EXISTS "Commission_idempotent_idx" 
  ON "Commission"("service_fee_payment_id", "affiliateId", "level")
  WHERE "service_fee_payment_id" IS NOT NULL;

-- 5. Create affiliate_events table for audit trail
CREATE TABLE IF NOT EXISTS "affiliate_events" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "affiliate_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "details" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "affiliate_events_affiliate_idx" ON "affiliate_events"("affiliate_id");
CREATE INDEX IF NOT EXISTS "affiliate_events_type_idx" ON "affiliate_events"("event_type");

-- 6. Create notification_events table for email deduplication
CREATE TABLE IF NOT EXISTS "notification_events" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "affiliate_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "reference_id" TEXT NOT NULL,
  "sent_at" TIMESTAMP DEFAULT NOW(),
  "email_to" TEXT,
  "status" TEXT DEFAULT 'SENT',
  "error_message" TEXT,
  UNIQUE("affiliate_id", "event_type", "reference_id")
);

-- 7. Create commission_reconciliation_logs table
CREATE TABLE IF NOT EXISTS "commission_reconciliation_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "run_at" TIMESTAMP DEFAULT NOW(),
  "service_fee_payments_checked" INTEGER DEFAULT 0,
  "missing_commissions_found" INTEGER DEFAULT 0,
  "commissions_created" INTEGER DEFAULT 0,
  "discrepancies" JSONB,
  "status" TEXT DEFAULT 'COMPLETED',
  "error_message" TEXT
);

-- 8. Update existing commissions status enum values
UPDATE "Commission" SET "status" = 'PENDING' WHERE "status" IS NULL OR "status" = '';

-- 9. Generate landing_slug for existing affiliates
UPDATE "Affiliate" 
SET "landing_slug" = LOWER(
  REPLACE(
    REPLACE(
      COALESCE("firstName", '') || '-' || COALESCE("lastName", '') || '-' || SUBSTRING("id" FROM 1 FOR 6),
      ' ', '-'
    ),
    '--', '-'
  )
)
WHERE "landing_slug" IS NULL AND ("firstName" IS NOT NULL OR "lastName" IS NOT NULL);

-- 10. Ensure ref_code is populated for all affiliates
UPDATE "Affiliate" 
SET "ref_code" = UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 8))
WHERE "ref_code" IS NULL;
