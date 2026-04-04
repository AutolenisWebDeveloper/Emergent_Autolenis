-- Convert Payout to cents
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "total_amount_cents" INTEGER;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "provider_ref" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "paid_timestamp" TIMESTAMP(3);

UPDATE "Payout" SET "total_amount_cents" = ROUND("amount" * 100)::INTEGER WHERE "amount" IS NOT NULL;
UPDATE "Payout" SET "provider_ref" = "paymentId" WHERE "provider_ref" IS NULL;
UPDATE "Payout" SET "paid_timestamp" = "paidAt" WHERE "paidAt" IS NOT NULL;
