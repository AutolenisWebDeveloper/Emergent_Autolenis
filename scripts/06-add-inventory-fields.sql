-- Add missing fields to InventoryItem table
ALTER TABLE "InventoryItem"
ADD COLUMN IF NOT EXISTS "stockNumber" TEXT,
ADD COLUMN IF NOT EXISTS "priceCents" INTEGER,
ADD COLUMN IF NOT EXISTS "isNew" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "locationCity" TEXT,
ADD COLUMN IF NOT EXISTS "locationState" TEXT;

-- Migrate price to cents
UPDATE "InventoryItem" SET "priceCents" = CAST("price" * 100 AS INTEGER) WHERE "price" IS NOT NULL;
