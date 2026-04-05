"""
Create missing prequal session tables in Supabase PostgreSQL
"""
import psycopg2
import os

DB_URL = "postgres://postgres.vpwnjibcrqujclqalkgy:jKSowG3fXKGe5lVB@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"

sql = """
-- Create ConsentCaptureMethod enum if not exists
DO $$ BEGIN
    CREATE TYPE "public"."ConsentCaptureMethod" AS ENUM ('WEB', 'PHONE', 'IN_PERSON', 'ELECTRONIC');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create PrequalConsentArtifact table
CREATE TABLE IF NOT EXISTS "public"."PrequalConsentArtifact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentVersionId" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "renderedText" TEXT,
    "htmlHash" TEXT,
    "consentGiven" BOOLEAN NOT NULL,
    "consentDate" TIMESTAMP(3) NOT NULL,
    "captureMethod" "public"."ConsentCaptureMethod" DEFAULT 'WEB',
    "acceptedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "fingerprintHash" TEXT,
    "sessionId" TEXT,
    "reproducibleStorageUrl" TEXT,
    "retentionLocked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrequalConsentArtifact_pkey" PRIMARY KEY ("id")
);

-- Create ConsumerAuthorizationArtifact table
CREATE TABLE IF NOT EXISTS "public"."ConsumerAuthorizationArtifact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorizationType" TEXT NOT NULL,
    "authorized" BOOLEAN NOT NULL,
    "authorizationText" TEXT NOT NULL,
    "authorizedParties" TEXT[],
    "recipientDescription" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "authorizedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "retentionLocked" BOOLEAN NOT NULL DEFAULT true,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsumerAuthorizationArtifact_pkey" PRIMARY KEY ("id")
);

-- Create PrequalSession table
CREATE TABLE IF NOT EXISTS "public"."PrequalSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "sourceType" TEXT NOT NULL DEFAULT 'INTERNAL',
    "prequalificationId" TEXT,
    "consentArtifactId" TEXT,
    "forwardingAuthorizationId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "startedAt" TIMESTAMP(3),
    "providerRequestedAt" TIMESTAMP(3),
    "providerRespondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrequalSession_pkey" PRIMARY KEY ("id")
);

-- Create PrequalProviderEvent table
CREATE TABLE IF NOT EXISTS "public"."PrequalProviderEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prequalificationId" TEXT,
    "providerName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "requestPayloadJson" JSONB,
    "responsePayloadJson" JSONB,
    "responseStatus" TEXT NOT NULL,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrequalProviderEvent_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "PrequalConsentArtifact_userId_idx" ON "public"."PrequalConsentArtifact"("userId");
CREATE INDEX IF NOT EXISTS "PrequalConsentArtifact_consentVersionId_idx" ON "public"."PrequalConsentArtifact"("consentVersionId");
CREATE INDEX IF NOT EXISTS "PrequalConsentArtifact_sessionId_idx" ON "public"."PrequalConsentArtifact"("sessionId");

CREATE INDEX IF NOT EXISTS "ConsumerAuthorizationArtifact_userId_idx" ON "public"."ConsumerAuthorizationArtifact"("userId");
CREATE INDEX IF NOT EXISTS "ConsumerAuthorizationArtifact_authorizationType_idx" ON "public"."ConsumerAuthorizationArtifact"("authorizationType");
CREATE INDEX IF NOT EXISTS "ConsumerAuthorizationArtifact_sessionId_idx" ON "public"."ConsumerAuthorizationArtifact"("sessionId");

CREATE INDEX IF NOT EXISTS "PrequalSession_userId_idx" ON "public"."PrequalSession"("userId");
CREATE INDEX IF NOT EXISTS "PrequalSession_status_idx" ON "public"."PrequalSession"("status");
CREATE INDEX IF NOT EXISTS "PrequalSession_workspaceId_idx" ON "public"."PrequalSession"("workspaceId");
CREATE INDEX IF NOT EXISTS "PrequalSession_prequalificationId_idx" ON "public"."PrequalSession"("prequalificationId");

CREATE INDEX IF NOT EXISTS "PrequalProviderEvent_sessionId_idx" ON "public"."PrequalProviderEvent"("sessionId");
CREATE INDEX IF NOT EXISTS "PrequalProviderEvent_userId_idx" ON "public"."PrequalProviderEvent"("userId");
CREATE INDEX IF NOT EXISTS "PrequalProviderEvent_providerName_idx" ON "public"."PrequalProviderEvent"("providerName");
CREATE INDEX IF NOT EXISTS "PrequalProviderEvent_createdAt_idx" ON "public"."PrequalProviderEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "PrequalProviderEvent_prequalificationId_idx" ON "public"."PrequalProviderEvent"("prequalificationId");

-- Add foreign key constraints (deferred - only if tables exist)
DO $$ BEGIN
    ALTER TABLE "public"."PrequalConsentArtifact" ADD CONSTRAINT "PrequalConsentArtifact_consentVersionId_fkey"
        FOREIGN KEY ("consentVersionId") REFERENCES "public"."PrequalConsentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "public"."PrequalSession" ADD CONSTRAINT "PrequalSession_prequalificationId_fkey"
        FOREIGN KEY ("prequalificationId") REFERENCES "public"."PreQualification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "public"."PrequalProviderEvent" ADD CONSTRAINT "PrequalProviderEvent_sessionId_fkey"
        FOREIGN KEY ("sessionId") REFERENCES "public"."PrequalSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "public"."PrequalProviderEvent" ADD CONSTRAINT "PrequalProviderEvent_prequalificationId_fkey"
        FOREIGN KEY ("prequalificationId") REFERENCES "public"."PreQualification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    -- Add missing columns to PreQualification if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PreQualification' AND column_name = 'consentArtifactId') THEN
        ALTER TABLE "public"."PreQualification" ADD COLUMN "consentArtifactId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'PreQualification' AND column_name = 'consumerAuthorizationArtifactId') THEN
        ALTER TABLE "public"."PreQualification" ADD COLUMN "consumerAuthorizationArtifactId" TEXT;
    END IF;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS "PreQualification_consentArtifactId_idx" ON "public"."PreQualification"("consentArtifactId");
EXCEPTION WHEN undefined_column THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "public"."PreQualification" ADD CONSTRAINT "PreQualification_consentArtifactId_fkey"
        FOREIGN KEY ("consentArtifactId") REFERENCES "public"."PrequalConsentArtifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "public"."PreQualification" ADD CONSTRAINT "PreQualification_consumerAuthorizationArtifactId_fkey"
        FOREIGN KEY ("consumerAuthorizationArtifactId") REFERENCES "public"."ConsumerAuthorizationArtifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
"""

try:
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cursor = conn.cursor()
    cursor.execute(sql)
    print("✅ All missing tables created successfully!")

    # Verify tables exist now
    for table in ["PrequalSession", "PrequalConsentArtifact", "ConsumerAuthorizationArtifact", "PrequalProviderEvent"]:
        cursor.execute(f"SELECT count(*) FROM information_schema.tables WHERE table_name = '{table}' AND table_schema = 'public'")
        result = cursor.fetchone()
        print(f"  {table}: {'EXISTS' if result[0] > 0 else 'MISSING'}")

    cursor.close()
    conn.close()
except Exception as e:
    print(f"❌ Error: {e}")
