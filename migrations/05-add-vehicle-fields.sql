-- Add missing fields to Vehicle table
ALTER TABLE "Vehicle"
ADD COLUMN IF NOT EXISTS "drivetrain" TEXT,
ADD COLUMN IF NOT EXISTS "engine" TEXT,
ADD COLUMN IF NOT EXISTS "colorExterior" TEXT,
ADD COLUMN IF NOT EXISTS "colorInterior" TEXT;

-- Copy data from old column names if they exist
UPDATE "Vehicle" SET "colorExterior" = "exteriorColor" WHERE "exteriorColor" IS NOT NULL;
UPDATE "Vehicle" SET "colorInterior" = "interiorColor" WHERE "interiorColor" IS NOT NULL;
