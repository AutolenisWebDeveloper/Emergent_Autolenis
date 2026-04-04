-- Update BuyerPreferences fields
ALTER TABLE "BuyerPreferences" ADD COLUMN IF NOT EXISTS "preferred_makes" TEXT[];
ALTER TABLE "BuyerPreferences" ADD COLUMN IF NOT EXISTS "preferred_body_styles" TEXT[];
ALTER TABLE "BuyerPreferences" ADD COLUMN IF NOT EXISTS "radius_miles" INTEGER;
ALTER TABLE "BuyerPreferences" ADD COLUMN IF NOT EXISTS "home_postal_code" TEXT;

-- Migrate existing data
UPDATE "BuyerPreferences" SET "preferred_makes" = "makes" WHERE "preferred_makes" IS NULL AND "makes" IS NOT NULL;
UPDATE "BuyerPreferences" SET "preferred_body_styles" = "bodyStyles" WHERE "preferred_body_styles" IS NULL AND "bodyStyles" IS NOT NULL;
UPDATE "BuyerPreferences" SET "radius_miles" = "maxDistance" WHERE "radius_miles" IS NULL AND "maxDistance" IS NOT NULL;
