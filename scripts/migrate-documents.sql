-- ============================================================
-- AutoLenis Document System Migration
-- Ensures DealDocument, AffiliateDocument, storage buckets,
-- and RLS policies are fully production-ready.
-- Safe to re-run (idempotent).
-- ============================================================

-- ── 1. DealDocument table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DealDocument" (
  "id"               TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "ownerUserId"      TEXT        NOT NULL,
  "dealId"           TEXT,
  "workspaceId"      TEXT,
  "requestId"        TEXT,
  "type"             TEXT        NOT NULL DEFAULT 'OTHER',
  "fileName"         TEXT        NOT NULL,
  "mimeType"         TEXT,
  "fileSize"         BIGINT,
  "fileUrl"          TEXT        NOT NULL,
  "storagePath"      TEXT,
  "status"           TEXT        NOT NULL DEFAULT 'UPLOADED',
  "rejectionReason"  TEXT,
  "uploadedByRole"   TEXT,
  "uploadVisibility" TEXT        NOT NULL DEFAULT 'BUYER_ADMIN',
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "DealDocument_pkey" PRIMARY KEY ("id")
);

-- Add missing columns idempotently
ALTER TABLE "DealDocument"
  ADD COLUMN IF NOT EXISTS "storagePath"      TEXT,
  ADD COLUMN IF NOT EXISTS "requestId"        TEXT,
  ADD COLUMN IF NOT EXISTS "rejectionReason"  TEXT,
  ADD COLUMN IF NOT EXISTS "workspaceId"      TEXT,
  ADD COLUMN IF NOT EXISTS "uploadVisibility" TEXT NOT NULL DEFAULT 'BUYER_ADMIN',
  ADD COLUMN IF NOT EXISTS "uploadedByRole"   TEXT,
  ADD COLUMN IF NOT EXISTS "mimeType"         TEXT,
  ADD COLUMN IF NOT EXISTS "fileSize"         BIGINT;

-- Indexes
CREATE INDEX IF NOT EXISTS "DealDocument_ownerUserId_idx"  ON "DealDocument" ("ownerUserId");
CREATE INDEX IF NOT EXISTS "DealDocument_dealId_idx"       ON "DealDocument" ("dealId");
CREATE INDEX IF NOT EXISTS "DealDocument_workspaceId_idx"  ON "DealDocument" ("workspaceId");
CREATE INDEX IF NOT EXISTS "DealDocument_requestId_idx"    ON "DealDocument" ("requestId");
CREATE INDEX IF NOT EXISTS "DealDocument_status_idx"       ON "DealDocument" ("status");
CREATE INDEX IF NOT EXISTS "DealDocument_createdAt_idx"    ON "DealDocument" ("createdAt" DESC);

-- Auto-update updatedAt
CREATE OR REPLACE FUNCTION update_deal_document_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "DealDocument_updated_at" ON "DealDocument";
CREATE TRIGGER "DealDocument_updated_at"
  BEFORE UPDATE ON "DealDocument"
  FOR EACH ROW EXECUTE FUNCTION update_deal_document_updated_at();

