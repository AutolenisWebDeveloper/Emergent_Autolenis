-- Migration 107: Dealer Onboarding System
-- Adds DealerApplication model, extends Dealer with onboarding fields,
-- extends DealerUser with isPrimary and inviteStatus.

-- ---------------------------------------------------------------------------
-- 1. Create dealer_applications_v2 table (canonical onboarding source of truth)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "dealer_applications_v2" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "dealerId" TEXT,
  "workspaceId" TEXT,

  -- Business identity
  "legalBusinessName" TEXT NOT NULL,
  "dbaName" TEXT,
  "entityType" TEXT,
  "dealerLicenseNumber" TEXT NOT NULL,
  "licenseState" TEXT NOT NULL,
  "taxIdLast4" TEXT,

  -- Contact info
  "businessEmail" TEXT NOT NULL,
  "businessPhone" TEXT,
  "websiteUrl" TEXT,
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zipCode" TEXT,

  -- Principal contact
  "principalName" TEXT NOT NULL,
  "principalEmail" TEXT NOT NULL,
  "principalPhone" TEXT,

  -- Application submitter
  "applicantUserId" TEXT,

  -- Status machine
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "accessState" TEXT NOT NULL DEFAULT 'NO_ACCESS',

  -- Agreement tracking
  "agreementTemplateVersion" TEXT,
  "agreementEnvelopeId" TEXT,
  "agreementSentAt" TIMESTAMPTZ,
  "agreementSignedAt" TIMESTAMPTZ,
  "agreementStoragePath" TEXT,
  "agreementDocumentId" TEXT,

  -- Review / decision
  "reviewNotes" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMPTZ,
  "rejectedBy" TEXT,
  "rejectedAt" TIMESTAMPTZ,
  "rejectionReason" TEXT,

  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "dealer_applications_v2_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "dealer_applications_v2_dealerId_idx" ON "dealer_applications_v2" ("dealerId");
CREATE INDEX IF NOT EXISTS "dealer_applications_v2_workspaceId_idx" ON "dealer_applications_v2" ("workspaceId");
CREATE INDEX IF NOT EXISTS "dealer_applications_v2_applicantUserId_idx" ON "dealer_applications_v2" ("applicantUserId");
CREATE INDEX IF NOT EXISTS "dealer_applications_v2_status_idx" ON "dealer_applications_v2" ("status");
CREATE INDEX IF NOT EXISTS "dealer_applications_v2_accessState_idx" ON "dealer_applications_v2" ("accessState");
CREATE INDEX IF NOT EXISTS "dealer_applications_v2_agreementEnvelopeId_idx" ON "dealer_applications_v2" ("agreementEnvelopeId");
CREATE INDEX IF NOT EXISTS "dealer_applications_v2_createdAt_idx" ON "dealer_applications_v2" ("createdAt");

-- ---------------------------------------------------------------------------
-- 2. Add onboarding fields to Dealer table
-- ---------------------------------------------------------------------------

ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "onboardingStatus" TEXT;
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "accessState" TEXT DEFAULT 'NO_ACCESS';
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "agreementSigned" BOOLEAN DEFAULT false;
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "agreementSignedAt" TIMESTAMPTZ;
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "agreementDocumentId" TEXT;
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "complianceApproved" BOOLEAN DEFAULT false;
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "complianceReviewedAt" TIMESTAMPTZ;
ALTER TABLE "Dealer" ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "Dealer_onboardingStatus_idx" ON "Dealer" ("onboardingStatus");
CREATE INDEX IF NOT EXISTS "Dealer_accessState_idx" ON "Dealer" ("accessState");

-- ---------------------------------------------------------------------------
-- 3. Add onboarding fields to DealerUser table
-- ---------------------------------------------------------------------------

ALTER TABLE "DealerUser" ADD COLUMN IF NOT EXISTS "isPrimary" BOOLEAN DEFAULT false;
ALTER TABLE "DealerUser" ADD COLUMN IF NOT EXISTS "inviteStatus" TEXT DEFAULT 'accepted';

-- ---------------------------------------------------------------------------
-- 4. RLS policies for dealer_applications_v2
-- ---------------------------------------------------------------------------

ALTER TABLE "dealer_applications_v2" ENABLE ROW LEVEL SECURITY;

-- Applicant can read own application
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'dealer_app_v2_applicant_read' AND tablename = 'dealer_applications_v2'
  ) THEN
    EXECUTE 'CREATE POLICY "dealer_app_v2_applicant_read" ON "dealer_applications_v2" FOR SELECT USING (
      "applicantUserId" = current_user_id()
    )';
  END IF;
END $$;

-- Applicant can update only in DRAFT or DOCS_REQUESTED
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'dealer_app_v2_applicant_update' AND tablename = 'dealer_applications_v2'
  ) THEN
    EXECUTE 'CREATE POLICY "dealer_app_v2_applicant_update" ON "dealer_applications_v2" FOR UPDATE USING (
      "applicantUserId" = current_user_id()
      AND "status" IN (''DRAFT'', ''DOCS_REQUESTED'')
    )';
  END IF;
END $$;
