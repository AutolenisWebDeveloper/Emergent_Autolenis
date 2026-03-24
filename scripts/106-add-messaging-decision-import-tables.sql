-- ============================================================================
-- 106: Add MessageThread, Message, AuctionOfferDecision, InventoryImportJob
-- ============================================================================
-- These tables back the messaging service, best-price offer decision tracking,
-- and dealer CSV inventory import features.
--
-- Access: All tables use service-only RLS (USING false WITH CHECK false).
-- They are accessed exclusively via Prisma with the service-role key from
-- API route handlers — no direct Supabase client access is needed.
--
-- Idempotent: uses IF NOT EXISTS for all objects.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MessageThread
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "MessageThread" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "workspaceId"      TEXT,
  "buyerId"          TEXT NOT NULL,
  "dealerId"         TEXT NOT NULL,
  "requestId"        TEXT,
  "dealId"           TEXT,
  "approvalType"     TEXT NOT NULL DEFAULT 'autolenis',
  "identityReleased" BOOLEAN NOT NULL DEFAULT false,
  "status"           TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "MessageThread_workspaceId_idx"
  ON "MessageThread" ("workspaceId");
CREATE INDEX IF NOT EXISTS "MessageThread_buyerId_idx"
  ON "MessageThread" ("buyerId");
CREATE INDEX IF NOT EXISTS "MessageThread_dealerId_idx"
  ON "MessageThread" ("dealerId");
CREATE INDEX IF NOT EXISTS "MessageThread_status_idx"
  ON "MessageThread" ("status");
CREATE INDEX IF NOT EXISTS "MessageThread_createdAt_idx"
  ON "MessageThread" ("createdAt");

ALTER TABLE "MessageThread" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_only_message_thread"
  ON "MessageThread" FOR ALL
  USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- Message
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Message" (
  "id"                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "threadId"              TEXT NOT NULL REFERENCES "MessageThread" ("id") ON DELETE CASCADE,
  "senderType"            TEXT NOT NULL,
  "senderId"              TEXT NOT NULL,
  "body"                  TEXT NOT NULL,
  "redactedBody"          TEXT,
  "containsSensitiveData" BOOLEAN NOT NULL DEFAULT false,
  "circumventionScore"    INTEGER NOT NULL DEFAULT 0,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Message_threadId_idx"
  ON "Message" ("threadId");
CREATE INDEX IF NOT EXISTS "Message_senderId_idx"
  ON "Message" ("senderId");
CREATE INDEX IF NOT EXISTS "Message_createdAt_idx"
  ON "Message" ("createdAt");

ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_only_message"
  ON "Message" FOR ALL
  USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- AuctionOfferDecision
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AuctionOfferDecision" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "auctionId"  TEXT NOT NULL,
  "offerId"    TEXT NOT NULL,
  "buyerId"    TEXT NOT NULL,
  "decision"   TEXT NOT NULL,
  "acceptedAt" TIMESTAMPTZ,
  "declinedAt" TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "AuctionOfferDecision_auctionId_idx"
  ON "AuctionOfferDecision" ("auctionId");
CREATE INDEX IF NOT EXISTS "AuctionOfferDecision_offerId_idx"
  ON "AuctionOfferDecision" ("offerId");
CREATE INDEX IF NOT EXISTS "AuctionOfferDecision_buyerId_idx"
  ON "AuctionOfferDecision" ("buyerId");
CREATE INDEX IF NOT EXISTS "AuctionOfferDecision_createdAt_idx"
  ON "AuctionOfferDecision" ("createdAt");

ALTER TABLE "AuctionOfferDecision" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_only_auction_offer_decision"
  ON "AuctionOfferDecision" FOR ALL
  USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- InventoryImportJob
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "InventoryImportJob" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dealerId"     TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'PENDING',
  "totalRows"    INTEGER NOT NULL DEFAULT 0,
  "createdCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount"  INTEGER NOT NULL DEFAULT 0,
  "errorsJson"   JSONB,
  "startedAt"    TIMESTAMPTZ,
  "completedAt"  TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "InventoryImportJob_dealerId_idx"
  ON "InventoryImportJob" ("dealerId");
CREATE INDEX IF NOT EXISTS "InventoryImportJob_status_idx"
  ON "InventoryImportJob" ("status");
CREATE INDEX IF NOT EXISTS "InventoryImportJob_createdAt_idx"
  ON "InventoryImportJob" ("createdAt");

ALTER TABLE "InventoryImportJob" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_only_inventory_import_job"
  ON "InventoryImportJob" FOR ALL
  USING (false) WITH CHECK (false);
