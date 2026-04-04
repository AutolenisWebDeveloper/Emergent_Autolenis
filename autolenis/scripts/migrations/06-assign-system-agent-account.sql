-- Migration: Assign autolenis01@gmail.com as the SYSTEM_AGENT in the TEST workspace.
--
-- This is the ONLY account permitted to seed test data and access /test/* routes.
-- All other accounts remain in the default LIVE workspace and will never see
-- mock data, mock banners, or /test pages.
--
-- Prerequisites: migration 04 (Workspace table + SYSTEM_AGENT role) must have run first.

-- 1. If the user already exists, move them to the TEST workspace and set role to SYSTEM_AGENT
UPDATE "User"
SET "workspaceId" = 'ws_test_default',
    "role" = 'SYSTEM_AGENT'
WHERE "email" = 'autolenis01@gmail.com';

-- 2. Ensure LIVE validation accounts are explicitly in the LIVE workspace
--    (idempotent — won't fail if accounts don't exist yet)
UPDATE "User"
SET "workspaceId" = 'ws_live_default'
WHERE "email" IN (
  'markist@protecwise.com',
  'markist678@gmail.com',
  'info@autolenis.com'
)
AND ("workspaceId" IS NULL OR "workspaceId" != 'ws_live_default');
