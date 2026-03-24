-- ==========================================================================
-- Platform RLS Hardening — Standardized Role Functions
--
-- Creates canonical role-check functions for consistent RLS enforcement:
--   is_super_admin()     — SUPER_ADMIN only
--   is_compliance_admin() — COMPLIANCE_ADMIN or SUPER_ADMIN
--
-- Confirms and documents the RLS posture for all four platform tables:
--   platform_decisions, platform_events, trusted_documents, identity_trust_records
--
-- These tables are accessed exclusively via Prisma (service_role), so the
-- RLS policies intentionally block all anon/authenticated access.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Standardized role-check helper functions
-- --------------------------------------------------------------------------

-- is_super_admin(): Returns true if the JWT role claim is SUPER_ADMIN
CREATE OR REPLACE FUNCTION auth.is_super_admin() RETURNS boolean AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role') = 'SUPER_ADMIN',
    false
  );
$$ LANGUAGE SQL STABLE;

-- is_compliance_admin(): Returns true if JWT role is COMPLIANCE_ADMIN or SUPER_ADMIN
CREATE OR REPLACE FUNCTION auth.is_compliance_admin() RETURNS boolean AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role') IN ('COMPLIANCE_ADMIN', 'SUPER_ADMIN'),
    false
  );
$$ LANGUAGE SQL STABLE;

-- --------------------------------------------------------------------------
-- 2. Remove redundant legacy policy (if it was ever created)
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "platform_events_admin_read" ON "platform_events";

-- --------------------------------------------------------------------------
-- 3. Confirm platform table RLS posture
--
-- All four tables use service-only policies (USING false / WITH CHECK false).
-- This is intentional: these tables are accessed exclusively through Prisma
-- using the service_role, which bypasses RLS entirely. The policies ensure
-- that no anon or authenticated Supabase client can read or write directly.
--
-- Existing policies (from 100-core-platform-systems.sql):
--   platform_decisions_service_only  → FOR ALL USING(false) WITH CHECK(false)
--   platform_events_service_only     → FOR ALL USING(false) WITH CHECK(false)
--   trusted_documents_service_only   → FOR ALL USING(false) WITH CHECK(false)
--   identity_trust_service_only      → FOR ALL USING(false) WITH CHECK(false)
-- --------------------------------------------------------------------------

-- No policy changes needed — service-only posture is correct for Prisma access.

-- --------------------------------------------------------------------------
-- 4. trusted_documents mutability rules
--
-- Current mutable statuses: UPLOADED, SCANNED (can transition to VERIFIED,
-- APPROVED, SUPERSEDED, REVOKED, EXPIRED).
--
-- Immutable statuses: APPROVED, LOCKED — once a document reaches these
-- states, it should only transition to SUPERSEDED (by a new version) or
-- REVOKED (admin action with reason). The document-trust.ts service layer
-- enforces this via version control (supersession chain) and the
-- verifyDocument/revokeDocument functions.
--
-- This behavior is intentional and safe: the service layer governs
-- all state transitions, and the RLS policy prevents direct writes.
-- --------------------------------------------------------------------------

-- --------------------------------------------------------------------------
-- 5. Inventory trigger attribution
--
-- No inventory_history trigger exists in the platform. Inventory mutations
-- are handled through the service layer (Prisma) with explicit actor
-- attribution. auth.uid() is not used for inventory writes.
-- --------------------------------------------------------------------------
