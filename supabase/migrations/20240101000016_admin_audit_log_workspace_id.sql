-- FIX 16: Add workspaceId to AdminAuditLog for tenant-scoped audit queries

ALTER TABLE "AdminAuditLog"
  ADD COLUMN IF NOT EXISTS "workspaceId" TEXT REFERENCES "Workspace"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_admin_audit_log_workspace_id"
  ON "AdminAuditLog" ("workspaceId");
