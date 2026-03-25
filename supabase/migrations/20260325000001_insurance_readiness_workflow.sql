-- Insurance Readiness Workflow Migration
-- Adds insurance_readiness_status, delivery_block_flag, and InsuranceUpload table
-- Rollback: DROP TABLE IF EXISTS "InsuranceUpload"; ALTER TABLE "SelectedDeal" DROP COLUMN IF EXISTS insurance_readiness_status, DROP COLUMN IF EXISTS delivery_block_flag;

-- Add insurance readiness fields to SelectedDeal
ALTER TABLE "SelectedDeal"
  ADD COLUMN IF NOT EXISTS "insurance_readiness_status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS "delivery_block_flag" BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering by insurance readiness status (admin queues)
CREATE INDEX IF NOT EXISTS "SelectedDeal_insurance_readiness_status_idx"
  ON "SelectedDeal" ("insurance_readiness_status");

-- Insurance document upload tracking table
CREATE TABLE IF NOT EXISTS "InsuranceUpload" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "documentTag" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UPLOADED',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "InsuranceUpload_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InsuranceUpload_dealId_fkey"
    FOREIGN KEY ("dealId") REFERENCES "SelectedDeal"("id") ON DELETE CASCADE,
  CONSTRAINT "InsuranceUpload_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
);

CREATE INDEX IF NOT EXISTS "InsuranceUpload_dealId_idx" ON "InsuranceUpload" ("dealId");
CREATE INDEX IF NOT EXISTS "InsuranceUpload_buyerId_idx" ON "InsuranceUpload" ("buyerId");
CREATE INDEX IF NOT EXISTS "InsuranceUpload_workspaceId_idx" ON "InsuranceUpload" ("workspaceId");

-- RLS policies for InsuranceUpload
ALTER TABLE "InsuranceUpload" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "InsuranceUpload_workspace_isolation"
  ON "InsuranceUpload"
  USING ("workspaceId" = current_setting('app.workspace_id', true));
