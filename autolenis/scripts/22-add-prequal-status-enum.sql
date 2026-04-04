-- Create PreQualStatus enum if not exists
DO $$ BEGIN
  CREATE TYPE "PreQualStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add status field to PreQualification table as TEXT first (safer approach)
ALTER TABLE "PreQualification" ADD COLUMN IF NOT EXISTS "prequal_status" TEXT DEFAULT 'ACTIVE';

-- Create index on the new status column
CREATE INDEX IF NOT EXISTS "PreQualification_prequal_status_idx" ON "PreQualification"("prequal_status");
