-- Convert ExternalPreApproval to cents
ALTER TABLE "ExternalPreApproval" ADD COLUMN IF NOT EXISTS "approved_amount_cents" INTEGER;
ALTER TABLE "ExternalPreApproval" ADD COLUMN IF NOT EXISTS "selected_deal_id" TEXT;

UPDATE "ExternalPreApproval" SET "approved_amount_cents" = ROUND("approvedAmount" * 100)::INTEGER 
  WHERE "approvedAmount" IS NOT NULL AND "approved_amount_cents" IS NULL;

-- Fixed constraint check to use information_schema and added exception handling
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'external_pre_approvals_deal_fk' 
    AND table_name = 'ExternalPreApproval'
  ) THEN
    ALTER TABLE "ExternalPreApproval" ADD CONSTRAINT "external_pre_approvals_deal_fk" 
      FOREIGN KEY ("selected_deal_id") REFERENCES "SelectedDeal"("id");
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
