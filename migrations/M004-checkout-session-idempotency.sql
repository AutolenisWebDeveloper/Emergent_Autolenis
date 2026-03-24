-- ============================================================================
-- M004: Checkout Session Idempotency (Issue #357)
--
-- Adds columns to DepositPayment and ServiceFeePayment to track the
-- active Stripe checkout session and an attempt counter.
-- These enable the CheckoutService to:
--   • Reuse an existing open checkout session instead of creating a new one
--   • Create a fresh session (with a new idempotency key) when the prior
--     session is expired, completed, or otherwise unusable
-- ============================================================================

-- DepositPayment ─────────────────────────────────────────────────────────────

ALTER TABLE "DepositPayment"
  ADD COLUMN IF NOT EXISTS "checkoutSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "checkoutAttempt"   INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN "DepositPayment"."checkoutSessionId"
  IS 'Stripe Checkout Session ID for the most recent checkout attempt';
COMMENT ON COLUMN "DepositPayment"."checkoutAttempt"
  IS 'Monotonically increasing counter; used to derive unique idempotency keys per session creation';

-- ServiceFeePayment ─────────────────────────────────────────────────────────

ALTER TABLE "ServiceFeePayment"
  ADD COLUMN IF NOT EXISTS "checkoutSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "checkoutAttempt"   INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN "ServiceFeePayment"."checkoutSessionId"
  IS 'Stripe Checkout Session ID for the most recent checkout attempt';
COMMENT ON COLUMN "ServiceFeePayment"."checkoutAttempt"
  IS 'Monotonically increasing counter; used to derive unique idempotency keys per session creation';
