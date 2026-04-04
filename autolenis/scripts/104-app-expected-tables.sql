-- ==========================================================================
-- InventoryImportLog — Used by dealer inventory bulk upload
--
-- Idempotent — safe to re-run.
-- ==========================================================================

CREATE TABLE IF NOT EXISTS "InventoryImportLog" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dealerId"        TEXT NOT NULL,
  "userId"          TEXT,
  "fileName"        TEXT NOT NULL,
  "fileSize"        BIGINT,
  "totalRows"       INTEGER DEFAULT 0,
  "successRows"     INTEGER DEFAULT 0,
  "failedRows"      INTEGER DEFAULT 0,
  "errors"          JSONB DEFAULT '[]'::jsonb,
  "status"          TEXT DEFAULT 'pending',
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "InventoryImportLog_dealerId_idx" ON "InventoryImportLog"("dealerId");
CREATE INDEX IF NOT EXISTS "InventoryImportLog_createdAt_idx" ON "InventoryImportLog"("createdAt" DESC);

-- RLS — service-role only
ALTER TABLE "InventoryImportLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "InventoryImportLog: service role bypass" ON "InventoryImportLog";
CREATE POLICY "InventoryImportLog: service role bypass"
  ON "InventoryImportLog" FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
