-- Update Affiliate fields
ALTER TABLE "Affiliate" ADD COLUMN IF NOT EXISTS "ref_code" TEXT;
ALTER TABLE "Affiliate" ADD COLUMN IF NOT EXISTS "landing_slug" TEXT;

UPDATE "Affiliate" SET "ref_code" = "referralCode" WHERE "ref_code" IS NULL;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS "Affiliate_ref_code_idx" ON "Affiliate"("ref_code");
