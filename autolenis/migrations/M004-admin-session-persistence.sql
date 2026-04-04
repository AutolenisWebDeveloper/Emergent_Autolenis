-- Migration M004: Durable Admin Sessions
-- Purpose: Replace in-memory admin session storage with database-backed persistence.
-- Admin sessions now survive deploys, restarts, and horizontal scaling.
--
-- Deployment notes:
--   1. Apply this migration BEFORE deploying the new code.
--   2. The new code will write sessions to this table instead of cache/memory.
--   3. Existing in-memory sessions will be lost on deploy (users simply re-login).
--
-- Rollback:
--   DROP TABLE IF EXISTS "AdminSession";
--   Then redeploy the previous code version that uses cache-backed sessions.

-- Create the AdminSession table
CREATE TABLE IF NOT EXISTS "AdminSession" (
  "id"                    TEXT        NOT NULL,
  "userId"                TEXT        NOT NULL,
  "email"                 TEXT        NOT NULL,
  "role"                  TEXT        NOT NULL,
  "mfaVerified"           BOOLEAN     NOT NULL DEFAULT false,
  "mfaEnrolled"           BOOLEAN     NOT NULL DEFAULT false,
  "requiresPasswordReset" BOOLEAN     NOT NULL DEFAULT false,
  "factorId"              TEXT,
  "expiresAt"             TIMESTAMPTZ NOT NULL,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- Indexes for efficient lookups and cleanup
CREATE INDEX IF NOT EXISTS "AdminSession_userId_idx" ON "AdminSession" ("userId");
CREATE INDEX IF NOT EXISTS "AdminSession_expiresAt_idx" ON "AdminSession" ("expiresAt");
