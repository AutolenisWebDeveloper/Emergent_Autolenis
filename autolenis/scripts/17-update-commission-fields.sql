-- Add fields to Commission
ALTER TABLE "Commission"
ADD COLUMN IF NOT EXISTS "serviceFeePaymentId" TEXT,
ADD COLUMN IF NOT EXISTS "amountCents" INTEGER;

UPDATE "Commission" SET "amountCents" = CAST("commissionAmount" * 100 AS INTEGER) WHERE "commissionAmount" IS NOT NULL;

-- Add fields to Payout
ALTER TABLE "Payout"
ADD COLUMN IF NOT EXISTS "totalAmountCents" INTEGER,
ADD COLUMN IF NOT EXISTS "provider" TEXT,
ADD COLUMN IF NOT EXISTS "providerRef" TEXT;

UPDATE "Payout" SET "totalAmountCents" = CAST("amount" * 100 AS INTEGER) WHERE "amount" IS NOT NULL;
