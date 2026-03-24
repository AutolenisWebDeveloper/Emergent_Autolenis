-- FIX 1: InventoryItem schema drift - add extended fields
-- These fields are already written by inventory.service.ts but did not
-- exist in the schema/DB before this migration.

ALTER TABLE "InventoryItem"
  ADD COLUMN IF NOT EXISTS "priceCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vin" TEXT,
  ADD COLUMN IF NOT EXISTS "stockNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "mileage" INTEGER,
  ADD COLUMN IF NOT EXISTS "isNew" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "locationName" TEXT,
  ADD COLUMN IF NOT EXISTS "locationCity" TEXT,
  ADD COLUMN IF NOT EXISTS "locationState" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "photosJson" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "source" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceReferenceId" TEXT,
  ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "reservedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "soldAt" TIMESTAMPTZ;

-- Backfill priceCents from price (price is stored in dollars)
UPDATE "InventoryItem"
SET "priceCents" = ROUND("price" * 100)::INTEGER
WHERE "priceCents" = 0 AND "price" > 0;

-- Add new indexes for efficient filtering
CREATE INDEX IF NOT EXISTS "idx_inventory_item_vin" ON "InventoryItem" ("vin");
CREATE INDEX IF NOT EXISTS "idx_inventory_item_status" ON "InventoryItem" ("status");
CREATE INDEX IF NOT EXISTS "idx_inventory_item_price_cents" ON "InventoryItem" ("priceCents");

-- Change status column type from TEXT to use the InventoryStatus enum values
-- Note: The enum is enforced at the application layer via InventoryStatus enum in Prisma
-- The DB column type remains TEXT but only valid enum values are written.
