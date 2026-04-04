-- Update Auction table status enum and add fields
-- Note: The AuctionStatus enum already has the correct values

-- Add missing field to Shortlist
ALTER TABLE "Shortlist"
ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true;

-- Add missing fields to AuctionOffer
ALTER TABLE "AuctionOffer"
ADD COLUMN IF NOT EXISTS "cashOtdCents" INTEGER,
ADD COLUMN IF NOT EXISTS "taxAmountCents" INTEGER,
ADD COLUMN IF NOT EXISTS "feeBreakdownJson" JSONB;

-- Migrate to cents
UPDATE "AuctionOffer" SET "cashOtdCents" = CAST("cashOtd" * 100 AS INTEGER) WHERE "cashOtd" IS NOT NULL;
UPDATE "AuctionOffer" SET "taxAmountCents" = CAST("taxAmount" * 100 AS INTEGER) WHERE "taxAmount" IS NOT NULL;
UPDATE "AuctionOffer" SET "feeBreakdownJson" = "feesBreakdown" WHERE "feesBreakdown" IS NOT NULL;
