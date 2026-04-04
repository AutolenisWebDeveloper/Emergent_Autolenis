-- CMA: Controlled Manual Approval schema migration
-- Adds ContractManualReview table and extends DealStatus/UserRole enums.

-- 1. Extend DealStatus enum with CMA states
ALTER TYPE "DealStatus" ADD VALUE IF NOT EXISTS 'CONTRACT_MANUAL_REVIEW_REQUIRED' AFTER 'CONTRACT_REVIEW';
ALTER TYPE "DealStatus" ADD VALUE IF NOT EXISTS 'CONTRACT_INTERNAL_FIX_IN_PROGRESS' AFTER 'CONTRACT_MANUAL_REVIEW_REQUIRED';
ALTER TYPE "DealStatus" ADD VALUE IF NOT EXISTS 'CONTRACT_ADMIN_OVERRIDE_APPROVED' AFTER 'CONTRACT_INTERNAL_FIX_IN_PROGRESS';

-- 2. Add COMPLIANCE_ADMIN to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'COMPLIANCE_ADMIN' AFTER 'SUPER_ADMIN';

-- 3. Create CMA enums
DO $$ BEGIN
  CREATE TYPE "ManualReviewStatus" AS ENUM ('OPEN', 'PENDING_SECOND_APPROVAL', 'APPROVED', 'RETURNED_INTERNAL_FIX', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ManualApprovalMode" AS ENUM ('MANUAL_VALIDATED', 'EXCEPTION_OVERRIDE', 'RETURN_TO_INTERNAL_FIX');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CmaRootCauseCategory" AS ENUM ('FALSE_POSITIVE_SCAN', 'INTERNAL_DATA_MISMATCH', 'DEPENDENCY_FAILURE', 'POLICY_RULES_DISCREPANCY', 'MISSING_INTERNAL_ATTESTATION', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CmaInternalFixQueue" AS ENUM ('OPS', 'ENGINEERING', 'POLICY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Create ContractManualReview table
CREATE TABLE IF NOT EXISTS "ContractManualReview" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "workspaceId" TEXT,
  "dealId" TEXT NOT NULL,
  "contractDocumentId" TEXT,
  "overriddenScanId" TEXT,

  "status" "ManualReviewStatus" NOT NULL DEFAULT 'OPEN',
  "rootCauseCategory" "CmaRootCauseCategory",
  "rootCauseNotes" TEXT,
  "approvalMode" "ManualApprovalMode",

  "verifiedFieldsJson" JSONB,
  "evidenceAttachmentIds" TEXT[] DEFAULT '{}',

  "vinMatch" BOOLEAN NOT NULL DEFAULT false,
  "buyerIdentityMatch" BOOLEAN NOT NULL DEFAULT false,
  "otdMathValidated" BOOLEAN NOT NULL DEFAULT false,
  "feesValidated" BOOLEAN NOT NULL DEFAULT false,
  "termsValidated" BOOLEAN NOT NULL DEFAULT false,
  "disclosuresPresent" BOOLEAN NOT NULL DEFAULT false,

  "attestationAccepted" BOOLEAN NOT NULL DEFAULT false,
  "attestationTextVersion" TEXT,

  "approvedByAdminId" TEXT,
  "approvedAt" TIMESTAMPTZ,
  "approvedFromIp" TEXT,
  "approvedUserAgent" TEXT,

  "secondApproverAdminId" TEXT,
  "secondApprovedAt" TIMESTAMPTZ,

  "revokedAt" TIMESTAMPTZ,
  "revokedReason" TEXT,
  "revokedByAdminId" TEXT,

  "assignedQueue" "CmaInternalFixQueue",
  "documentHashAtApproval" TEXT,

  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "ContractManualReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContractManualReview_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "SelectedDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ContractManualReview_contractDocumentId_fkey" FOREIGN KEY ("contractDocumentId") REFERENCES "ContractDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ContractManualReview_overriddenScanId_fkey" FOREIGN KEY ("overriddenScanId") REFERENCES "ContractShieldScan"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ContractManualReview_approvedByAdminId_fkey" FOREIGN KEY ("approvedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ContractManualReview_secondApproverAdminId_fkey" FOREIGN KEY ("secondApproverAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ContractManualReview_revokedByAdminId_fkey" FOREIGN KEY ("revokedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ContractManualReview_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS "ContractManualReview_dealId_idx" ON "ContractManualReview"("dealId");
CREATE INDEX IF NOT EXISTS "ContractManualReview_contractDocumentId_idx" ON "ContractManualReview"("contractDocumentId");
CREATE INDEX IF NOT EXISTS "ContractManualReview_overriddenScanId_idx" ON "ContractManualReview"("overriddenScanId");
CREATE INDEX IF NOT EXISTS "ContractManualReview_status_idx" ON "ContractManualReview"("status");
CREATE INDEX IF NOT EXISTS "ContractManualReview_workspaceId_idx" ON "ContractManualReview"("workspaceId");
CREATE INDEX IF NOT EXISTS "ContractManualReview_createdAt_idx" ON "ContractManualReview"("createdAt");

-- 6. RLS: Only admin roles can access ContractManualReview
ALTER TABLE "ContractManualReview" ENABLE ROW LEVEL SECURITY;

-- Allow admin read
CREATE POLICY "admin_cma_read" ON "ContractManualReview"
  FOR SELECT
  USING (true); -- Filtered at app layer by RBAC (isCmaApprover / isAdminRole)

-- Allow admin write
CREATE POLICY "admin_cma_write" ON "ContractManualReview"
  FOR ALL
  USING (true); -- Filtered at app layer by RBAC (isCmaApprover)
