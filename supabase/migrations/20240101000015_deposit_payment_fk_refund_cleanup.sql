-- FIX 15: DepositPayment explicit FK to Auction + Refund schema cleanup

-- Add explicit FK from DepositPayment to Auction (was only an indexed string before)
-- Note: This requires all existing auctionId values to reference valid Auction rows.
-- Run verification first in staging before applying to production.
ALTER TABLE "DepositPayment"
  ADD CONSTRAINT "fk_deposit_payment_auction"
  FOREIGN KEY ("auctionId")
  REFERENCES "Auction"("id")
  ON DELETE RESTRICT;

-- Add stripeRefundId unique column to Refund (FIX 3 / FIX 15)
ALTER TABLE "Refund"
  ADD COLUMN IF NOT EXISTS "stripeRefundId" TEXT UNIQUE;

-- Add typed FK columns to Refund
ALTER TABLE "Refund"
  ADD COLUMN IF NOT EXISTS "depositPaymentId" TEXT REFERENCES "DepositPayment"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "serviceFeePaymentId" TEXT REFERENCES "ServiceFeePayment"("id") ON DELETE SET NULL;

-- Add checkoutSessionId index to ServiceFeePayment (FIX 15)
CREATE INDEX IF NOT EXISTS "idx_service_fee_payment_checkout_session_id"
  ON "ServiceFeePayment" ("checkoutSessionId");
