-- Update BuyerProfile with proper address fields
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "address_line1" TEXT;
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "address_line2" TEXT;
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'US';

-- Migrate existing data
UPDATE "BuyerProfile" SET "address_line1" = "address" WHERE "address_line1" IS NULL AND "address" IS NOT NULL;
UPDATE "BuyerProfile" SET "postal_code" = "zip" WHERE "postal_code" IS NULL AND "zip" IS NOT NULL;

-- Convert monetary fields to cents (multiply by 100)
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "monthly_income_cents" INTEGER;
ALTER TABLE "BuyerProfile" ADD COLUMN IF NOT EXISTS "monthly_housing_cents" INTEGER;

UPDATE "BuyerProfile" SET "monthly_income_cents" = ROUND("annualIncome" / 12 * 100)::INTEGER WHERE "annualIncome" IS NOT NULL;
UPDATE "BuyerProfile" SET "monthly_housing_cents" = ROUND("monthlyHousing" * 100)::INTEGER WHERE "monthlyHousing" IS NOT NULL;
