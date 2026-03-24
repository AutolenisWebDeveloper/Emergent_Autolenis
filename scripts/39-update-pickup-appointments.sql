-- Update PickupAppointment fields
ALTER TABLE "PickupAppointment" ADD COLUMN IF NOT EXISTS "scheduled_at" TIMESTAMP(3);
ALTER TABLE "PickupAppointment" ADD COLUMN IF NOT EXISTS "location_name" TEXT;
ALTER TABLE "PickupAppointment" ADD COLUMN IF NOT EXISTS "location_address" TEXT;
ALTER TABLE "PickupAppointment" ADD COLUMN IF NOT EXISTS "qr_code_value" TEXT;
ALTER TABLE "PickupAppointment" ADD COLUMN IF NOT EXISTS "buyer_id_v2" TEXT;

-- Combine date and time into timestamp
UPDATE "PickupAppointment" 
SET "scheduled_at" = "scheduledDate" + ("scheduledTime"::time)
WHERE "scheduled_at" IS NULL AND "scheduledDate" IS NOT NULL;

UPDATE "PickupAppointment" SET "qr_code_value" = "qrCode" WHERE "qr_code_value" IS NULL;
UPDATE "PickupAppointment" SET "buyer_id_v2" = "buyerId" WHERE "buyer_id_v2" IS NULL;
