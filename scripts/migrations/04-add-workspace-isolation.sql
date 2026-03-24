-- Migration: Add workspace isolation for mock/test data separation
-- This migration adds the Workspace model and workspace_id to the User table
-- to enforce strict tenant isolation between LIVE and TEST environments.

-- 1. Create WorkspaceMode enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkspaceMode') THEN
    CREATE TYPE "WorkspaceMode" AS ENUM ('LIVE', 'TEST');
  END IF;
END$$;

-- 2. Create Workspace table
CREATE TABLE IF NOT EXISTS "Workspace" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name"      TEXT NOT NULL,
  "mode"      "WorkspaceMode" NOT NULL DEFAULT 'LIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT,

  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Workspace_mode_idx" ON "Workspace"("mode");

-- 3. Add workspace_id column to User table
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

CREATE INDEX IF NOT EXISTS "User_workspaceId_idx" ON "User"("workspaceId");

ALTER TABLE "User"
  DROP CONSTRAINT IF EXISTS "User_workspaceId_fkey";

ALTER TABLE "User"
  ADD CONSTRAINT "User_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Seed the default LIVE workspace and backfill existing users
INSERT INTO "Workspace" ("id", "name", "mode", "createdBy")
VALUES ('ws_live_default', 'Production', 'LIVE', 'migration')
ON CONFLICT ("id") DO NOTHING;

-- Backfill all existing users without a workspace to the default LIVE workspace
UPDATE "User"
SET "workspaceId" = 'ws_live_default'
WHERE "workspaceId" IS NULL;

-- 5. Seed the TEST workspace
INSERT INTO "Workspace" ("id", "name", "mode", "createdBy")
VALUES ('ws_test_default', 'System Agent Test', 'TEST', 'migration')
ON CONFLICT ("id") DO NOTHING;

-- 6. Add SYSTEM_AGENT to UserRole enum if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
    AND enumlabel = 'SYSTEM_AGENT'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'SYSTEM_AGENT';
  END IF;
END$$;

-- 7. RLS policies for workspace isolation (Supabase)
-- These ensure that users can only read/write data within their own workspace.
-- IMPORTANT: The application must set `app.workspace_id` on each database
-- session/request using: SET LOCAL app.workspace_id = '<workspace_id>';
-- This should be done in the server-side data access layer before any queries.

-- Workspace table: users can only see their own workspace
ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_isolation" ON "Workspace";
CREATE POLICY "workspace_isolation" ON "Workspace"
  FOR ALL
  USING ("id" = current_setting('app.workspace_id', true));

-- User table: users can only see users in the same workspace
DROP POLICY IF EXISTS "user_workspace_isolation" ON "User";
CREATE POLICY "user_workspace_isolation" ON "User"
  FOR ALL
  USING ("workspaceId" = current_setting('app.workspace_id', true));
