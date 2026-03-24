-- Add fields to Affiliate
ALTER TABLE "Affiliate"
ADD COLUMN IF NOT EXISTS "refCode" TEXT,
ADD COLUMN IF NOT EXISTS "landingSlug" TEXT;

-- Copy referralCode to refCode
UPDATE "Affiliate" SET "refCode" = "referralCode" WHERE "referralCode" IS NOT NULL AND "refCode" IS NULL;

-- Add fields to Referral
ALTER TABLE "Referral"
ADD COLUMN IF NOT EXISTS "parentReferralId" TEXT;

-- Fixed constraint check to use information_schema which is more reliable
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'Referral_parentReferralId_fkey' 
    AND table_name = 'Referral'
  ) THEN
    ALTER TABLE "Referral"
    ADD CONSTRAINT "Referral_parentReferralId_fkey" 
    FOREIGN KEY ("parentReferralId") REFERENCES "Referral"("id") ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add fields to Click
ALTER TABLE "Click"
ADD COLUMN IF NOT EXISTS "refCode" TEXT,
ADD COLUMN IF NOT EXISTS "ip" TEXT;

UPDATE "Click" SET "ip" = "ipAddress" WHERE "ipAddress" IS NOT NULL AND "ip" IS NULL;
