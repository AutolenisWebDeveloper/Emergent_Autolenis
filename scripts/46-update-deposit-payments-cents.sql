-- Convert DepositPayment to cents
ALTER TABLE "DepositPayment" ADD COLUMN IF NOT EXISTS "amount_cents" INTEGER;
ALTER TABLE "DepositPayment" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "DepositPayment" ADD COLUMN IF NOT EXISTS "provider" TEXT DEFAULT 'stripe';
ALTER TABLE "DepositPayment" ADD COLUMN IF NOT EXISTS "provider_payment_id" TEXT;
ALTER TABLE "DepositPayment" ADD COLUMN IF NOT EXISTS "reason" TEXT DEFAULT 'auction_deposit';
ALTER TABLE "DepositPayment" ADD COLUMN IF NOT EXISTS "refunded_timestamp" TIMESTAMP(3);

UPDATE "DepositPayment" SET "amount_cents" = ROUND("amount" * 100)::INTEGER WHERE "amount" IS NOT NULL;
UPDATE "DepositPayment" SET "user_id" = "buyerId" WHERE "user_id" IS NULL;
UPDATE "DepositPayment" SET "provider_payment_id" = "stripePaymentIntentId" WHERE "provider_payment_id" IS NULL;
UPDATE "DepositPayment" SET "refunded_timestamp" = "refundedAt" WHERE "refundedAt" IS NOT NULL;
