-- Update ComplianceEvent with proper type enum
DO $$ BEGIN
  CREATE TYPE "ComplianceEventType" AS ENUM ('SOFT_PULL', 'FEE_DISCLOSURE', 'ADMIN_ACTION', 'CONTRACT_SCAN', 'PAYMENT_EVENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "ComplianceEvent"
ADD COLUMN IF NOT EXISTS "type" "ComplianceEventType",
ADD COLUMN IF NOT EXISTS "severity" TEXT;
