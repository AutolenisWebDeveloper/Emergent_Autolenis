-- Update Referral for multi-level tracking
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "parent_referral_id" TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS "referred_user_id_v2" TEXT;

-- Add self-referencing foreign key for multi-level (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'referrals_parent_fk' 
    AND table_name = 'Referral'
  ) THEN
    ALTER TABLE "Referral" ADD CONSTRAINT "referrals_parent_fk" 
      FOREIGN KEY ("parent_referral_id") REFERENCES "Referral"("id");
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Referral_parent_referral_id_idx" ON "Referral"("parent_referral_id");
