-- Update Dealer with proper address fields
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "legal_name" TEXT;
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "address_line1" TEXT;
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "address_line2" TEXT;
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'US';
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true;

-- Migrate existing data
UPDATE "Dealer" SET "name" = "businessName" WHERE "name" IS NULL;
UPDATE "Dealer" SET "legal_name" = "businessName" WHERE "legal_name" IS NULL;
UPDATE "Dealer" SET "address_line1" = "address" WHERE "address_line1" IS NULL AND "address" IS NOT NULL;
UPDATE "Dealer" SET "postal_code" = "zip" WHERE "postal_code" IS NULL AND "zip" IS NOT NULL;
