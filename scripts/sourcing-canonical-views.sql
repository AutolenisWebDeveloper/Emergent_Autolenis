-- ---------------------------------------------------------------------------
-- Sourcing Canonical Views — Prompt 5 Alignment Reference
-- ---------------------------------------------------------------------------
-- This file defines Supabase views that map the Prompt 5 canonical names
-- to the existing Prisma-managed physical tables.
--
-- These views are NOT a migration. They are a reference for how to create
-- Supabase-accessible aliases if needed for RPC functions or policies.
--
-- The authoritative mapping is in lib/services/sourcing.service.ts (SOURCING_TABLES).
-- ---------------------------------------------------------------------------

-- sourcing_cases → VehicleRequestCase
CREATE OR REPLACE VIEW public.sourcing_cases AS
SELECT
  id,
  "buyerId"        AS buyer_id,
  "workspaceId"    AS workspace_id,
  status,
  "adminSubStatus" AS admin_sub_status,
  "assignedAdminId" AS assigned_admin_id,
  "marketZip"      AS market_zip,
  "radiusMiles"    AS radius_miles,
  "prequalSnapshotJson" AS prequal_snapshot,
  "submittedAt"    AS submitted_at,
  "firstOfferAt"   AS first_offer_at,
  "buyerResponseAt" AS buyer_response_at,
  "lockedAt"       AS locked_at,
  "createdAt"      AS created_at,
  "updatedAt"      AS updated_at
FROM "VehicleRequestCase";

-- sourcing_dealer_outreach → SourcingOutreachLog
CREATE OR REPLACE VIEW public.sourcing_dealer_outreach AS
SELECT
  id,
  "caseId"       AS case_id,
  "adminUserId"  AS admin_user_id,
  "dealerName"   AS dealer_name,
  "contactMethod" AS contact_method,
  outcome,
  "occurredAt"   AS occurred_at,
  notes,
  "createdAt"    AS created_at
FROM "SourcingOutreachLog";

-- sourced_offers → SourcedOffer
CREATE OR REPLACE VIEW public.sourced_offers AS
SELECT
  id,
  "caseId"              AS case_id,
  "buyerId"             AS buyer_id,
  "workspaceId"         AS workspace_id,
  "sourceType"          AS source_type,
  "dealerId"            AS dealer_id,
  "sourceDealerName"    AS source_dealer_name,
  "sourceDealerEmail"   AS source_dealer_email,
  "sourceDealerPhone"   AS source_dealer_phone,
  vin,
  year,
  make,
  "modelName"           AS model_name,
  trim,
  mileage,
  condition,
  "pricingBreakdownJson" AS pricing_breakdown,
  "paymentTermsJson"    AS payment_terms,
  "expiresAt"           AS expires_at,
  status,
  "presentedToBuyerAt"  AS presented_to_buyer_at,
  "acceptedAt"          AS accepted_at,
  "createdAt"           AS created_at,
  "updatedAt"           AS updated_at
FROM "SourcedOffer";

-- sourced_dealer_invitations → DealerInvite
CREATE OR REPLACE VIEW public.sourced_dealer_invitations AS
SELECT
  id,
  "caseId"          AS case_id,
  "offerId"         AS offer_id,
  "tokenHash"       AS token_hash,
  "tokenExpiresAt"  AS token_expires_at,
  "dealerEmail"     AS dealer_email,
  "dealerName"      AS dealer_name,
  status,
  "claimedAt"       AS claimed_at,
  "completedAt"     AS completed_at,
  "createdAt"       AS created_at,
  "updatedAt"       AS updated_at
FROM "DealerInvite";

-- network_coverage_events → DealerCoverageGapSignal
CREATE OR REPLACE VIEW public.network_coverage_events AS
SELECT
  id,
  "buyerId"      AS buyer_id,
  "workspaceId"  AS workspace_id,
  "marketZip"    AS market_zip,
  "radiusMiles"  AS radius_miles,
  "reasonCode"   AS reason_code,
  "createdAt"    AS created_at
FROM "DealerCoverageGapSignal";

-- sourcing_audit_log → CaseEventLog
CREATE OR REPLACE VIEW public.sourcing_audit_log AS
SELECT
  id,
  "caseId"       AS case_id,
  "actorUserId"  AS actor_user_id,
  "actorRole"    AS actor_role,
  action,
  "beforeValue"  AS before_value,
  "afterValue"   AS after_value,
  notes,
  "createdAt"    AS created_at
FROM "CaseEventLog";

-- sourcing_events_outbox — reserved for future async event processing
-- CREATE TABLE IF NOT EXISTS public.sourcing_events_outbox (
--   id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   event_type  text NOT NULL,
--   payload     jsonb NOT NULL,
--   created_at  timestamptz NOT NULL DEFAULT now(),
--   processed_at timestamptz,
--   attempts    int NOT NULL DEFAULT 0
-- );

-- log_coverage_from_request() — mapped to SourcingService.checkDealerCoverage()
-- This is implemented in TypeScript, not as a database function.
-- See lib/services/sourcing.service.ts :: checkDealerCoverage()
