-- ==========================================================================
-- Buyer Qualification Active View
--
-- Creates the buyer_qualification_active view expected by
-- app/api/buyer/prequal/route.ts — maps PreQualification table to the
-- snake_case column names used by the API route.
--
-- Idempotent — safe to re-run.
-- ==========================================================================

CREATE OR REPLACE VIEW public.buyer_qualification_active AS
SELECT
  pq."id"                       AS qualification_id,
  pq."buyerId"                  AS buyer_id,
  pq."workspaceId"              AS workspace_id,
  pq."status"                   AS qualification_status,
  pq."creditTier"               AS credit_tier,
  pq."maxOtdAmountCents"        AS max_otd_amount_cents,
  pq."minMonthlyPaymentCents"   AS min_monthly_payment_cents,
  pq."maxMonthlyPaymentCents"   AS max_monthly_payment_cents,
  -- dtiRatio is the canonical field; dti is a legacy alias kept for migration compatibility
  COALESCE(pq."dtiRatio", pq."dti") AS dti_ratio,
  pq."expiresAt"                AS expires_at,
  pq."providerName"             AS provider_name,
  pq."source"::text             AS qualification_source,
  pq."createdAt"                AS created_at,
  pq."updatedAt"                AS updated_at,
  CASE
    WHEN pq."expiresAt" IS NULL THEN true
    WHEN pq."expiresAt" > NOW() THEN true
    ELSE false
  END                           AS is_active
FROM "PreQualification" pq;
