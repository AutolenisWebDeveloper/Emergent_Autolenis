-- Migration: Create EmailLog table for tracking all outbound emails
-- This table is used by email.service.tsx to log every email send attempt.

CREATE TABLE IF NOT EXISTS "EmailLog" (
  "id"               TEXT PRIMARY KEY,
  "templateKey"      TEXT NOT NULL,
  "to"               TEXT NOT NULL,
  "from"             TEXT NOT NULL,
  "subject"          TEXT NOT NULL,
  "userId"           TEXT,
  "affiliateId"      TEXT,
  "dealId"           TEXT,
  "auctionId"        TEXT,
  "resendMessageId"  TEXT,
  "status"           TEXT NOT NULL,
  "errorMessage"     TEXT,
  "correlationId"    TEXT NOT NULL,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "EmailLog_userId_idx" ON "EmailLog" ("userId");
CREATE INDEX IF NOT EXISTS "EmailLog_correlationId_idx" ON "EmailLog" ("correlationId");
CREATE INDEX IF NOT EXISTS "EmailLog_templateKey_idx" ON "EmailLog" ("templateKey");
CREATE INDEX IF NOT EXISTS "EmailLog_createdAt_idx" ON "EmailLog" ("createdAt");
