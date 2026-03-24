-- Convert Commission to cents
ALTER TABLE "Commission" ADD COLUMN IF NOT EXISTS "amount_cents" INTEGER;
ALTER TABLE "Commission" ADD COLUMN IF NOT EXISTS "service_fee_payment_id" TEXT;

-- Update existing data (idempotent - only updates rows that haven't been converted)
UPDATE "Commission" SET "amount_cents" = ROUND("commissionAmount" * 100)::INTEGER 
WHERE "commissionAmount" IS NOT NULL AND "amount_cents" IS NULL;

-- Add foreign key to service fee payments (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'commissions_service_fee_fk' 
    AND table_name = 'Commission'
  ) THEN
    ALTER TABLE "Commission" ADD CONSTRAINT "commissions_service_fee_fk" 
      FOREIGN KEY ("service_fee_payment_id") REFERENCES "ServiceFeePayment"("id");
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
