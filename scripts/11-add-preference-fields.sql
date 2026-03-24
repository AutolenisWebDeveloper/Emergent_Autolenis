-- Add missing fields to BuyerPreferences
ALTER TABLE "BuyerPreferences"
ADD COLUMN IF NOT EXISTS "radiusMiles" INTEGER,
ADD COLUMN IF NOT EXISTS "homePostalCode" TEXT;
