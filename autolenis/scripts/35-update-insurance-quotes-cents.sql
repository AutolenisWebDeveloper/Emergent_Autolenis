-- Convert InsuranceQuote to cents
ALTER TABLE "InsuranceQuote" ADD COLUMN IF NOT EXISTS "premium_monthly_cents" INTEGER;
ALTER TABLE "InsuranceQuote" ADD COLUMN IF NOT EXISTS "premium_semi_annual_cents" INTEGER;
ALTER TABLE "InsuranceQuote" ADD COLUMN IF NOT EXISTS "coverage_json" JSONB;
ALTER TABLE "InsuranceQuote" ADD COLUMN IF NOT EXISTS "carrier_name" TEXT;
ALTER TABLE "InsuranceQuote" ADD COLUMN IF NOT EXISTS "product_name" TEXT;
ALTER TABLE "InsuranceQuote" ADD COLUMN IF NOT EXISTS "selected_deal_id" TEXT;

UPDATE "InsuranceQuote" SET "premium_monthly_cents" = ROUND("monthlyPremium" * 100)::INTEGER 
  WHERE "monthlyPremium" IS NOT NULL AND "premium_monthly_cents" IS NULL;
UPDATE "InsuranceQuote" SET "premium_semi_annual_cents" = ROUND("sixMonthPremium" * 100)::INTEGER 
  WHERE "sixMonthPremium" IS NOT NULL AND "premium_semi_annual_cents" IS NULL;
UPDATE "InsuranceQuote" SET "coverage_json" = "coverageLimits" 
  WHERE "coverage_json" IS NULL AND "coverageLimits" IS NOT NULL;
UPDATE "InsuranceQuote" SET "carrier_name" = "carrier" 
  WHERE "carrier_name" IS NULL AND "carrier" IS NOT NULL;

-- Fixed constraint check to use information_schema and added exception handling
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'insurance_quotes_deal_fk' 
    AND table_name = 'InsuranceQuote'
  ) THEN
    ALTER TABLE "InsuranceQuote" ADD CONSTRAINT "insurance_quotes_deal_fk" 
      FOREIGN KEY ("selected_deal_id") REFERENCES "SelectedDeal"("id");
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
