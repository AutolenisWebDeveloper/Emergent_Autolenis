-- Add fields to ContractDocument
ALTER TABLE "ContractDocument"
ADD COLUMN IF NOT EXISTS "type" TEXT,
ADD COLUMN IF NOT EXISTS "fileUrl" TEXT,
ADD COLUMN IF NOT EXISTS "metaJson" JSONB;

-- Update type field
UPDATE "ContractDocument" SET "type" = "documentType" WHERE "documentType" IS NOT NULL;
UPDATE "ContractDocument" SET "fileUrl" = "documentUrl" WHERE "documentUrl" IS NOT NULL;

-- Add fields to ContractShieldScan
ALTER TABLE "ContractShieldScan"
ADD COLUMN IF NOT EXISTS "issuesCount" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "summary" TEXT,
ADD COLUMN IF NOT EXISTS "selectedDealId" TEXT;
