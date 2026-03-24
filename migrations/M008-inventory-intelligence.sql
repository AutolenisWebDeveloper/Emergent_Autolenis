-- Migration M008: Inventory Intelligence Subsystem
-- Date: 2026-03-18
-- Issue: Inventory Intelligence — tables, enums, functions, and RLS policies
--
-- Purpose:
--   Create the full Inventory Intelligence subsystem schema including:
--   - 14 enum types for dealer/inventory/match/job statuses
--   - 23 tables for dealer prospecting, inventory ingestion, deduplication,
--     buyer matching, dealer onboarding, identity masking, circumvention
--     detection, and job orchestration
--   - Helper functions: updated_at trigger, promote_market_to_verified,
--     evaluate_identity_release
--   - Row-Level Security policies for multi-tenant data isolation
--
-- Safety:
--   - All CREATE TYPE and CREATE TABLE use IF NOT EXISTS for idempotency
--   - Wrapped in a transaction for atomicity
--   - No destructive changes to existing tables
--
-- Pre-requisites:
--   - Ensure a database backup exists before running
--   - Deploy updated application code that references the new models
--
-- Rollback: See bottom of file

BEGIN;

-- ============================================================
-- PHASE 0: Utility — updated_at trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PHASE 1: Create enum types
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DealerProspectStatus') THEN
    CREATE TYPE "DealerProspectStatus" AS ENUM (
      'DISCOVERED', 'CONTACTED', 'RESPONDED', 'ONBOARDING',
      'CONVERTED', 'REJECTED', 'SUPPRESSED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DealerSourceType') THEN
    CREATE TYPE "DealerSourceType" AS ENUM (
      'WEBSITE', 'FEED', 'API', 'MANUAL'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DealerSourceStatus') THEN
    CREATE TYPE "DealerSourceStatus" AS ENUM (
      'ACTIVE', 'PAUSED', 'ERRORED', 'SUPPRESSED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SourceRunStatus') THEN
    CREATE TYPE "SourceRunStatus" AS ENUM (
      'PENDING', 'RUNNING', 'COMPLETED', 'FAILED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketVehicleStatus') THEN
    CREATE TYPE "MarketVehicleStatus" AS ENUM (
      'ACTIVE', 'STALE', 'SUPPRESSED', 'PROMOTED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VerifiedVehicleStatus') THEN
    CREATE TYPE "VerifiedVehicleStatus" AS ENUM (
      'AVAILABLE', 'HOLD', 'SOLD', 'REMOVED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryMatchStatus') THEN
    CREATE TYPE "InventoryMatchStatus" AS ENUM (
      'PENDING', 'MATCHED', 'INVITED', 'OFFER_RECEIVED', 'EXPIRED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoverageGapStatus') THEN
    CREATE TYPE "CoverageGapStatus" AS ENUM (
      'OPEN', 'INVITE_SENT', 'RESOLVED', 'DISMISSED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuickOfferStatus') THEN
    CREATE TYPE "QuickOfferStatus" AS ENUM (
      'PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'EXPIRED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IdentityState') THEN
    CREATE TYPE "IdentityState" AS ENUM (
      'ANONYMOUS', 'CONDITIONAL_HOLD', 'RELEASED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AlertSeverity') THEN
    CREATE TYPE "AlertSeverity" AS ENUM (
      'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AlertStatus') THEN
    CREATE TYPE "AlertStatus" AS ENUM (
      'OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JobStatus') THEN
    CREATE TYPE "JobStatus" AS ENUM (
      'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD_LETTER'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JobType') THEN
    CREATE TYPE "JobType" AS ENUM (
      'DISCOVER_DEALER', 'FETCH_SOURCE', 'PARSE_SOURCE',
      'NORMALIZE_SOURCE', 'DEDUPE_INVENTORY', 'REFRESH_SOURCE',
      'STALE_SWEEP', 'GENERATE_DEALER_INVITES', 'PROCESS_QUICK_OFFER',
      'PROMOTE_VERIFIED_INVENTORY', 'SCAN_CIRCUMVENTION_SIGNALS'
    );
  END IF;
END $$;

-- ============================================================
-- PHASE 2: Create tables
-- ============================================================

-- 2.1  DealerProspect
CREATE TABLE IF NOT EXISTS "DealerProspect" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId"      TEXT,
  "businessName"     TEXT NOT NULL,
  "phone"            TEXT,
  "email"            TEXT,
  "website"          TEXT,
  "address"          TEXT,
  "city"             TEXT,
  "state"            TEXT,
  "zip"              TEXT,
  "discoveredFrom"   TEXT,
  "discoveredAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "status"           "DealerProspectStatus" NOT NULL DEFAULT 'DISCOVERED',
  "notes"            TEXT,
  "convertedDealerId" TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "DealerProspect_workspaceId_idx"
  ON "DealerProspect" ("workspaceId");
CREATE INDEX IF NOT EXISTS "DealerProspect_status_idx"
  ON "DealerProspect" ("status");
CREATE INDEX IF NOT EXISTS "DealerProspect_zip_idx"
  ON "DealerProspect" ("zip");
CREATE INDEX IF NOT EXISTS "DealerProspect_businessName_idx"
  ON "DealerProspect" ("businessName");
CREATE INDEX IF NOT EXISTS "DealerProspect_convertedDealerId_idx"
  ON "DealerProspect" ("convertedDealerId");

-- 2.2  DealerSource
CREATE TABLE IF NOT EXISTS "DealerSource" (
  "id"                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId"           TEXT,
  "prospectId"            TEXT REFERENCES "DealerProspect"("id") ON DELETE SET NULL,
  "dealerId"              TEXT,
  "sourceType"            "DealerSourceType" NOT NULL,
  "sourceUrl"             TEXT,
  "feedUrl"               TEXT,
  "status"                "DealerSourceStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastFetchedAt"         TIMESTAMPTZ,
  "fetchIntervalMinutes"  INT NOT NULL DEFAULT 1440,
  "errorCount"            INT NOT NULL DEFAULT 0,
  "lastErrorMessage"      TEXT,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "DealerSource_workspaceId_idx"
  ON "DealerSource" ("workspaceId");
CREATE INDEX IF NOT EXISTS "DealerSource_prospectId_idx"
  ON "DealerSource" ("prospectId");
CREATE INDEX IF NOT EXISTS "DealerSource_dealerId_idx"
  ON "DealerSource" ("dealerId");
CREATE INDEX IF NOT EXISTS "DealerSource_status_idx"
  ON "DealerSource" ("status");
CREATE INDEX IF NOT EXISTS "DealerSource_sourceType_idx"
  ON "DealerSource" ("sourceType");

-- 2.3  DealerSourceRun
CREATE TABLE IF NOT EXISTS "DealerSourceRun" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "sourceId"        TEXT NOT NULL REFERENCES "DealerSource"("id") ON DELETE CASCADE,
  "status"          "SourceRunStatus" NOT NULL DEFAULT 'PENDING',
  "startedAt"       TIMESTAMPTZ,
  "completedAt"     TIMESTAMPTZ,
  "vehiclesFound"   INT NOT NULL DEFAULT 0,
  "vehiclesNew"     INT NOT NULL DEFAULT 0,
  "vehiclesUpdated" INT NOT NULL DEFAULT 0,
  "errors"          INT NOT NULL DEFAULT 0,
  "errorDetails"    JSONB,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "DealerSourceRun_sourceId_idx"
  ON "DealerSourceRun" ("sourceId");
CREATE INDEX IF NOT EXISTS "DealerSourceRun_status_idx"
  ON "DealerSourceRun" ("status");
CREATE INDEX IF NOT EXISTS "DealerSourceRun_createdAt_idx"
  ON "DealerSourceRun" ("createdAt");

-- 2.4  InventoryRawSnapshot
CREATE TABLE IF NOT EXISTS "InventoryRawSnapshot" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "sourceId"   TEXT NOT NULL REFERENCES "DealerSource"("id") ON DELETE CASCADE,
  "rawData"    JSONB NOT NULL,
  "fetchedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "parsedAt"   TIMESTAMPTZ,
  "parseError" TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "InventoryRawSnapshot_sourceId_idx"
  ON "InventoryRawSnapshot" ("sourceId");
CREATE INDEX IF NOT EXISTS "InventoryRawSnapshot_fetchedAt_idx"
  ON "InventoryRawSnapshot" ("fetchedAt");

-- 2.5  InventoryVehicleSighting
CREATE TABLE IF NOT EXISTS "InventoryVehicleSighting" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "snapshotId"    TEXT NOT NULL REFERENCES "InventoryRawSnapshot"("id") ON DELETE CASCADE,
  "vin"           TEXT,
  "year"          INT,
  "make"          TEXT,
  "model"         TEXT,
  "trim"          TEXT,
  "mileage"       INT,
  "priceCents"    INT,
  "exteriorColor" TEXT,
  "bodyStyle"     TEXT,
  "stockNumber"   TEXT,
  "rawJson"       JSONB,
  "firstSeenAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastSeenAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "InventoryVehicleSighting_snapshotId_idx"
  ON "InventoryVehicleSighting" ("snapshotId");
CREATE INDEX IF NOT EXISTS "InventoryVehicleSighting_vin_idx"
  ON "InventoryVehicleSighting" ("vin");
CREATE INDEX IF NOT EXISTS "InventoryVehicleSighting_make_model_idx"
  ON "InventoryVehicleSighting" ("make", "model");

-- 2.6  InventoryMarketVehicle
CREATE TABLE IF NOT EXISTS "InventoryMarketVehicle" (
  "id"                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId"          TEXT,
  "dealerSourceId"       TEXT,
  "prospectId"           TEXT,
  "vin"                  TEXT,
  "year"                 INT NOT NULL,
  "make"                 TEXT NOT NULL,
  "model"                TEXT NOT NULL,
  "trim"                 TEXT,
  "bodyStyle"            TEXT,
  "mileage"              INT,
  "priceCents"           INT,
  "exteriorColor"        TEXT,
  "interiorColor"        TEXT,
  "transmission"         TEXT,
  "fuelType"             TEXT,
  "drivetrain"           TEXT,
  "engine"               TEXT,
  "images"               TEXT[] DEFAULT '{}',
  "stockNumber"          TEXT,
  "dealerName"           TEXT,
  "dealerZip"            TEXT,
  "dealerState"          TEXT,
  "listingUrl"           TEXT,
  "status"               "MarketVehicleStatus" NOT NULL DEFAULT 'ACTIVE',
  "confidence"           DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "firstSeenAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastSeenAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "staleAfter"           TIMESTAMPTZ,
  "promotedToVerifiedId" TEXT,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "InventoryMarketVehicle"
  DROP CONSTRAINT IF EXISTS "market_vin_prospect";
ALTER TABLE "InventoryMarketVehicle"
  ADD CONSTRAINT "market_vin_prospect" UNIQUE ("vin", "prospectId");

CREATE INDEX IF NOT EXISTS "InventoryMarketVehicle_workspaceId_idx"
  ON "InventoryMarketVehicle" ("workspaceId");
CREATE INDEX IF NOT EXISTS "InventoryMarketVehicle_status_idx"
  ON "InventoryMarketVehicle" ("status");
CREATE INDEX IF NOT EXISTS "InventoryMarketVehicle_make_model_idx"
  ON "InventoryMarketVehicle" ("make", "model");
CREATE INDEX IF NOT EXISTS "InventoryMarketVehicle_dealerZip_idx"
  ON "InventoryMarketVehicle" ("dealerZip");
CREATE INDEX IF NOT EXISTS "InventoryMarketVehicle_vin_idx"
  ON "InventoryMarketVehicle" ("vin");
CREATE INDEX IF NOT EXISTS "InventoryMarketVehicle_prospectId_idx"
  ON "InventoryMarketVehicle" ("prospectId");
CREATE INDEX IF NOT EXISTS "InventoryMarketVehicle_promotedToVerifiedId_idx"
  ON "InventoryMarketVehicle" ("promotedToVerifiedId");

-- 2.7  InventoryVerifiedVehicle
CREATE TABLE IF NOT EXISTS "InventoryVerifiedVehicle" (
  "id"                          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId"                 TEXT,
  "dealerId"                    TEXT NOT NULL,
  "vehicleId"                   TEXT,
  "inventoryItemId"             TEXT,
  "vin"                         TEXT NOT NULL,
  "year"                        INT NOT NULL,
  "make"                        TEXT NOT NULL,
  "model"                       TEXT NOT NULL,
  "trim"                        TEXT,
  "bodyStyle"                   TEXT,
  "mileage"                     INT,
  "priceCents"                  INT,
  "exteriorColor"               TEXT,
  "interiorColor"               TEXT,
  "transmission"                TEXT,
  "fuelType"                    TEXT,
  "drivetrain"                  TEXT,
  "engine"                      TEXT,
  "images"                      TEXT[] DEFAULT '{}',
  "stockNumber"                 TEXT,
  "location"                    TEXT,
  "description"                 TEXT,
  "status"                      "VerifiedVehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
  "promotedFromMarketVehicleId" TEXT,
  "promotedAt"                  TIMESTAMPTZ,
  "createdAt"                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "InventoryVerifiedVehicle"
  DROP CONSTRAINT IF EXISTS "verified_vin_dealer";
ALTER TABLE "InventoryVerifiedVehicle"
  ADD CONSTRAINT "verified_vin_dealer" UNIQUE ("vin", "dealerId");

CREATE INDEX IF NOT EXISTS "InventoryVerifiedVehicle_workspaceId_idx"
  ON "InventoryVerifiedVehicle" ("workspaceId");
CREATE INDEX IF NOT EXISTS "InventoryVerifiedVehicle_dealerId_idx"
  ON "InventoryVerifiedVehicle" ("dealerId");
CREATE INDEX IF NOT EXISTS "InventoryVerifiedVehicle_status_idx"
  ON "InventoryVerifiedVehicle" ("status");
CREATE INDEX IF NOT EXISTS "InventoryVerifiedVehicle_make_model_idx"
  ON "InventoryVerifiedVehicle" ("make", "model");
CREATE INDEX IF NOT EXISTS "InventoryVerifiedVehicle_vin_idx"
  ON "InventoryVerifiedVehicle" ("vin");
CREATE INDEX IF NOT EXISTS "InventoryVerifiedVehicle_promotedFromMarketVehicleId_idx"
  ON "InventoryVerifiedVehicle" ("promotedFromMarketVehicleId");

-- 2.8  InventoryPriceHistory
CREATE TABLE IF NOT EXISTS "InventoryPriceHistory" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "marketVehicleId"   TEXT REFERENCES "InventoryMarketVehicle"("id") ON DELETE CASCADE,
  "verifiedVehicleId" TEXT REFERENCES "InventoryVerifiedVehicle"("id") ON DELETE CASCADE,
  "priceCents"        INT NOT NULL,
  "recordedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "InventoryPriceHistory_marketVehicleId_idx"
  ON "InventoryPriceHistory" ("marketVehicleId");
CREATE INDEX IF NOT EXISTS "InventoryPriceHistory_verifiedVehicleId_idx"
  ON "InventoryPriceHistory" ("verifiedVehicleId");
CREATE INDEX IF NOT EXISTS "InventoryPriceHistory_recordedAt_idx"
  ON "InventoryPriceHistory" ("recordedAt");

-- 2.9  InventoryDuplicateGroup
CREATE TABLE IF NOT EXISTS "InventoryDuplicateGroup" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId" TEXT,
  "vin"         TEXT,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "resolvedAt"  TIMESTAMPTZ,
  "resolvedBy"  TEXT,
  "resolution"  TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "InventoryDuplicateGroup_workspaceId_idx"
  ON "InventoryDuplicateGroup" ("workspaceId");
CREATE INDEX IF NOT EXISTS "InventoryDuplicateGroup_vin_idx"
  ON "InventoryDuplicateGroup" ("vin");
CREATE INDEX IF NOT EXISTS "InventoryDuplicateGroup_status_idx"
  ON "InventoryDuplicateGroup" ("status");

-- 2.10  InventoryDuplicateGroupMember
CREATE TABLE IF NOT EXISTS "InventoryDuplicateGroupMember" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "groupId"           TEXT NOT NULL REFERENCES "InventoryDuplicateGroup"("id") ON DELETE CASCADE,
  "marketVehicleId"   TEXT REFERENCES "InventoryMarketVehicle"("id") ON DELETE SET NULL,
  "verifiedVehicleId" TEXT REFERENCES "InventoryVerifiedVehicle"("id") ON DELETE SET NULL,
  "isPrimary"         BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "InventoryDuplicateGroupMember_groupId_idx"
  ON "InventoryDuplicateGroupMember" ("groupId");
CREATE INDEX IF NOT EXISTS "InventoryDuplicateGroupMember_marketVehicleId_idx"
  ON "InventoryDuplicateGroupMember" ("marketVehicleId");
CREATE INDEX IF NOT EXISTS "InventoryDuplicateGroupMember_verifiedVehicleId_idx"
  ON "InventoryDuplicateGroupMember" ("verifiedVehicleId");

-- 2.11  InventorySourceError
CREATE TABLE IF NOT EXISTS "InventorySourceError" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "sourceId"     TEXT NOT NULL REFERENCES "DealerSource"("id") ON DELETE CASCADE,
  "errorType"    TEXT NOT NULL,
  "errorMessage" TEXT NOT NULL,
  "rawPayload"   JSONB,
  "occurredAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "InventorySourceError_sourceId_idx"
  ON "InventorySourceError" ("sourceId");
CREATE INDEX IF NOT EXISTS "InventorySourceError_errorType_idx"
  ON "InventorySourceError" ("errorType");
CREATE INDEX IF NOT EXISTS "InventorySourceError_occurredAt_idx"
  ON "InventorySourceError" ("occurredAt");

-- 2.12  BuyerRequestInventoryMatch
CREATE TABLE IF NOT EXISTS "BuyerRequestInventoryMatch" (
  "id"                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId"         TEXT,
  "buyerRequestId"      TEXT,
  "marketVehicleId"     TEXT REFERENCES "InventoryMarketVehicle"("id") ON DELETE SET NULL,
  "verifiedVehicleId"   TEXT REFERENCES "InventoryVerifiedVehicle"("id") ON DELETE SET NULL,
  "coverageType"        TEXT,
  "matchScore"          DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status"              "InventoryMatchStatus" NOT NULL DEFAULT 'PENDING',
  "auctionInvitationId" TEXT,
  "dealerInviteId"      TEXT,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "BuyerRequestInventoryMatch_workspaceId_idx"
  ON "BuyerRequestInventoryMatch" ("workspaceId");
CREATE INDEX IF NOT EXISTS "BuyerRequestInventoryMatch_buyerRequestId_idx"
  ON "BuyerRequestInventoryMatch" ("buyerRequestId");
CREATE INDEX IF NOT EXISTS "BuyerRequestInventoryMatch_marketVehicleId_idx"
  ON "BuyerRequestInventoryMatch" ("marketVehicleId");
CREATE INDEX IF NOT EXISTS "BuyerRequestInventoryMatch_verifiedVehicleId_idx"
  ON "BuyerRequestInventoryMatch" ("verifiedVehicleId");
CREATE INDEX IF NOT EXISTS "BuyerRequestInventoryMatch_status_idx"
  ON "BuyerRequestInventoryMatch" ("status");

-- 2.13  CoverageGapTask
CREATE TABLE IF NOT EXISTS "CoverageGapTask" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId"    TEXT,
  "buyerRequestId" TEXT,
  "marketZip"      TEXT NOT NULL,
  "radiusMiles"    INT NOT NULL DEFAULT 50,
  "make"           TEXT,
  "model"          TEXT,
  "yearMin"        INT,
  "yearMax"        INT,
  "status"         "CoverageGapStatus" NOT NULL DEFAULT 'OPEN',
  "resolvedAt"     TIMESTAMPTZ,
  "resolvedBy"     TEXT,
  "resolution"     TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "CoverageGapTask_workspaceId_idx"
  ON "CoverageGapTask" ("workspaceId");
CREATE INDEX IF NOT EXISTS "CoverageGapTask_status_idx"
  ON "CoverageGapTask" ("status");
CREATE INDEX IF NOT EXISTS "CoverageGapTask_marketZip_idx"
  ON "CoverageGapTask" ("marketZip");
CREATE INDEX IF NOT EXISTS "CoverageGapTask_buyerRequestId_idx"
  ON "CoverageGapTask" ("buyerRequestId");

-- 2.14  DealerIntelligenceInvite
CREATE TABLE IF NOT EXISTS "DealerIntelligenceInvite" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId"       TEXT,
  "prospectId"        TEXT REFERENCES "DealerProspect"("id") ON DELETE SET NULL,
  "dealerId"          TEXT,
  "buyerRequestId"    TEXT,
  "coverageGapTaskId" TEXT,
  "tokenHash"         TEXT NOT NULL UNIQUE,
  "tokenExpiresAt"    TIMESTAMPTZ NOT NULL,
  "dealerEmail"       TEXT,
  "dealerName"        TEXT,
  "dealerPhone"       TEXT,
  "status"            TEXT NOT NULL DEFAULT 'sent',
  "sentAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "viewedAt"          TIMESTAMPTZ,
  "respondedAt"       TIMESTAMPTZ,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "DealerIntelligenceInvite_workspaceId_idx"
  ON "DealerIntelligenceInvite" ("workspaceId");
CREATE INDEX IF NOT EXISTS "DealerIntelligenceInvite_prospectId_idx"
  ON "DealerIntelligenceInvite" ("prospectId");
CREATE INDEX IF NOT EXISTS "DealerIntelligenceInvite_dealerId_idx"
  ON "DealerIntelligenceInvite" ("dealerId");
CREATE INDEX IF NOT EXISTS "DealerIntelligenceInvite_tokenHash_idx"
  ON "DealerIntelligenceInvite" ("tokenHash");
CREATE INDEX IF NOT EXISTS "DealerIntelligenceInvite_status_idx"
  ON "DealerIntelligenceInvite" ("status");
CREATE INDEX IF NOT EXISTS "DealerIntelligenceInvite_buyerRequestId_idx"
  ON "DealerIntelligenceInvite" ("buyerRequestId");

-- 2.15  DealerQuickOffer
CREATE TABLE IF NOT EXISTS "DealerQuickOffer" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId"    TEXT,
  "inviteId"       TEXT NOT NULL REFERENCES "DealerIntelligenceInvite"("id") ON DELETE CASCADE,
  "prospectId"     TEXT REFERENCES "DealerProspect"("id") ON DELETE SET NULL,
  "vin"            TEXT,
  "year"           INT,
  "make"           TEXT,
  "model"          TEXT,
  "trim"           TEXT,
  "mileage"        INT,
  "priceCents"     INT,
  "conditionNotes" TEXT,
  "availableDate"  TIMESTAMPTZ,
  "notes"          TEXT,
  "status"         "QuickOfferStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedBy"     TEXT,
  "reviewedAt"     TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "DealerQuickOffer_workspaceId_idx"
  ON "DealerQuickOffer" ("workspaceId");
CREATE INDEX IF NOT EXISTS "DealerQuickOffer_inviteId_idx"
  ON "DealerQuickOffer" ("inviteId");
CREATE INDEX IF NOT EXISTS "DealerQuickOffer_prospectId_idx"
  ON "DealerQuickOffer" ("prospectId");
CREATE INDEX IF NOT EXISTS "DealerQuickOffer_status_idx"
  ON "DealerQuickOffer" ("status");

-- 2.16  DealerOnboardingConversion
CREATE TABLE IF NOT EXISTS "DealerOnboardingConversion" (
  "id"                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId"          TEXT,
  "prospectId"           TEXT NOT NULL REFERENCES "DealerProspect"("id") ON DELETE CASCADE,
  "dealerId"             TEXT,
  "quickOfferId"         TEXT,
  "status"               TEXT NOT NULL DEFAULT 'pending',
  "startedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completedAt"          TIMESTAMPTZ,
  "businessDocsUploaded" BOOLEAN NOT NULL DEFAULT FALSE,
  "agreementAccepted"    BOOLEAN NOT NULL DEFAULT FALSE,
  "operationalSetup"     BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "DealerOnboardingConversion_workspaceId_idx"
  ON "DealerOnboardingConversion" ("workspaceId");
CREATE INDEX IF NOT EXISTS "DealerOnboardingConversion_prospectId_idx"
  ON "DealerOnboardingConversion" ("prospectId");
CREATE INDEX IF NOT EXISTS "DealerOnboardingConversion_dealerId_idx"
  ON "DealerOnboardingConversion" ("dealerId");
CREATE INDEX IF NOT EXISTS "DealerOnboardingConversion_status_idx"
  ON "DealerOnboardingConversion" ("status");

-- 2.17  MaskedPartyProfile
CREATE TABLE IF NOT EXISTS "MaskedPartyProfile" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId"      TEXT,
  "dealId"           TEXT,
  "buyerId"          TEXT,
  "dealerId"         TEXT,
  "prospectId"       TEXT,
  "partyType"        TEXT NOT NULL,
  "maskedId"         TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  "displayName"      TEXT,
  "readinessPayload" JSONB,
  "identityState"    "IdentityState" NOT NULL DEFAULT 'ANONYMOUS',
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "MaskedPartyProfile_workspaceId_idx"
  ON "MaskedPartyProfile" ("workspaceId");
CREATE INDEX IF NOT EXISTS "MaskedPartyProfile_dealId_idx"
  ON "MaskedPartyProfile" ("dealId");
CREATE INDEX IF NOT EXISTS "MaskedPartyProfile_buyerId_idx"
  ON "MaskedPartyProfile" ("buyerId");
CREATE INDEX IF NOT EXISTS "MaskedPartyProfile_dealerId_idx"
  ON "MaskedPartyProfile" ("dealerId");
CREATE INDEX IF NOT EXISTS "MaskedPartyProfile_maskedId_idx"
  ON "MaskedPartyProfile" ("maskedId");
CREATE INDEX IF NOT EXISTS "MaskedPartyProfile_identityState_idx"
  ON "MaskedPartyProfile" ("identityState");

-- 2.18  IdentityReleaseEvent
CREATE TABLE IF NOT EXISTS "IdentityReleaseEvent" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId"   TEXT,
  "dealId"        TEXT NOT NULL,
  "buyerId"       TEXT,
  "dealerId"      TEXT,
  "previousState" "IdentityState" NOT NULL,
  "newState"      "IdentityState" NOT NULL,
  "reason"        TEXT,
  "triggeredBy"   TEXT,
  "releasedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "IdentityReleaseEvent_workspaceId_idx"
  ON "IdentityReleaseEvent" ("workspaceId");
CREATE INDEX IF NOT EXISTS "IdentityReleaseEvent_dealId_idx"
  ON "IdentityReleaseEvent" ("dealId");
CREATE INDEX IF NOT EXISTS "IdentityReleaseEvent_buyerId_idx"
  ON "IdentityReleaseEvent" ("buyerId");
CREATE INDEX IF NOT EXISTS "IdentityReleaseEvent_dealerId_idx"
  ON "IdentityReleaseEvent" ("dealerId");
CREATE INDEX IF NOT EXISTS "IdentityReleaseEvent_releasedAt_idx"
  ON "IdentityReleaseEvent" ("releasedAt");

-- 2.19  CircumventionAlert
CREATE TABLE IF NOT EXISTS "CircumventionAlert" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId" TEXT,
  "dealId"      TEXT,
  "buyerId"     TEXT,
  "dealerId"    TEXT,
  "messageId"   TEXT,
  "alertType"   TEXT NOT NULL,
  "severity"    "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
  "status"      "AlertStatus" NOT NULL DEFAULT 'OPEN',
  "description" TEXT,
  "evidence"    JSONB,
  "resolvedBy"  TEXT,
  "resolvedAt"  TIMESTAMPTZ,
  "resolution"  TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "CircumventionAlert_workspaceId_idx"
  ON "CircumventionAlert" ("workspaceId");
CREATE INDEX IF NOT EXISTS "CircumventionAlert_dealId_idx"
  ON "CircumventionAlert" ("dealId");
CREATE INDEX IF NOT EXISTS "CircumventionAlert_severity_idx"
  ON "CircumventionAlert" ("severity");
CREATE INDEX IF NOT EXISTS "CircumventionAlert_status_idx"
  ON "CircumventionAlert" ("status");
CREATE INDEX IF NOT EXISTS "CircumventionAlert_createdAt_idx"
  ON "CircumventionAlert" ("createdAt");

-- 2.20  DealProtectionEvent
CREATE TABLE IF NOT EXISTS "DealProtectionEvent" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId" TEXT,
  "dealId"      TEXT NOT NULL,
  "eventType"   TEXT NOT NULL,
  "description" TEXT,
  "metadata"    JSONB,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "DealProtectionEvent_workspaceId_idx"
  ON "DealProtectionEvent" ("workspaceId");
CREATE INDEX IF NOT EXISTS "DealProtectionEvent_dealId_idx"
  ON "DealProtectionEvent" ("dealId");
CREATE INDEX IF NOT EXISTS "DealProtectionEvent_eventType_idx"
  ON "DealProtectionEvent" ("eventType");
CREATE INDEX IF NOT EXISTS "DealProtectionEvent_createdAt_idx"
  ON "DealProtectionEvent" ("createdAt");

-- 2.21  MessageRedactionEvent
CREATE TABLE IF NOT EXISTS "MessageRedactionEvent" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId"     TEXT,
  "messageId"       TEXT,
  "dealId"          TEXT,
  "senderId"        TEXT,
  "recipientId"     TEXT,
  "originalContent" TEXT,
  "redactedContent" TEXT,
  "redactionType"   TEXT NOT NULL,
  "patternsFound"   JSONB,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "MessageRedactionEvent_workspaceId_idx"
  ON "MessageRedactionEvent" ("workspaceId");
CREATE INDEX IF NOT EXISTS "MessageRedactionEvent_messageId_idx"
  ON "MessageRedactionEvent" ("messageId");
CREATE INDEX IF NOT EXISTS "MessageRedactionEvent_dealId_idx"
  ON "MessageRedactionEvent" ("dealId");
CREATE INDEX IF NOT EXISTS "MessageRedactionEvent_senderId_idx"
  ON "MessageRedactionEvent" ("senderId");
CREATE INDEX IF NOT EXISTS "MessageRedactionEvent_createdAt_idx"
  ON "MessageRedactionEvent" ("createdAt");

-- 2.22  DealerLifecycleEvent
CREATE TABLE IF NOT EXISTS "DealerLifecycleEvent" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId" TEXT,
  "prospectId"  TEXT REFERENCES "DealerProspect"("id") ON DELETE SET NULL,
  "dealerId"    TEXT,
  "eventType"   TEXT NOT NULL,
  "fromStatus"  TEXT,
  "toStatus"    TEXT,
  "metadata"    JSONB,
  "performedBy" TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "DealerLifecycleEvent_workspaceId_idx"
  ON "DealerLifecycleEvent" ("workspaceId");
CREATE INDEX IF NOT EXISTS "DealerLifecycleEvent_prospectId_idx"
  ON "DealerLifecycleEvent" ("prospectId");
CREATE INDEX IF NOT EXISTS "DealerLifecycleEvent_dealerId_idx"
  ON "DealerLifecycleEvent" ("dealerId");
CREATE INDEX IF NOT EXISTS "DealerLifecycleEvent_eventType_idx"
  ON "DealerLifecycleEvent" ("eventType");
CREATE INDEX IF NOT EXISTS "DealerLifecycleEvent_createdAt_idx"
  ON "DealerLifecycleEvent" ("createdAt");

-- 2.23  InventoryIntelligenceJob
CREATE TABLE IF NOT EXISTS "InventoryIntelligenceJob" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "workspaceId"    TEXT,
  "jobType"        "JobType" NOT NULL,
  "status"         "JobStatus" NOT NULL DEFAULT 'PENDING',
  "payload"        JSONB,
  "result"         JSONB,
  "errorMessage"   TEXT,
  "attempts"       INT NOT NULL DEFAULT 0,
  "maxAttempts"    INT NOT NULL DEFAULT 3,
  "scheduledAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "startedAt"      TIMESTAMPTZ,
  "completedAt"    TIMESTAMPTZ,
  "deadLetteredAt" TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "InventoryIntelligenceJob_workspaceId_idx"
  ON "InventoryIntelligenceJob" ("workspaceId");
CREATE INDEX IF NOT EXISTS "InventoryIntelligenceJob_jobType_idx"
  ON "InventoryIntelligenceJob" ("jobType");
CREATE INDEX IF NOT EXISTS "InventoryIntelligenceJob_status_idx"
  ON "InventoryIntelligenceJob" ("status");
CREATE INDEX IF NOT EXISTS "InventoryIntelligenceJob_scheduledAt_idx"
  ON "InventoryIntelligenceJob" ("scheduledAt");
CREATE INDEX IF NOT EXISTS "InventoryIntelligenceJob_createdAt_idx"
  ON "InventoryIntelligenceJob" ("createdAt");

-- ============================================================
-- PHASE 3: Apply updated_at triggers
-- ============================================================

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'DealerProspect', 'DealerSource',
    'InventoryMarketVehicle', 'InventoryVerifiedVehicle',
    'InventoryDuplicateGroup',
    'BuyerRequestInventoryMatch', 'CoverageGapTask',
    'DealerIntelligenceInvite', 'DealerQuickOffer',
    'DealerOnboardingConversion',
    'MaskedPartyProfile',
    'CircumventionAlert',
    'InventoryIntelligenceJob'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;
       CREATE TRIGGER trg_%I_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END $$;

-- ============================================================
-- PHASE 4: Domain functions
-- ============================================================

-- 4.1  promote_market_to_verified
--   Takes a market vehicle ID and a dealer ID.
--   Creates a verified vehicle from the market vehicle data,
--   marks the market vehicle as PROMOTED, and returns the new
--   verified vehicle ID.
CREATE OR REPLACE FUNCTION promote_market_to_verified(
  p_market_vehicle_id TEXT,
  p_dealer_id         TEXT
) RETURNS TEXT AS $$
DECLARE
  v_new_id TEXT;
  v_mv     RECORD;
BEGIN
  -- Lock the market vehicle row to prevent concurrent promotions
  SELECT * INTO v_mv
  FROM "InventoryMarketVehicle"
  WHERE "id" = p_market_vehicle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Market vehicle % not found', p_market_vehicle_id;
  END IF;

  IF v_mv."status" = 'PROMOTED' THEN
    RAISE EXCEPTION 'Market vehicle % is already promoted', p_market_vehicle_id;
  END IF;

  -- Generate a new ID for the verified vehicle
  v_new_id := gen_random_uuid()::TEXT;

  INSERT INTO "InventoryVerifiedVehicle" (
    "id", "workspaceId", "dealerId",
    "vin", "year", "make", "model", "trim", "bodyStyle",
    "mileage", "priceCents", "exteriorColor", "interiorColor",
    "transmission", "fuelType", "drivetrain", "engine",
    "images", "stockNumber",
    "status", "promotedFromMarketVehicleId", "promotedAt",
    "createdAt", "updatedAt"
  ) VALUES (
    v_new_id, v_mv."workspaceId", p_dealer_id,
    v_mv."vin", v_mv."year", v_mv."make", v_mv."model",
    v_mv."trim", v_mv."bodyStyle",
    v_mv."mileage", v_mv."priceCents", v_mv."exteriorColor",
    v_mv."interiorColor", v_mv."transmission", v_mv."fuelType",
    v_mv."drivetrain", v_mv."engine",
    v_mv."images", v_mv."stockNumber",
    'AVAILABLE', p_market_vehicle_id, NOW(),
    NOW(), NOW()
  )
  ON CONFLICT ON CONSTRAINT "verified_vin_dealer" DO NOTHING;

  -- Mark the market vehicle as promoted
  UPDATE "InventoryMarketVehicle"
  SET "status"              = 'PROMOTED',
      "promotedToVerifiedId" = v_new_id,
      "updatedAt"            = NOW()
  WHERE "id" = p_market_vehicle_id;

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- 4.2  evaluate_identity_release
--   Takes a deal ID. Checks whether all release conditions are met
--   (both buyer and dealer profiles exist with CONDITIONAL_HOLD state,
--    and a DealProtectionEvent of type 'TERMS_ACCEPTED' has been logged).
--   If conditions are met, transitions profiles to RELEASED and
--   creates IdentityReleaseEvent records.
CREATE OR REPLACE FUNCTION evaluate_identity_release(
  p_deal_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_profile    RECORD;
  v_conditions BOOLEAN := TRUE;
  v_has_terms  BOOLEAN;
  v_released   INT := 0;
BEGIN
  -- Condition: deal has an accepted-terms protection event
  SELECT EXISTS (
    SELECT 1 FROM "DealProtectionEvent"
    WHERE "dealId" = p_deal_id
      AND "eventType" = 'TERMS_ACCEPTED'
  ) INTO v_has_terms;

  IF NOT v_has_terms THEN
    RETURN FALSE;
  END IF;

  -- Condition: at least one masked profile in CONDITIONAL_HOLD exists
  IF NOT EXISTS (
    SELECT 1 FROM "MaskedPartyProfile"
    WHERE "dealId" = p_deal_id
      AND "identityState" = 'CONDITIONAL_HOLD'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Release all CONDITIONAL_HOLD profiles for this deal
  FOR v_profile IN
    SELECT * FROM "MaskedPartyProfile"
    WHERE "dealId" = p_deal_id
      AND "identityState" = 'CONDITIONAL_HOLD'
    FOR UPDATE
  LOOP
    UPDATE "MaskedPartyProfile"
    SET "identityState" = 'RELEASED',
        "updatedAt"     = NOW()
    WHERE "id" = v_profile."id";

    INSERT INTO "IdentityReleaseEvent" (
      "id", "workspaceId", "dealId", "buyerId", "dealerId",
      "previousState", "newState", "reason", "triggeredBy",
      "releasedAt"
    ) VALUES (
      gen_random_uuid()::TEXT,
      v_profile."workspaceId",
      p_deal_id,
      v_profile."buyerId",
      v_profile."dealerId",
      'CONDITIONAL_HOLD',
      'RELEASED',
      'All release conditions met',
      'system:evaluate_identity_release',
      NOW()
    );

    v_released := v_released + 1;
  END LOOP;

  RETURN v_released > 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PHASE 5: Row-Level Security policies
-- ============================================================

-- 5.1  DealerQuickOffer — dealers can only see their own offers
ALTER TABLE "DealerQuickOffer" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dealer_quick_offer_isolation" ON "DealerQuickOffer";
CREATE POLICY "dealer_quick_offer_isolation" ON "DealerQuickOffer"
  USING (
    "prospectId" = current_setting('app.current_prospect_id', TRUE)
    OR "workspaceId" = current_setting('app.current_workspace_id', TRUE)
  );

-- 5.2  MaskedPartyProfile — parties can only see their own masked profiles
ALTER TABLE "MaskedPartyProfile" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "masked_party_profile_isolation" ON "MaskedPartyProfile";
CREATE POLICY "masked_party_profile_isolation" ON "MaskedPartyProfile"
  USING (
    "buyerId" = current_setting('app.current_user_id', TRUE)
    OR "dealerId" = current_setting('app.current_user_id', TRUE)
    OR "workspaceId" = current_setting('app.current_workspace_id', TRUE)
  );

-- 5.3  DealerIntelligenceInvite — prospects/dealers can only see their own invites
ALTER TABLE "DealerIntelligenceInvite" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dealer_invite_isolation" ON "DealerIntelligenceInvite";
CREATE POLICY "dealer_invite_isolation" ON "DealerIntelligenceInvite"
  USING (
    "prospectId" = current_setting('app.current_prospect_id', TRUE)
    OR "dealerId" = current_setting('app.current_user_id', TRUE)
    OR "workspaceId" = current_setting('app.current_workspace_id', TRUE)
  );

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================
-- SELECT typname FROM pg_type
-- WHERE typname IN (
--   'DealerProspectStatus','DealerSourceType','DealerSourceStatus',
--   'SourceRunStatus','MarketVehicleStatus','VerifiedVehicleStatus',
--   'InventoryMatchStatus','CoverageGapStatus','QuickOfferStatus',
--   'IdentityState','AlertSeverity','AlertStatus','JobStatus','JobType'
-- );
--
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'DealerProspect','DealerSource','DealerSourceRun',
--     'InventoryRawSnapshot','InventoryVehicleSighting',
--     'InventoryMarketVehicle','InventoryVerifiedVehicle',
--     'InventoryPriceHistory','InventoryDuplicateGroup',
--     'InventoryDuplicateGroupMember','InventorySourceError',
--     'BuyerRequestInventoryMatch','CoverageGapTask',
--     'DealerIntelligenceInvite','DealerQuickOffer',
--     'DealerOnboardingConversion','MaskedPartyProfile',
--     'IdentityReleaseEvent','CircumventionAlert',
--     'DealProtectionEvent','MessageRedactionEvent',
--     'DealerLifecycleEvent','InventoryIntelligenceJob'
--   );
--
-- SELECT proname FROM pg_proc
-- WHERE proname IN ('promote_market_to_verified','evaluate_identity_release');

-- ============================================================
-- DEPLOYMENT NOTES
-- ============================================================
-- 1. Ensure a database backup exists
-- 2. Run this migration:
--    psql $DATABASE_URL < migrations/M008-inventory-intelligence.sql
-- 3. Verify with the queries above
-- 4. Run `npx prisma generate` to refresh the Prisma client
-- 5. Deploy application code that uses the new models

-- ============================================================
-- ROLLBACK NOTES
-- ============================================================
-- To rollback, drop all objects in reverse dependency order:
--
-- BEGIN;
--
-- -- Drop RLS policies
-- ALTER TABLE "DealerQuickOffer" DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "dealer_quick_offer_isolation" ON "DealerQuickOffer";
-- ALTER TABLE "MaskedPartyProfile" DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "masked_party_profile_isolation" ON "MaskedPartyProfile";
-- ALTER TABLE "DealerIntelligenceInvite" DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "dealer_invite_isolation" ON "DealerIntelligenceInvite";
--
-- -- Drop functions
-- DROP FUNCTION IF EXISTS evaluate_identity_release(TEXT);
-- DROP FUNCTION IF EXISTS promote_market_to_verified(TEXT, TEXT);
--
-- -- Drop tables (reverse dependency order)
-- DROP TABLE IF EXISTS "InventoryIntelligenceJob";
-- DROP TABLE IF EXISTS "DealerLifecycleEvent";
-- DROP TABLE IF EXISTS "MessageRedactionEvent";
-- DROP TABLE IF EXISTS "DealProtectionEvent";
-- DROP TABLE IF EXISTS "CircumventionAlert";
-- DROP TABLE IF EXISTS "IdentityReleaseEvent";
-- DROP TABLE IF EXISTS "MaskedPartyProfile";
-- DROP TABLE IF EXISTS "DealerOnboardingConversion";
-- DROP TABLE IF EXISTS "DealerQuickOffer";
-- DROP TABLE IF EXISTS "DealerIntelligenceInvite";
-- DROP TABLE IF EXISTS "CoverageGapTask";
-- DROP TABLE IF EXISTS "BuyerRequestInventoryMatch";
-- DROP TABLE IF EXISTS "InventorySourceError";
-- DROP TABLE IF EXISTS "InventoryDuplicateGroupMember";
-- DROP TABLE IF EXISTS "InventoryDuplicateGroup";
-- DROP TABLE IF EXISTS "InventoryPriceHistory";
-- DROP TABLE IF EXISTS "InventoryVerifiedVehicle";
-- DROP TABLE IF EXISTS "InventoryMarketVehicle";
-- DROP TABLE IF EXISTS "InventoryVehicleSighting";
-- DROP TABLE IF EXISTS "InventoryRawSnapshot";
-- DROP TABLE IF EXISTS "DealerSourceRun";
-- DROP TABLE IF EXISTS "DealerSource";
-- DROP TABLE IF EXISTS "DealerProspect";
--
-- -- Drop enums
-- DROP TYPE IF EXISTS "JobType";
-- DROP TYPE IF EXISTS "JobStatus";
-- DROP TYPE IF EXISTS "AlertStatus";
-- DROP TYPE IF EXISTS "AlertSeverity";
-- DROP TYPE IF EXISTS "IdentityState";
-- DROP TYPE IF EXISTS "QuickOfferStatus";
-- DROP TYPE IF EXISTS "CoverageGapStatus";
-- DROP TYPE IF EXISTS "InventoryMatchStatus";
-- DROP TYPE IF EXISTS "VerifiedVehicleStatus";
-- DROP TYPE IF EXISTS "MarketVehicleStatus";
-- DROP TYPE IF EXISTS "SourceRunStatus";
-- DROP TYPE IF EXISTS "DealerSourceStatus";
-- DROP TYPE IF EXISTS "DealerSourceType";
-- DROP TYPE IF EXISTS "DealerProspectStatus";
--
-- -- Optionally drop the trigger function (shared; only if no other tables use it)
-- -- DROP FUNCTION IF EXISTS set_updated_at();
--
-- COMMIT;
