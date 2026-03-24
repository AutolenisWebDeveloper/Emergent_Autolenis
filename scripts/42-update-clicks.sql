-- Update Click fields
-- Only add columns, remove UPDATE statements for non-existent columns
ALTER TABLE "Click" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "Click" ADD COLUMN IF NOT EXISTS "ref_code" TEXT;
ALTER TABLE "Click" ADD COLUMN IF NOT EXISTS "ip" TEXT;

-- Copy data from existing columns if they exist
UPDATE "Click" SET "ip" = "ipAddress" WHERE "ip" IS NULL AND "ipAddress" IS NOT NULL;
-- Note: user_agent column doesn't exist in current schema, skip that migration
