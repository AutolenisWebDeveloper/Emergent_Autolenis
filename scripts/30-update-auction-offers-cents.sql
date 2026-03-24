-- Convert AuctionOffer monetary fields to cents
ALTER TABLE "AuctionOffer" ADD COLUMN IF NOT EXISTS "cash_otd_cents" INTEGER;
ALTER TABLE "AuctionOffer" ADD COLUMN IF NOT EXISTS "tax_amount_cents" INTEGER;
ALTER TABLE "AuctionOffer" ADD COLUMN IF NOT EXISTS "fee_breakdown_json" JSONB;

UPDATE "AuctionOffer" SET "cash_otd_cents" = ROUND("cashOtd" * 100)::INTEGER WHERE "cashOtd" IS NOT NULL;
UPDATE "AuctionOffer" SET "tax_amount_cents" = ROUND("taxAmount" * 100)::INTEGER WHERE "taxAmount" IS NOT NULL;
UPDATE "AuctionOffer" SET "fee_breakdown_json" = "feesBreakdown" WHERE "fee_breakdown_json" IS NULL AND "feesBreakdown" IS NOT NULL;

-- Add dealer_id directly to auction_offers
ALTER TABLE "AuctionOffer" ADD COLUMN IF NOT EXISTS "dealer_id" TEXT;
