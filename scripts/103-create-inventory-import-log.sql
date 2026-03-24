-- Inventory Import Log table
-- Tracks dealer inventory CSV/TSV/TXT bulk-upload history.
-- Queried via Supabase PostgREST in dealer inventory routes.

CREATE TABLE IF NOT EXISTS inventory_import_log (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dealer_id   TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_size   BIGINT NOT NULL DEFAULT 0,
  total_rows  INTEGER NOT NULL DEFAULT 0,
  success_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  errors      JSONB DEFAULT '[]'::jsonb,
  status      TEXT NOT NULL DEFAULT 'completed',
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_import_log_dealer
  ON inventory_import_log (dealer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_import_log_created
  ON inventory_import_log (created_at DESC);

-- RLS: service-role only (accessed via admin Supabase client)
ALTER TABLE inventory_import_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_import_log_service_role_all"
  ON inventory_import_log
  FOR ALL
  USING (false)
  WITH CHECK (false);
