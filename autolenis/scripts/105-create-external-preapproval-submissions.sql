-- External Pre-Approval Submissions (Prompt 4 Canonical Backend)
-- Canonical table for buyer-uploaded pre-approval documents from external lenders.
-- Accessed via Supabase PostgREST (NOT Prisma). All columns are snake_case.
-- Related DB functions and views: buyer_qualification_active,
-- external_preapproval_set_status, external_preapproval_approve.

-- 1) Submissions table
CREATE TABLE IF NOT EXISTS external_preapproval_submissions (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  buyer_id                TEXT NOT NULL,
  workspace_id            TEXT,
  lender_name             TEXT NOT NULL,
  approved_amount         NUMERIC NOT NULL,
  max_otd_amount_cents    INTEGER,
  apr                     NUMERIC,       -- APR as a decimal (e.g., 5.25 for 5.25%)
  apr_bps                 INTEGER,       -- APR in basis points (e.g., 525 for 5.25%) — normalised for integer comparison
  term_months             INTEGER,
  min_monthly_payment_cents INTEGER,
  max_monthly_payment_cents INTEGER,
  dti_ratio_bps           INTEGER,       -- DTI ratio in basis points (e.g., 3600 for 36%)
  expires_at              TIMESTAMPTZ,
  submission_notes        TEXT,

  -- Document storage (private bucket, random filename)
  storage_bucket          TEXT,
  document_storage_path   TEXT,
  original_file_name      TEXT,
  file_size_bytes         INTEGER,
  mime_type               TEXT,
  sha256                  TEXT,

  -- Review workflow
  status                  TEXT NOT NULL DEFAULT 'SUBMITTED',
  reviewed_by             TEXT,
  reviewed_at             TIMESTAMPTZ,
  decision_at             TIMESTAMPTZ,
  review_notes            TEXT,
  rejection_reason        TEXT,
  rejection_reason_code   TEXT,
  superseded_by_id        TEXT,
  prequalification_id     TEXT,

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),

  -- Storage integrity constraint: bucket and path must be both set or both null
  CONSTRAINT chk_storage_pair CHECK (
    (storage_bucket IS NULL AND document_storage_path IS NULL) OR
    (storage_bucket IS NOT NULL AND document_storage_path IS NOT NULL)
  ),
  -- Status must be one of the canonical values
  CONSTRAINT chk_status CHECK (
    status IN ('SUBMITTED','IN_REVIEW','APPROVED','REJECTED','EXPIRED','SUPERSEDED')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_epas_buyer      ON external_preapproval_submissions (buyer_id);
CREATE INDEX IF NOT EXISTS idx_epas_workspace  ON external_preapproval_submissions (workspace_id);
CREATE INDEX IF NOT EXISTS idx_epas_status     ON external_preapproval_submissions (status);
CREATE INDEX IF NOT EXISTS idx_epas_prequal    ON external_preapproval_submissions (prequalification_id);
CREATE INDEX IF NOT EXISTS idx_epas_created    ON external_preapproval_submissions (created_at DESC);

-- RLS: service-role only (accessed via admin Supabase client)
ALTER TABLE external_preapproval_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "epas_service_role_all"
  ON external_preapproval_submissions
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- 2) Status history table (audit trail for status transitions)
CREATE TABLE IF NOT EXISTS external_preapproval_status_history (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  submission_id   TEXT NOT NULL REFERENCES external_preapproval_submissions(id),
  old_status      TEXT,
  new_status      TEXT NOT NULL,
  changed_by      TEXT,
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epash_submission
  ON external_preapproval_status_history (submission_id);

ALTER TABLE external_preapproval_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "epash_service_role_all"
  ON external_preapproval_status_history
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- 3) Documents table (file metadata for uploaded pre-approval documents)
CREATE TABLE IF NOT EXISTS external_preapproval_documents (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  submission_id   TEXT NOT NULL REFERENCES external_preapproval_submissions(id),
  storage_bucket  TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  original_name   TEXT,
  file_size_bytes INTEGER,
  mime_type       TEXT,
  sha256          TEXT,
  uploaded_by     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epad_submission
  ON external_preapproval_documents (submission_id);

ALTER TABLE external_preapproval_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "epad_service_role_all"
  ON external_preapproval_documents
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- 4) Status transition function
CREATE OR REPLACE FUNCTION external_preapproval_set_status(
  p_submission_id TEXT,
  p_new_status    TEXT,
  p_changed_by    TEXT DEFAULT NULL,
  p_reason        TEXT DEFAULT NULL,
  p_review_notes  TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL,
  p_rejection_reason_code TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status TEXT;
BEGIN
  SELECT status INTO v_old_status
    FROM external_preapproval_submissions
   WHERE id = p_submission_id;

  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'Submission % not found', p_submission_id;
  END IF;

  -- Record history
  INSERT INTO external_preapproval_status_history
    (submission_id, old_status, new_status, changed_by, reason)
  VALUES
    (p_submission_id, v_old_status, p_new_status, p_changed_by, p_reason);

  -- Update submission
  UPDATE external_preapproval_submissions
     SET status              = p_new_status,
         reviewed_by         = COALESCE(p_changed_by, reviewed_by),
         reviewed_at         = COALESCE(reviewed_at, NOW()),
         decision_at         = NOW(),
         review_notes        = COALESCE(p_review_notes, review_notes),
         rejection_reason    = COALESCE(p_rejection_reason, rejection_reason),
         rejection_reason_code = COALESCE(p_rejection_reason_code, rejection_reason_code),
         updated_at          = NOW()
   WHERE id = p_submission_id;
END;
$$;

-- 5) Approve function — transitions status, creates PreQualification record
CREATE OR REPLACE FUNCTION external_preapproval_approve(
  p_submission_id           TEXT,
  p_admin_user_id           TEXT,
  p_review_notes            TEXT DEFAULT NULL,
  p_credit_tier_override    TEXT DEFAULT NULL,
  p_approved_amount_override NUMERIC DEFAULT NULL,
  p_max_monthly_override    INTEGER DEFAULT NULL,
  p_expiry_days             INTEGER DEFAULT 90
)
RETURNS TABLE(prequal_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub RECORD;
  v_prequal_id TEXT;
  v_approved_amount NUMERIC;
  v_credit_tier TEXT;
BEGIN
  SELECT * INTO v_sub
    FROM external_preapproval_submissions
   WHERE id = p_submission_id;

  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'Submission % not found', p_submission_id;
  END IF;

  IF v_sub.status NOT IN ('SUBMITTED', 'IN_REVIEW') THEN
    RAISE EXCEPTION 'Cannot approve submission in status %', v_sub.status;
  END IF;

  v_approved_amount := COALESCE(p_approved_amount_override, v_sub.approved_amount);
  v_credit_tier := COALESCE(p_credit_tier_override, 'GOOD');
  v_prequal_id := gen_random_uuid()::text;

  -- Create PreQualification record
  INSERT INTO "PreQualification" (
    id, "buyerId", "workspaceId", status, "creditTier",
    "maxOtd", "estimatedMonthlyMin", "estimatedMonthlyMax",
    "maxOtdAmountCents", "minMonthlyPaymentCents", "maxMonthlyPaymentCents",
    source, "externalSubmissionId", "providerName",
    "softPullCompleted", "consentGiven",
    "expiresAt", "createdAt", "updatedAt"
  ) VALUES (
    v_prequal_id,
    v_sub.buyer_id,
    v_sub.workspace_id,
    'ACTIVE',
    -- "CreditTier" and "PreQualSource" are Prisma-managed PostgreSQL enums
    -- defined in prisma/schema.prisma and created by `prisma db push`.
    v_credit_tier::"CreditTier",
    v_approved_amount,
    COALESCE(v_sub.min_monthly_payment_cents, 0)::numeric / 100,
    COALESCE(p_max_monthly_override, v_sub.max_monthly_payment_cents, 0)::numeric / 100,
    ROUND(v_approved_amount * 100)::integer,
    v_sub.min_monthly_payment_cents,
    COALESCE(p_max_monthly_override, v_sub.max_monthly_payment_cents),
    'EXTERNAL_MANUAL'::"PreQualSource",
    p_submission_id,
    'External Verified: ' || v_sub.lender_name,
    false,
    true,
    NOW() + (p_expiry_days || ' days')::interval,
    NOW(),
    NOW()
  );

  -- Transition submission status
  PERFORM external_preapproval_set_status(
    p_submission_id, 'APPROVED', p_admin_user_id, p_review_notes
  );

  -- Link the PreQualification back to the submission
  UPDATE external_preapproval_submissions
     SET prequalification_id = v_prequal_id,
         updated_at = NOW()
   WHERE id = p_submission_id;

  RETURN QUERY SELECT v_prequal_id;
END;
$$;
