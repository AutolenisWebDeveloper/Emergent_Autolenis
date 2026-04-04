-- Add missing fields to SelectedDeal
ALTER TABLE "SelectedDeal"
ADD COLUMN IF NOT EXISTS "totalOtdAmountCents" INTEGER,
ADD COLUMN IF NOT EXISTS "baseLoanAmountCents" INTEGER,
ADD COLUMN IF NOT EXISTS "apr" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "termMonths" INTEGER;

-- Migrate OTD to cents
UPDATE "SelectedDeal" SET "totalOtdAmountCents" = CAST("cashOtd" * 100 AS INTEGER) WHERE "cashOtd" IS NOT NULL;
