-- Update InventoryItem with proper fields
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "stock_number" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "price_cents" INTEGER;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "is_new" BOOLEAN DEFAULT false;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "location_city" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "location_state" TEXT;

-- Convert price to cents
UPDATE "InventoryItem" SET "price_cents" = ROUND("price" * 100)::INTEGER WHERE "price" IS NOT NULL;
