-- ==========================================================================
-- External Pre-Approval Submissions — Table, Indexes, RLS, Storage Bucket
--
-- Creates the canonical external_preapproval_submissions table used by
-- lib/services/external-preapproval.service.ts (Prompt 4 contract).
--
-- Also creates the buyer-docs storage bucket required by the service.
--
-- Idempotent — safe to re-run.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. external_preapproval_submissions table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "external_preapproval_submissions" (
  "id"                         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "buyer_id"                   TEXT        NOT NULL,
  "workspace_id"               TEXT,
  "lender_name"                TEXT        NOT NULL,
  "approved_amount"            DOUBLE PRECISION NOT NULL,
  "max_otd_amount_cents"       INTEGER,
  "apr"                        DOUBLE PRECISION,
  "apr_bps"                    INTEGER,
  "term_months"                INTEGER,
  "min_monthly_payment_cents"  INTEGER,
  "max_monthly_payment_cents"  INTEGER,
  "dti_ratio_bps"              INTEGER,
  "expires_at"                 TIMESTAMPTZ,
  "submission_notes"           TEXT,
  "storage_bucket"             TEXT,
  "document_storage_path"      TEXT,
  "original_file_name"         TEXT,
  "file_size_bytes"            INTEGER,
  "mime_type"                  TEXT,
  "sha256"                     TEXT,
  "status"                     TEXT        NOT NULL DEFAULT 'SUBMITTED',
  "reviewed_by"                TEXT,
  "reviewed_at"                TIMESTAMPTZ,
  "decision_at"                TIMESTAMPTZ,
  "review_notes"               TEXT,
  "rejection_reason"           TEXT,
  "rejection_reason_code"      TEXT,
  "superseded_by_id"           TEXT,
  "prequalification_id"        TEXT,
  "created_at"                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------
-- 2. Indexes
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "epas_buyer_id_idx"
  ON "external_preapproval_submissions" ("buyer_id");
CREATE INDEX IF NOT EXISTS "epas_status_idx"
  ON "external_preapproval_submissions" ("status");
CREATE INDEX IF NOT EXISTS "epas_workspace_id_idx"
  ON "external_preapproval_submissions" ("workspace_id");
CREATE INDEX IF NOT EXISTS "epas_created_at_idx"
  ON "external_preapproval_submissions" ("created_at");
CREATE INDEX IF NOT EXISTS "epas_prequalification_id_idx"
  ON "external_preapproval_submissions" ("prequalification_id");

-- --------------------------------------------------------------------------
-- 3. Auto-update updated_at trigger
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_epas_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW."updated_at" = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "epas_updated_at" ON "external_preapproval_submissions";
CREATE TRIGGER "epas_updated_at"
  BEFORE UPDATE ON "external_preapproval_submissions"
  FOR EACH ROW EXECUTE FUNCTION update_epas_updated_at();

-- --------------------------------------------------------------------------
-- 4. RLS — service-role only (accessed via Supabase admin client)
-- --------------------------------------------------------------------------
ALTER TABLE "external_preapproval_submissions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "epas_service_role_bypass" ON "external_preapproval_submissions";
CREATE POLICY "epas_service_role_bypass"
  ON "external_preapproval_submissions" FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- --------------------------------------------------------------------------
-- 5. buyer-docs storage bucket (used by external-preapproval.service.ts)
-- --------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'buyer-docs',
  'buyer-docs',
  FALSE,
  26214400, -- 25 MB
  ARRAY['application/pdf','image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS — buyer-docs bucket
-- Note: This policy is on the global storage.objects table and uses bucket_id
-- filter for isolation. This is the standard Supabase pattern for storage policies.
DROP POLICY IF EXISTS "buyer-docs: service role all" ON storage.objects;
CREATE POLICY "buyer-docs: service role all"
  ON storage.objects FOR ALL
  USING     (bucket_id = 'buyer-docs' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'buyer-docs' AND auth.role() = 'service_role');
