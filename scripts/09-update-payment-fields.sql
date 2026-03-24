-- Update DepositPayment to include reason field
ALTER TABLE "DepositPayment"
ADD COLUMN IF NOT EXISTS "reason" TEXT DEFAULT 'auction_deposit',
ADD COLUMN IF NOT EXISTS "provider" TEXT DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS "providerPaymentId" TEXT;

-- Update deposit amount to cents
ALTER TABLE "DepositPayment"
ADD COLUMN IF NOT EXISTS "amountCents" INTEGER;

UPDATE "DepositPayment" SET "amountCents" = CAST("amount" * 100 AS INTEGER) WHERE "amount" IS NOT NULL;

-- Update ServiceFeePayment fields
ALTER TABLE "ServiceFeePayment"
ADD COLUMN IF NOT EXISTS "baseFeeCents" INTEGER,
ADD COLUMN IF NOT EXISTS "depositAppliedCents" INTEGER,
ADD COLUMN IF NOT EXISTS "remainingCents" INTEGER,
ADD COLUMN IF NOT EXISTS "method" TEXT,
ADD COLUMN IF NOT EXISTS "provider" TEXT DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS "providerPaymentId" TEXT;

UPDATE "ServiceFeePayment" SET "baseFeeCents" = CAST("amount" * 100 AS INTEGER) WHERE "amount" IS NOT NULL;
