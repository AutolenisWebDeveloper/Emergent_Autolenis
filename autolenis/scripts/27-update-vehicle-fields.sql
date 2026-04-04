-- Update Vehicle with additional fields
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "drivetrain" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "engine" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "color_exterior" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "color_interior" TEXT;

-- Migrate existing data
UPDATE "Vehicle" SET "color_exterior" = "exteriorColor" WHERE "color_exterior" IS NULL AND "exteriorColor" IS NOT NULL;
UPDATE "Vehicle" SET "color_interior" = "interiorColor" WHERE "color_interior" IS NULL AND "interiorColor" IS NOT NULL;
