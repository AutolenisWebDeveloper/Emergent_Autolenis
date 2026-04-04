-- ==========================================================================
-- Vehicle Request Ownership Backfill Migration
-- ==========================================================================
-- Purpose: Reconcile VehicleRequestCase.buyerId values that may contain
-- User.id instead of the canonical BuyerProfile.id.
--
-- Background: Prior to the ownership model fix, route handlers were passing
-- session.userId (User.id) as buyerId when creating VehicleRequestCase
-- records. The canonical ownership model uses BuyerProfile.id. This
-- migration detects and fixes mismatched records.
--
-- Safety: This migration is idempotent and safe to run multiple times.
-- It only updates records where buyerId matches a User.id that has a
-- corresponding BuyerProfile, and does NOT touch records where buyerId
-- already matches a BuyerProfile.id.
-- ==========================================================================

-- Step 1: Diagnostic — identify VehicleRequestCase records whose buyerId
-- does NOT match any BuyerProfile.id (these may contain User.id values).
-- Run this SELECT first to understand the scope of the problem.

-- DIAGNOSTIC QUERY: records with buyerId not in BuyerProfile.id
SELECT
  vrc.id AS case_id,
  vrc."buyerId" AS current_buyer_id,
  vrc.status,
  vrc."createdAt",
  bp_direct.id AS matching_profile_id,
  bp_via_user.id AS profile_via_user_id,
  CASE
    WHEN bp_direct.id IS NOT NULL THEN 'ALREADY_CORRECT'
    WHEN bp_via_user.id IS NOT NULL THEN 'FIXABLE_VIA_USER'
    ELSE 'ORPHANED'
  END AS diagnosis
FROM "VehicleRequestCase" vrc
LEFT JOIN "BuyerProfile" bp_direct ON bp_direct.id = vrc."buyerId"
LEFT JOIN "BuyerProfile" bp_via_user ON bp_via_user."userId" = vrc."buyerId"
ORDER BY vrc."createdAt" DESC;

-- Step 2: Backfill — update records where buyerId is a User.id to use
-- the corresponding BuyerProfile.id instead.
-- Only updates records where:
--   a) buyerId does NOT match any BuyerProfile.id (it's not already correct)
--   b) buyerId DOES match a User.id that has a BuyerProfile

UPDATE "VehicleRequestCase" vrc
SET "buyerId" = bp."id"
FROM "BuyerProfile" bp
WHERE bp."userId" = vrc."buyerId"
  AND NOT EXISTS (
    SELECT 1 FROM "BuyerProfile" bp2 WHERE bp2.id = vrc."buyerId"
  );

-- Step 3: Also fix DealerCoverageGapSignal records that may have the same issue
UPDATE "DealerCoverageGapSignal" dcgs
SET "buyerId" = bp."id"
FROM "BuyerProfile" bp
WHERE bp."userId" = dcgs."buyerId"
  AND NOT EXISTS (
    SELECT 1 FROM "BuyerProfile" bp2 WHERE bp2.id = dcgs."buyerId"
  );

-- Step 4: Also fix SourcedOffer.buyerId records that may have the same issue
-- SourcedOffer.buyerId is set from VehicleRequestCase.buyerId at offer creation
-- time, so it may also contain stale User.id values.
UPDATE "SourcedOffer" so
SET "buyerId" = bp."id"
FROM "BuyerProfile" bp
WHERE bp."userId" = so."buyerId"
  AND NOT EXISTS (
    SELECT 1 FROM "BuyerProfile" bp2 WHERE bp2.id = so."buyerId"
  );

-- ==========================================================================
-- Post-backfill verification queries
-- ==========================================================================

-- Step 5: Verify no orphaned VehicleRequestCase records remain
-- (buyerId matches neither a BuyerProfile.id nor a mappable User.id)
SELECT
  'VehicleRequestCase' AS model,
  vrc.id AS record_id,
  vrc."buyerId" AS orphan_buyer_id,
  vrc.status,
  vrc."createdAt"
FROM "VehicleRequestCase" vrc
WHERE NOT EXISTS (
  SELECT 1 FROM "BuyerProfile" bp WHERE bp.id = vrc."buyerId"
)
ORDER BY vrc."createdAt" DESC;

-- Step 6: Verify no orphaned DealerCoverageGapSignal records remain
SELECT
  'DealerCoverageGapSignal' AS model,
  dcgs.id AS record_id,
  dcgs."buyerId" AS orphan_buyer_id,
  dcgs."marketZip",
  dcgs."createdAt"
FROM "DealerCoverageGapSignal" dcgs
WHERE NOT EXISTS (
  SELECT 1 FROM "BuyerProfile" bp WHERE bp.id = dcgs."buyerId"
)
ORDER BY dcgs."createdAt" DESC;

-- Step 7: Verify no orphaned SourcedOffer records remain
SELECT
  'SourcedOffer' AS model,
  so.id AS record_id,
  so."buyerId" AS orphan_buyer_id,
  so."caseId",
  so."createdAt"
FROM "SourcedOffer" so
WHERE NOT EXISTS (
  SELECT 1 FROM "BuyerProfile" bp WHERE bp.id = so."buyerId"
)
ORDER BY so."createdAt" DESC;

-- Step 8: Workspace mismatch detection — request cases whose workspace
-- does not match the buyer profile's workspace
SELECT
  vrc.id AS case_id,
  vrc."workspaceId" AS case_workspace,
  bp."workspaceId" AS profile_workspace,
  vrc.status,
  vrc."createdAt"
FROM "VehicleRequestCase" vrc
JOIN "BuyerProfile" bp ON bp.id = vrc."buyerId"
WHERE vrc."workspaceId" IS DISTINCT FROM bp."workspaceId"
ORDER BY vrc."createdAt" DESC;

-- Step 9: Verify offers are linked to valid cases with correct ownership
SELECT
  so.id AS offer_id,
  so."buyerId" AS offer_buyer_id,
  vrc."buyerId" AS case_buyer_id,
  so."caseId",
  so.status AS offer_status
FROM "SourcedOffer" so
JOIN "VehicleRequestCase" vrc ON vrc.id = so."caseId"
WHERE so."buyerId" != vrc."buyerId"
ORDER BY so."createdAt" DESC;
