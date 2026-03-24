-- Convert ServiceFeePayment to cents with proper fields
ALTER TABLE "ServiceFeePayment" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "ServiceFeePayment" ADD COLUMN IF NOT EXISTS "base_fee_cents" INTEGER;
ALTER TABLE "ServiceFeePayment" ADD COLUMN IF NOT EXISTS "deposit_applied_cents" INTEGER;
ALTER TABLE "ServiceFeePayment" ADD COLUMN IF NOT EXISTS "remaining_cents" INTEGER;
ALTER TABLE "ServiceFeePayment" ADD COLUMN IF NOT EXISTS "method" TEXT;
ALTER TABLE "ServiceFeePayment" ADD COLUMN IF NOT EXISTS "provider" TEXT DEFAULT 'stripe';
ALTER TABLE "ServiceFeePayment" ADD COLUMN IF NOT EXISTS "provider_payment_id" TEXT;
ALTER TABLE "ServiceFeePayment" ADD COLUMN IF NOT EXISTS "refunded_timestamp" TIMESTAMP(3);

UPDATE "ServiceFeePayment" SET "base_fee_cents" = ROUND("amount" * 100)::INTEGER WHERE "amount" IS NOT NULL;
UPDATE "ServiceFeePayment" SET "provider_payment_id" = "stripePaymentIntentId" WHERE "provider_payment_id" IS NULL;
UPDATE "ServiceFeePayment" SET "refunded_timestamp" = "refundedAt" WHERE "refundedAt" IS NOT NULL;
