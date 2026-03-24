-- Update ComplianceEvent with proper type enum
-- Create enum if not exists and add columns, skip non-existent column updates
DO $$ BEGIN
  CREATE TYPE "ComplianceEventType" AS ENUM ('SOFT_PULL', 'FEE_DISCLOSURE', 'ADMIN_ACTION', 'CONTRACT_SCAN', 'PAYMENT_EVENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "ComplianceEvent" ADD COLUMN IF NOT EXISTS "type" "ComplianceEventType";
ALTER TABLE "ComplianceEvent" ADD COLUMN IF NOT EXISTS "deal_id" TEXT;
ALTER TABLE "ComplianceEvent" ADD COLUMN IF NOT EXISTS "buyer_id" TEXT;
ALTER TABLE "ComplianceEvent" ADD COLUMN IF NOT EXISTS "ip_address" TEXT;
ALTER TABLE "ComplianceEvent" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;

-- Copy from existing ipAddress column if it exists
UPDATE "ComplianceEvent" SET "ip_address" = "ipAddress" WHERE "ip_address" IS NULL AND "ipAddress" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "ComplianceEvent_type_idx" ON "ComplianceEvent"("type");
CREATE INDEX IF NOT EXISTS "ComplianceEvent_deal_id_idx" ON "ComplianceEvent"("deal_id");
