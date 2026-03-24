-- ==========================================================================
-- Core Platform Systems — Schema & RLS
--
-- Creates the platform_decisions, platform_events, trusted_documents,
-- and identity_trust_records tables with appropriate indexes and
-- row-level security policies.
--
-- These tables are managed by Prisma (@@map annotations) but the RLS
-- policies and any Supabase-specific extensions are managed here.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. platform_decisions  (DecisionAuditLog)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "platform_decisions" (
  "id"              TEXT PRIMARY KEY,
  "workspaceId"     TEXT,
  "entityType"      TEXT NOT NULL,
  "entityId"        TEXT NOT NULL,
  "correlationId"   TEXT NOT NULL,
  "actorId"         TEXT,
  "actorType"       TEXT,
  "inputBasis"      JSONB NOT NULL DEFAULT '{}',
  "outputResult"    JSONB NOT NULL DEFAULT '{}',
  "reasonCodes"     TEXT[] NOT NULL DEFAULT '{}',
  "resolvedAt"      TIMESTAMPTZ NOT NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "platform_decisions_workspace_idx"
  ON "platform_decisions" ("workspaceId");
CREATE INDEX IF NOT EXISTS "platform_decisions_entity_idx"
  ON "platform_decisions" ("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "platform_decisions_correlation_idx"
  ON "platform_decisions" ("correlationId");
CREATE INDEX IF NOT EXISTS "platform_decisions_actor_idx"
  ON "platform_decisions" ("actorId");
CREATE INDEX IF NOT EXISTS "platform_decisions_resolved_idx"
  ON "platform_decisions" ("resolvedAt");
CREATE INDEX IF NOT EXISTS "platform_decisions_created_idx"
  ON "platform_decisions" ("createdAt");

-- RLS: admin/service-only — no direct user access
ALTER TABLE "platform_decisions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_decisions_service_only"
  ON "platform_decisions"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- --------------------------------------------------------------------------
-- 2. platform_events  (PlatformEvent)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "platform_events" (
  "id"                TEXT PRIMARY KEY,
  "eventType"         TEXT NOT NULL,
  "eventVersion"      INT NOT NULL DEFAULT 1,
  "entityType"        TEXT NOT NULL,
  "entityId"          TEXT NOT NULL,
  "parentEntityId"    TEXT,
  "workspaceId"       TEXT,
  "actorId"           TEXT NOT NULL,
  "actorType"         TEXT NOT NULL,
  "sourceModule"      TEXT NOT NULL,
  "correlationId"     TEXT NOT NULL,
  "idempotencyKey"    TEXT UNIQUE,
  "payload"           JSONB NOT NULL DEFAULT '{}',
  "processingStatus"  TEXT NOT NULL DEFAULT 'RECORDED',
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "platform_events_type_idx"
  ON "platform_events" ("eventType");
CREATE INDEX IF NOT EXISTS "platform_events_entity_idx"
  ON "platform_events" ("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "platform_events_parent_idx"
  ON "platform_events" ("parentEntityId");
CREATE INDEX IF NOT EXISTS "platform_events_workspace_idx"
  ON "platform_events" ("workspaceId");
CREATE INDEX IF NOT EXISTS "platform_events_actor_idx"
  ON "platform_events" ("actorId");
CREATE INDEX IF NOT EXISTS "platform_events_correlation_idx"
  ON "platform_events" ("correlationId");
CREATE INDEX IF NOT EXISTS "platform_events_status_idx"
  ON "platform_events" ("processingStatus");
CREATE INDEX IF NOT EXISTS "platform_events_created_idx"
  ON "platform_events" ("createdAt");

-- RLS: admin/service-only — no direct user access
ALTER TABLE "platform_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_events_service_only"
  ON "platform_events"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- --------------------------------------------------------------------------
-- 3. trusted_documents  (DocumentTrustRecord)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "trusted_documents" (
  "id"                      TEXT PRIMARY KEY,
  "ownerEntityId"           TEXT NOT NULL,
  "ownerEntityType"         TEXT NOT NULL,
  "documentType"            TEXT NOT NULL,
  "storageSource"           TEXT NOT NULL,
  "storageReference"        TEXT NOT NULL,
  "uploadTimestamp"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "uploaderId"              TEXT NOT NULL,
  "fileHash"                TEXT NOT NULL,
  "versionNumber"           INT NOT NULL DEFAULT 1,
  "status"                  TEXT NOT NULL DEFAULT 'UPLOADED',
  "verificationMetadata"    JSONB,
  "verifierId"              TEXT,
  "verifiedAt"              TIMESTAMPTZ,
  "supersededById"          TEXT,
  "revocationReason"        TEXT,
  "revokedAt"               TIMESTAMPTZ,
  "revokedById"             TEXT,
  "activeForDecision"       BOOLEAN NOT NULL DEFAULT true,
  "accessScope"             TEXT NOT NULL DEFAULT 'DEAL_PARTIES',
  "createdAt"               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "trusted_documents_owner_idx"
  ON "trusted_documents" ("ownerEntityId", "ownerEntityType");
CREATE INDEX IF NOT EXISTS "trusted_documents_type_idx"
  ON "trusted_documents" ("documentType");
CREATE INDEX IF NOT EXISTS "trusted_documents_status_idx"
  ON "trusted_documents" ("status");
CREATE INDEX IF NOT EXISTS "trusted_documents_active_idx"
  ON "trusted_documents" ("activeForDecision");
CREATE INDEX IF NOT EXISTS "trusted_documents_hash_idx"
  ON "trusted_documents" ("fileHash");
CREATE INDEX IF NOT EXISTS "trusted_documents_uploader_idx"
  ON "trusted_documents" ("uploaderId");
CREATE INDEX IF NOT EXISTS "trusted_documents_created_idx"
  ON "trusted_documents" ("createdAt");

-- RLS: admin/service-only — no direct user access
ALTER TABLE "trusted_documents" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trusted_documents_service_only"
  ON "trusted_documents"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- --------------------------------------------------------------------------
-- 4. identity_trust_records  (IdentityTrustRecord)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "identity_trust_records" (
  "id"                    TEXT PRIMARY KEY,
  "entityId"              TEXT NOT NULL,
  "entityType"            TEXT NOT NULL,
  "status"                TEXT NOT NULL DEFAULT 'UNVERIFIED',
  "verificationSource"    TEXT,
  "verifiedAt"            TIMESTAMPTZ,
  "verifierId"            TEXT,
  "trustFlags"            TEXT[] NOT NULL DEFAULT '{}',
  "riskFlags"             TEXT[] NOT NULL DEFAULT '{}',
  "manualReviewRequired"  BOOLEAN NOT NULL DEFAULT false,
  "kycStatus"             TEXT,
  "kybStatus"             TEXT,
  "lastAssessedAt"        TIMESTAMPTZ,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("entityId", "entityType")
);

CREATE INDEX IF NOT EXISTS "identity_trust_status_idx"
  ON "identity_trust_records" ("status");
CREATE INDEX IF NOT EXISTS "identity_trust_entity_type_idx"
  ON "identity_trust_records" ("entityType");
CREATE INDEX IF NOT EXISTS "identity_trust_manual_review_idx"
  ON "identity_trust_records" ("manualReviewRequired");
CREATE INDEX IF NOT EXISTS "identity_trust_assessed_idx"
  ON "identity_trust_records" ("lastAssessedAt");
CREATE INDEX IF NOT EXISTS "identity_trust_created_idx"
  ON "identity_trust_records" ("createdAt");

-- RLS: admin/service-only — no direct user access
ALTER TABLE "identity_trust_records" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "identity_trust_service_only"
  ON "identity_trust_records"
  FOR ALL
  USING (false)
  WITH CHECK (false);
