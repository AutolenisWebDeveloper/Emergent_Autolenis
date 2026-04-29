-- ==========================================================================
-- Fix buyer_qualification_active view
--
-- The 20260328000100_reconcile_runtime_compat migration replaced this view
-- with a stripped-down version that omits columns required by
-- app/api/buyer/prequal/route.ts:
--   qualification_id, qualification_status, credit_tier, expires_at,
--   provider_name, qualification_source, is_active, min_monthly_payment_cents,
--   dti_ratio
--
-- This migration restores the canonical view used by the prequal API.
-- Idempotent — safe to re-run.
-- ==========================================================================

CREATE OR REPLACE VIEW public.buyer_qualification_active AS

-- Internal AutoLenis prequalifications
SELECT
  pq."id"                                     AS qualification_id,
  pq."buyerId"                                AS buyer_id,
  pq."workspaceId"                            AS workspace_id,
  pq."status"                                 AS qualification_status,
  pq."creditTier"::text                       AS credit_tier,
  pq."maxOtdAmountCents"                      AS max_otd_amount_cents,
  pq."minMonthlyPaymentCents"                 AS min_monthly_payment_cents,
  pq."maxMonthlyPaymentCents"                 AS max_monthly_payment_cents,
  COALESCE(pq."dtiRatio", pq."dti")           AS dti_ratio,
  pq."expiresAt"                              AS expires_at,
  pq."providerName"                           AS provider_name,
  pq."source"::text                           AS qualification_source,
  pq."createdAt"                              AS created_at,
  pq."updatedAt"                              AS updated_at,
  CASE
    WHEN pq."status" = 'ACTIVE'
         AND (pq."expiresAt" IS NULL OR pq."expiresAt" > NOW())
    THEN true
    ELSE false
  END                                         AS is_active

FROM public."PreQualification" pq

UNION ALL

-- Externally verified lender pre-approvals
SELECT
  eps.id                                      AS qualification_id,
  eps.buyer_id                                AS buyer_id,
  NULL                                        AS workspace_id,
  eps.status                                  AS qualification_status,
  NULL                                        AS credit_tier,
  eps.max_otd_amount_cents                    AS max_otd_amount_cents,
  eps.min_monthly_payment_cents               AS min_monthly_payment_cents,
  eps.max_monthly_payment_cents               AS max_monthly_payment_cents,
  CASE
    WHEN eps.dti_ratio_bps IS NOT NULL
    THEN eps.dti_ratio_bps::numeric / 100
    ELSE NULL
  END                                         AS dti_ratio,
  eps.expires_at                              AS expires_at,
  eps.lender_name                             AS provider_name,
  'EXTERNAL_MANUAL'                           AS qualification_source,
  eps.created_at                              AS created_at,
  eps.updated_at                              AS updated_at,
  CASE
    WHEN eps.status = 'APPROVED'
         AND (eps.expires_at IS NULL OR eps.expires_at > NOW())
    THEN true
    ELSE false
  END                                         AS is_active

FROM public.external_preapproval_submissions eps
WHERE eps.status = 'APPROVED';
