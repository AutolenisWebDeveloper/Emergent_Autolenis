-- Simplified to just skip if table doesn't exist, with exception handling
DO $$
BEGIN
  -- Check if original table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AuctionOfferFinancingOption') THEN
    -- Add columns
    ALTER TABLE "AuctionOfferFinancingOption" ADD COLUMN IF NOT EXISTS "down_payment_cents" INTEGER;
    ALTER TABLE "AuctionOfferFinancingOption" ADD COLUMN IF NOT EXISTS "est_monthly_payment_cents" INTEGER;
    ALTER TABLE "AuctionOfferFinancingOption" ADD COLUMN IF NOT EXISTS "term_months" INTEGER;
    ALTER TABLE "AuctionOfferFinancingOption" ADD COLUMN IF NOT EXISTS "lender_name" TEXT;

    -- Migrate data
    UPDATE "AuctionOfferFinancingOption" SET "down_payment_cents" = ROUND("downPayment" * 100)::INTEGER 
      WHERE "downPayment" IS NOT NULL AND "down_payment_cents" IS NULL;
    UPDATE "AuctionOfferFinancingOption" SET "est_monthly_payment_cents" = ROUND("monthlyPayment" * 100)::INTEGER 
      WHERE "monthlyPayment" IS NOT NULL AND "est_monthly_payment_cents" IS NULL;
    UPDATE "AuctionOfferFinancingOption" SET "term_months" = "termMonths" 
      WHERE "term_months" IS NULL AND "termMonths" IS NOT NULL;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auction_offer_financing_options') THEN
    -- Table was already renamed, just ensure columns exist
    ALTER TABLE "auction_offer_financing_options" ADD COLUMN IF NOT EXISTS "down_payment_cents" INTEGER;
    ALTER TABLE "auction_offer_financing_options" ADD COLUMN IF NOT EXISTS "est_monthly_payment_cents" INTEGER;
    ALTER TABLE "auction_offer_financing_options" ADD COLUMN IF NOT EXISTS "term_months" INTEGER;
    ALTER TABLE "auction_offer_financing_options" ADD COLUMN IF NOT EXISTS "lender_name" TEXT;
  END IF;
  -- If neither table exists, do nothing (table may not be needed in this schema)
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END $$;
