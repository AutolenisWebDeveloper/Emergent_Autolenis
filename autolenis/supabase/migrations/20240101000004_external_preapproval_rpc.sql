-- BLOCKER 2 FIX: External Pre-Approval Tables and RPC Functions
--
-- The service (lib/services/external-preapproval.service.ts) calls:
--   supabase.rpc("external_preapproval_approve", {...})
--   supabase.rpc("external_preapproval_set_status", {...})
--
-- Neither function was deployed to Supabase. Every admin approval silently
-- returned null, the PreQualification was never created, and buyers were
-- emailed "approved" but blocked from creating auctions with PREQUAL_REQUIRED.
--
-- This migration creates the canonical tables and both RPC functions.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.external_preapproval_submissions (
  id                      text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  buyer_id                text        NOT NULL,
  workspace_id            text,
  lender_name             text        NOT NULL,
  approved_amount         numeric     NOT NULL CHECK (approved_amount > 0),
  max_otd_amount_cents    bigint,
  apr                     numeric,
  apr_bps                 integer,
  term_months             integer,
  min_monthly_payment_cents bigint,
  max_monthly_payment_cents bigint,
  dti_ratio_bps           integer,
  expires_at              timestamptz,
  submission_notes        text,
  storage_bucket          text,
  document_storage_path   text,
  original_file_name      text,
  file_size_bytes         bigint,
  mime_type               text,
  sha256                  text,
  status                  text        NOT NULL DEFAULT 'SUBMITTED'
                            CHECK (status IN ('SUBMITTED','IN_REVIEW','APPROVED','REJECTED','EXPIRED','SUPERSEDED')),
  reviewed_by             text,
  reviewed_at             timestamptz,
  decision_at             timestamptz,
  review_notes            text,
  rejection_reason        text,
  rejection_reason_code   text,
  superseded_by_id        text        REFERENCES public.external_preapproval_submissions(id),
  prequalification_id     text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  -- storage columns must be both null or both set
  CONSTRAINT storage_pair CHECK (
    (storage_bucket IS NULL) = (document_storage_path IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS ext_preapproval_buyer_idx  ON public.external_preapproval_submissions (buyer_id);
CREATE INDEX IF NOT EXISTS ext_preapproval_status_idx ON public.external_preapproval_submissions (status);
CREATE INDEX IF NOT EXISTS ext_preapproval_ws_idx     ON public.external_preapproval_submissions (workspace_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.external_preapproval_status_history (
  id             text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  submission_id  text        NOT NULL REFERENCES public.external_preapproval_submissions(id) ON DELETE CASCADE,
  old_status     text,
  new_status     text        NOT NULL,
  changed_by     text,
  reason         text,
  review_notes   text,
  rejection_reason text,
  rejection_reason_code text,
  changed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ext_preapproval_history_sub_idx ON public.external_preapproval_status_history (submission_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.external_preapproval_documents (
  id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  submission_id   text        NOT NULL REFERENCES public.external_preapproval_submissions(id) ON DELETE CASCADE,
  storage_bucket  text        NOT NULL,
  storage_path    text        NOT NULL,
  original_name   text,
  file_size_bytes bigint,
  mime_type       text,
  sha256          text,
  uploaded_by     text,
  uploaded_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ext_preapproval_docs_sub_idx ON public.external_preapproval_documents (submission_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: external_preapproval_set_status
--
-- Validates the status transition using the allowed-transitions table, updates
-- the submission, and appends a history record.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.external_preapproval_set_status(
  p_submission_id       text,
  p_new_status          text,
  p_changed_by          text       DEFAULT NULL,
  p_reason              text       DEFAULT NULL,
  p_review_notes        text       DEFAULT NULL,
  p_rejection_reason    text       DEFAULT NULL,
  p_rejection_reason_code text     DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status text;
  v_allowed    text[] := ARRAY[]::text[];
BEGIN
  -- Load current status and lock the row
  SELECT status INTO v_old_status
  FROM public.external_preapproval_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission % not found', p_submission_id;
  END IF;

  -- Validate transition
  v_allowed := CASE v_old_status
    WHEN 'SUBMITTED'  THEN ARRAY['IN_REVIEW','APPROVED','REJECTED','SUPERSEDED']
    WHEN 'IN_REVIEW'  THEN ARRAY['APPROVED','REJECTED']
    WHEN 'APPROVED'   THEN ARRAY['EXPIRED','SUPERSEDED']
    ELSE ARRAY[]::text[]
  END;

  IF NOT (p_new_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid status transition % → % for submission %',
      v_old_status, p_new_status, p_submission_id;
  END IF;

  -- Apply the transition
  UPDATE public.external_preapproval_submissions
  SET
    status              = p_new_status,
    reviewed_by         = COALESCE(p_changed_by, reviewed_by),
    reviewed_at         = CASE WHEN reviewed_at IS NULL THEN now() ELSE reviewed_at END,
    decision_at         = now(),
    review_notes        = COALESCE(p_review_notes, review_notes),
    rejection_reason    = COALESCE(p_rejection_reason, rejection_reason),
    rejection_reason_code = COALESCE(p_rejection_reason_code, rejection_reason_code),
    updated_at          = now()
  WHERE id = p_submission_id;

  -- Append history record
  INSERT INTO public.external_preapproval_status_history
    (submission_id, old_status, new_status, changed_by, reason, review_notes,
     rejection_reason, rejection_reason_code)
  VALUES
    (p_submission_id, v_old_status, p_new_status, p_changed_by, p_reason,
     p_review_notes, p_rejection_reason, p_rejection_reason_code);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: external_preapproval_approve
--
-- Transitions status to APPROVED, creates a PreQualification record from the
-- submission's financial data (respecting any admin overrides), links the two,
-- and returns [{prequal_id}] so the caller can fetch the full record.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.external_preapproval_approve(
  p_submission_id           text,
  p_admin_user_id           text       DEFAULT NULL,
  p_review_notes            text       DEFAULT NULL,
  p_credit_tier_override    text       DEFAULT NULL,
  p_approved_amount_override numeric   DEFAULT NULL,
  p_max_monthly_override    bigint     DEFAULT NULL,
  p_expiry_days             integer    DEFAULT 90
)
RETURNS TABLE (prequal_id text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub           public.external_preapproval_submissions%ROWTYPE;
  v_prequal_id    text;
  v_max_otd       numeric;
  v_max_monthly   bigint;
  v_credit_tier   text;
  v_expires_at    timestamptz;
  v_workspace_id  text;
BEGIN
  -- Lock submission row
  SELECT * INTO v_sub
  FROM public.external_preapproval_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission % not found', p_submission_id;
  END IF;

  IF v_sub.status NOT IN ('SUBMITTED', 'IN_REVIEW') THEN
    RAISE EXCEPTION 'Cannot approve submission in status %', v_sub.status;
  END IF;

  -- Resolve effective financial values (admin overrides take precedence)
  v_max_otd     := COALESCE(p_approved_amount_override, v_sub.approved_amount);
  v_max_monthly := COALESCE(p_max_monthly_override, v_sub.max_monthly_payment_cents);
  v_credit_tier := COALESCE(p_credit_tier_override, 'STANDARD');
  v_expires_at  := now() + (p_expiry_days || ' days')::interval;

  -- Resolve workspace from buyer if not set on submission
  v_workspace_id := v_sub.workspace_id;
  IF v_workspace_id IS NULL THEN
    SELECT "workspaceId" INTO v_workspace_id
    FROM public."BuyerProfile"
    WHERE id = v_sub.buyer_id
    LIMIT 1;
  END IF;

  -- Create the PreQualification record
  INSERT INTO public."PreQualification" (
    id, "buyerId", "workspaceId", status, "creditTier",
    "maxOtd", "maxOtdAmountCents", "maxMonthlyPaymentCents",
    "estimatedMonthlyMin", "estimatedMonthlyMax",
    source, "externalSubmissionId", "providerName", "expiresAt",
    "createdAt", "updatedAt"
  ) VALUES (
    gen_random_uuid()::text,
    v_sub.buyer_id,
    v_workspace_id,
    'ACTIVE',
    v_credit_tier,
    v_max_otd,
    (v_max_otd * 100)::bigint,
    v_max_monthly,
    0,  -- estimatedMonthlyMin: no lower bound from external approval
    -- estimatedMonthlyMax: convert cents→dollars; fall back to OTD/60mo estimate
    COALESCE(v_max_monthly::float / 100.0, v_max_otd::float / 60.0),
    'EXTERNAL_MANUAL',
    p_submission_id,
    'External Verified: ' || v_sub.lender_name,
    v_expires_at,
    now(),
    now()
  )
  ON CONFLICT ("buyerId") DO UPDATE SET
    status                  = 'ACTIVE',
    "creditTier"            = v_credit_tier,
    "maxOtd"                = v_max_otd,
    "maxOtdAmountCents"     = (v_max_otd * 100)::bigint,
    "maxMonthlyPaymentCents" = v_max_monthly,
    source                  = 'EXTERNAL_MANUAL',
    "externalSubmissionId"  = p_submission_id,
    "providerName"          = 'External Verified: ' || v_sub.lender_name,
    "expiresAt"             = v_expires_at,
    "updatedAt"             = now()
  RETURNING id INTO v_prequal_id;

  -- Update submission: mark approved, link to prequal
  UPDATE public.external_preapproval_submissions
  SET
    status              = 'APPROVED',
    reviewed_by         = p_admin_user_id,
    reviewed_at         = now(),
    decision_at         = now(),
    review_notes        = p_review_notes,
    prequalification_id = v_prequal_id,
    updated_at          = now()
  WHERE id = p_submission_id;

  -- Append history record
  INSERT INTO public.external_preapproval_status_history
    (submission_id, old_status, new_status, changed_by, review_notes)
  VALUES
    (p_submission_id, v_sub.status, 'APPROVED', p_admin_user_id, p_review_notes);

  RETURN QUERY SELECT v_prequal_id;
END;
$$;

-- Grant execute to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.external_preapproval_set_status TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.external_preapproval_approve    TO authenticated, service_role;

-- RLS on the new tables
ALTER TABLE public.external_preapproval_submissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_preapproval_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_preapproval_documents     ENABLE ROW LEVEL SECURITY;

-- DROP IF EXISTS before each CREATE so this migration is idempotent on retries.

-- Buyers can view their own submissions
DROP POLICY IF EXISTS "Buyers can view their own submissions" ON public.external_preapproval_submissions;
CREATE POLICY "Buyers can view their own submissions"
  ON public.external_preapproval_submissions FOR SELECT
  USING (
    buyer_id IN (
      SELECT id FROM public."BuyerProfile"
      WHERE "userId" = public.current_user_id()
    )
    OR public.is_admin()
  );

-- Only service_role / admins can write
DROP POLICY IF EXISTS "Service role manages submissions" ON public.external_preapproval_submissions;
CREATE POLICY "Service role manages submissions"
  ON public.external_preapproval_submissions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Service role manages history" ON public.external_preapproval_status_history;
CREATE POLICY "Service role manages history"
  ON public.external_preapproval_status_history FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Buyers can view their own documents" ON public.external_preapproval_documents;
CREATE POLICY "Buyers can view their own documents"
  ON public.external_preapproval_documents FOR SELECT
  USING (
    submission_id IN (
      SELECT id FROM public.external_preapproval_submissions
      WHERE buyer_id IN (
        SELECT id FROM public."BuyerProfile"
        WHERE "userId" = public.current_user_id()
      )
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Service role manages documents" ON public.external_preapproval_documents;
CREATE POLICY "Service role manages documents"
  ON public.external_preapproval_documents FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
