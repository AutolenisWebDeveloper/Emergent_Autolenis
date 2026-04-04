-- Update ContractDocument fields to match spec
ALTER TABLE "ContractDocument" ADD COLUMN IF NOT EXISTS "file_url" TEXT;
ALTER TABLE "ContractDocument" ADD COLUMN IF NOT EXISTS "meta_json" JSONB;

UPDATE "ContractDocument" SET "file_url" = "documentUrl" WHERE "file_url" IS NULL;
