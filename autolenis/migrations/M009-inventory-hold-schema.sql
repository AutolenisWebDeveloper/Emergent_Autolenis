-- M009: Inventory hold schema — InventoryStatus enum, reservedAt, depositPayment linkage
-- Required by FIX 4: release-expired-holds cron

-- 1. Create InventoryStatus enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryStatus') THEN
    CREATE TYPE "InventoryStatus" AS ENUM ('AVAILABLE', 'HOLD', 'SOLD', 'REMOVED');
  END IF;
END $$;

-- 2. Convert InventoryItem.status from text to InventoryStatus enum
ALTER TABLE "InventoryItem"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "InventoryItem"
  ALTER COLUMN "status" TYPE "InventoryStatus"
  USING "status"::"InventoryStatus";

ALTER TABLE "InventoryItem"
  ALTER COLUMN "status" SET DEFAULT 'AVAILABLE'::"InventoryStatus";

-- 3. Add reservedAt column to InventoryItem
ALTER TABLE "InventoryItem"
  ADD COLUMN IF NOT EXISTS "reservedAt" TIMESTAMPTZ;

-- 4. Add inventoryItemId column to DepositPayment
ALTER TABLE "DepositPayment"
  ADD COLUMN IF NOT EXISTS "inventoryItemId" TEXT;

-- 5. Add FK constraint from DepositPayment to InventoryItem
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DepositPayment_inventoryItemId_fkey'
  ) THEN
    ALTER TABLE "DepositPayment"
      ADD CONSTRAINT "DepositPayment_inventoryItemId_fkey"
      FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- 6. Add indexes
CREATE INDEX IF NOT EXISTS "InventoryItem_status_idx" ON "InventoryItem"("status");
CREATE INDEX IF NOT EXISTS "DepositPayment_inventoryItemId_idx" ON "DepositPayment"("inventoryItemId");
