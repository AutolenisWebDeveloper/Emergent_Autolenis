-- FIX 8: Add qrCodeExpiresAt to PickupAppointment
-- QR codes now expire after a configurable window (default 60 minutes).

ALTER TABLE "PickupAppointment"
  ADD COLUMN IF NOT EXISTS "qrCodeExpiresAt" TIMESTAMPTZ;

COMMENT ON COLUMN "PickupAppointment"."qrCodeExpiresAt"
  IS 'FIX 8: QR code expiry timestamp. The QR code is invalid after this time. NULL means no expiry (legacy records).';
