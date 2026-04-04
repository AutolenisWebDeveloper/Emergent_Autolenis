-- Update PickupAppointment fields
ALTER TABLE "PickupAppointment"
ADD COLUMN IF NOT EXISTS "locationName" TEXT,
ADD COLUMN IF NOT EXISTS "locationAddress" TEXT,
ADD COLUMN IF NOT EXISTS "qrCodeValue" TEXT;

UPDATE "PickupAppointment" SET "qrCodeValue" = "qrCode" WHERE "qrCode" IS NOT NULL;

-- Update PickupStatus enum if needed
DO $$ BEGIN
  CREATE TYPE "PickupStatusNew" AS ENUM ('SCHEDULED', 'ARRIVED', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
