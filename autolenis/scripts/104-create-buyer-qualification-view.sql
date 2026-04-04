-- Unified buyer qualification view
-- Combines active PreQualification records and approved external_preapproval_submissions
-- records into a single view for the buyer prequal API route.
-- Column names are snake_case for consistency with other SQL-created views.

CREATE OR REPLACE VIEW buyer_qualification_active AS
SELECT
  pq."buyerId"                   AS buyer_id,
  pq."id"                        AS qualification_id,
  pq."status"                    AS qualification_status,
  pq."creditTier"::text          AS credit_tier,
  pq."maxOtdAmountCents"         AS max_otd_amount_cents,
  pq."minMonthlyPaymentCents"    AS min_monthly_payment_cents,
  pq."maxMonthlyPaymentCents"    AS max_monthly_payment_cents,
  COALESCE(pq."dtiRatio", pq."dti") AS dti_ratio,
  pq."expiresAt"                 AS expires_at,
  pq."providerName"              AS provider_name,
  pq."source"::text              AS qualification_source,
  pq."createdAt"                 AS created_at,
  CASE
    WHEN pq."status" = 'ACTIVE' AND pq."expiresAt" > NOW() THEN true
    ELSE false
  END                            AS is_active
FROM "PreQualification" pq

UNION ALL

SELECT
  eps.buyer_id                   AS buyer_id,
  eps.id                         AS qualification_id,
  eps.status                     AS qualification_status,
  NULL                           AS credit_tier,
  eps.max_otd_amount_cents       AS max_otd_amount_cents,
  eps.min_monthly_payment_cents  AS min_monthly_payment_cents,
  eps.max_monthly_payment_cents  AS max_monthly_payment_cents,
  CASE
    WHEN eps.dti_ratio_bps IS NOT NULL
    THEN eps.dti_ratio_bps::numeric / 100
    ELSE NULL
  END                            AS dti_ratio,
  eps.expires_at                 AS expires_at,
  eps.lender_name                AS provider_name,
  'EXTERNAL_MANUAL'              AS qualification_source,
  eps.created_at                 AS created_at,
  CASE
    WHEN eps.status = 'APPROVED'
         AND (eps.expires_at IS NULL OR eps.expires_at > NOW())
    THEN true
    ELSE false
  END                            AS is_active
FROM external_preapproval_submissions eps
WHERE eps.status = 'APPROVED';