-- ── 2. DocumentRequest table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "DocumentRequest" (
  "id"                 TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "dealId"             TEXT        NOT NULL,
  "buyerId"            TEXT        NOT NULL,
  "workspaceId"        TEXT,
  "requestedByUserId"  TEXT        NOT NULL,
  "requestedByRole"    TEXT        NOT NULL,
  "type"               TEXT        NOT NULL,
  "required"           BOOLEAN     NOT NULL DEFAULT TRUE,
  "notes"              TEXT,
  "dueDate"            TIMESTAMPTZ,
  "status"             TEXT        NOT NULL DEFAULT 'REQUESTED',
  "decidedByUserId"    TEXT,
  "decidedByRole"      TEXT,
  "decidedAt"          TIMESTAMPTZ,
  "decisionNotes"      TEXT,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DocumentRequest"
  ADD COLUMN IF NOT EXISTS "workspaceId"     TEXT,
  ADD COLUMN IF NOT EXISTS "decidedByRole"   TEXT,
  ADD COLUMN IF NOT EXISTS "decidedAt"       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "decisionNotes"   TEXT;

CREATE INDEX IF NOT EXISTS "DocumentRequest_buyerId_idx"   ON "DocumentRequest" ("buyerId");
CREATE INDEX IF NOT EXISTS "DocumentRequest_dealId_idx"    ON "DocumentRequest" ("dealId");
CREATE INDEX IF NOT EXISTS "DocumentRequest_status_idx"    ON "DocumentRequest" ("status");
CREATE INDEX IF NOT EXISTS "DocumentRequest_createdAt_idx" ON "DocumentRequest" ("createdAt" DESC);

-- ── 3. AffiliateDocument table ───────────────────────────────
CREATE TABLE IF NOT EXISTS "AffiliateDocument" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "affiliateId" TEXT        NOT NULL,
  "workspaceId" TEXT,
  "type"        TEXT        NOT NULL DEFAULT 'OTHER',
  "fileName"    TEXT        NOT NULL,
  "filePath"    TEXT        NOT NULL,
  "fileSize"    BIGINT,
  "mimeType"    TEXT,
  "status"      TEXT        NOT NULL DEFAULT 'PENDING',
  "visibility"  TEXT        NOT NULL DEFAULT 'INTERNAL',
  "reviewNotes" TEXT,
  "reviewedBy"  TEXT,
  "reviewedAt"  TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "AffiliateDocument_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AffiliateDocument"
  ADD COLUMN IF NOT EXISTS "reviewNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedBy"  TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedAt"  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "AffiliateDocument_affiliateId_idx"  ON "AffiliateDocument" ("affiliateId");
CREATE INDEX IF NOT EXISTS "AffiliateDocument_workspaceId_idx"  ON "AffiliateDocument" ("workspaceId");
CREATE INDEX IF NOT EXISTS "AffiliateDocument_status_idx"       ON "AffiliateDocument" ("status");
CREATE INDEX IF NOT EXISTS "AffiliateDocument_createdAt_idx"    ON "AffiliateDocument" ("createdAt" DESC);

-- ── 4. Storage buckets ───────────────────────────────────────
-- buyer-documents: private bucket for buyer/dealer uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'buyer-documents',
  'buyer-documents',
  FALSE,
  26214400, -- 25 MB
  ARRAY['application/pdf','image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- affiliate-documents: private bucket for affiliate uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'affiliate-documents',
  'affiliate-documents',
  FALSE,
  10485760, -- 10 MB
  ARRAY['application/pdf','image/jpeg','image/jpg','image/png']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── 5. RLS on DealDocument ───────────────────────────────────
ALTER TABLE "DealDocument" ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies cleanly
DROP POLICY IF EXISTS "DealDocument: owners can select own docs" ON "DealDocument";
DROP POLICY IF EXISTS "DealDocument: owners can insert"          ON "DealDocument";
DROP POLICY IF EXISTS "DealDocument: owners can update own"      ON "DealDocument";
DROP POLICY IF EXISTS "DealDocument: owners can delete own"      ON "DealDocument";
DROP POLICY IF EXISTS "DealDocument: service role bypass"        ON "DealDocument";

-- Service role (API server) bypasses all RLS
CREATE POLICY "DealDocument: service role bypass"
  ON "DealDocument" FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 6. RLS on DocumentRequest ────────────────────────────────
ALTER TABLE "DocumentRequest" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "DocumentRequest: service role bypass" ON "DocumentRequest";
CREATE POLICY "DocumentRequest: service role bypass"
  ON "DocumentRequest" FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 7. RLS on AffiliateDocument ─────────────────────────────
ALTER TABLE "AffiliateDocument" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AffiliateDocument: service role bypass" ON "AffiliateDocument";
CREATE POLICY "AffiliateDocument: service role bypass"
  ON "AffiliateDocument" FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 8. Storage RLS — buyer-documents bucket ──────────────────
DROP POLICY IF EXISTS "buyer-documents: service role all"   ON storage.objects;
CREATE POLICY "buyer-documents: service role all"
  ON storage.objects FOR ALL
  USING     (bucket_id = 'buyer-documents' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'buyer-documents' AND auth.role() = 'service_role');

-- ── 9. Storage RLS — affiliate-documents bucket ──────────────
DROP POLICY IF EXISTS "affiliate-documents: service role all" ON storage.objects;
CREATE POLICY "affiliate-documents: service role all"
  ON storage.objects FOR ALL
  USING     (bucket_id = 'affiliate-documents' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'affiliate-documents' AND auth.role() = 'service_role');

-- Done
SELECT 'Document system migration complete' AS status;
