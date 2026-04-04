-- M003: Commission idempotency constraint
-- Ensures that replaying the same checkout.session.completed event
-- cannot create duplicate commissions for the same payment + level.
--
-- Rollback:
--   ALTER TABLE "Commission" DROP CONSTRAINT IF EXISTS "Commission_serviceFeePaymentId_level_key";
--   ALTER TABLE "Commission" DROP COLUMN IF EXISTS "serviceFeePaymentId";

-- Add serviceFeePaymentId column if not present
ALTER TABLE "Commission" ADD COLUMN IF NOT EXISTS "serviceFeePaymentId" TEXT;

-- Back-fill from legacy snake_case column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Commission' AND column_name = 'service_fee_payment_id'
  ) THEN
    UPDATE "Commission"
    SET "serviceFeePaymentId" = "service_fee_payment_id"
    WHERE "serviceFeePaymentId" IS NULL AND "service_fee_payment_id" IS NOT NULL;
  END IF;
END $$;

-- Create unique index for idempotency (serviceFeePaymentId + level)
CREATE UNIQUE INDEX IF NOT EXISTS "Commission_serviceFeePaymentId_level_key"
  ON "Commission" ("serviceFeePaymentId", "level")
  WHERE "serviceFeePaymentId" IS NOT NULL;
