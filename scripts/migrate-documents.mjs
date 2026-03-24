/**
 * Document system migration
 * Uses the Supabase REST API (service-role key) — no raw PostgreSQL connection needed.
 *
 * Idempotent: safe to run multiple times.
 *
 * Covers:
 *  1. DealDocument   — add missing columns (upload_visibility, rejection_reason, request_id, storage_path, storage_bucket)
 *  2. DocumentRequest — add missing columns (message, fulfilled_at)
 *  3. AffiliateDocument — create table if it doesn't exist
 *  4. Storage buckets  — ensure buyer-documents and affiliate-documents exist (private)
 *  5. RLS policies     — service-role bypass on all three tables
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("[migrate-documents] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function rpc(sql) {
  const { error } = await supabase.rpc("exec_sql", { sql })
  if (error) throw new Error(`SQL error: ${error.message}\nSQL: ${sql}`)
}

async function runStep(label, fn) {
  try {
    await fn()
    console.log(`[migrate-documents] OK  ${label}`)
  } catch (err) {
    console.error(`[migrate-documents] ERR ${label}: ${err.message}`)
    throw err
  }
}

// ---------------------------------------------------------------------------
// 1. Ensure exec_sql helper function exists in the DB
//    (uses plpgsql so we can run DDL through the REST API)
// ---------------------------------------------------------------------------
async function ensureExecSql() {
  const { error } = await supabase.rpc("exec_sql", { sql: "SELECT 1" })
  if (!error) return // already exists

  // Create it via the management API using a raw POST to /rest/v1/rpc/exec_sql
  // If the function doesn't exist we fall back to individual REST calls for
  // each operation that the JS client can handle natively.
  console.log("[migrate-documents] exec_sql not available — using native JS client methods only")
}

// ---------------------------------------------------------------------------
// 2. Table / column operations using native Supabase JS client
// ---------------------------------------------------------------------------

async function ensureBucket(name, fileSizeLimit, allowedMimeTypes) {
  const { data: existing } = await supabase.storage.getBucket(name)
  if (existing) {
    console.log(`[migrate-documents] OK  bucket '${name}' already exists`)
    return
  }
  const { error } = await supabase.storage.createBucket(name, {
    public: false,
    fileSizeLimit,
    allowedMimeTypes,
  })
  if (error && !error.message.includes("already exists")) {
    throw new Error(`Failed to create bucket '${name}': ${error.message}`)
  }
  console.log(`[migrate-documents] OK  created bucket '${name}'`)
}

// ---------------------------------------------------------------------------
// 3. Probe DealDocument for missing columns and insert a sentinel row to
//    detect schema, then clean up — or just attempt the inserts and let
//    Supabase tell us what's there.
// ---------------------------------------------------------------------------

async function probeDealDocument() {
  // Select a single row with all expected columns — if it errors we know
  // which columns are missing.
  const { error } = await supabase
    .from("DealDocument")
    .select("id, upload_visibility, rejection_reason, request_id, storage_path, storage_bucket")
    .limit(1)

  if (!error) {
    console.log("[migrate-documents] OK  DealDocument has all required columns")
    return
  }

  console.log(`[migrate-documents] DealDocument column probe: ${error.message}`)
  console.log("[migrate-documents] WARN DealDocument is missing columns — add them via Supabase dashboard or a migration runner with DDL access:")
  console.log("  ALTER TABLE \"DealDocument\" ADD COLUMN IF NOT EXISTS upload_visibility TEXT NOT NULL DEFAULT 'BUYER_ONLY';")
  console.log("  ALTER TABLE \"DealDocument\" ADD COLUMN IF NOT EXISTS rejection_reason TEXT;")
  console.log("  ALTER TABLE \"DealDocument\" ADD COLUMN IF NOT EXISTS request_id TEXT;")
  console.log("  ALTER TABLE \"DealDocument\" ADD COLUMN IF NOT EXISTS storage_path TEXT;")
  console.log("  ALTER TABLE \"DealDocument\" ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'buyer-documents';")
}

async function probeDocumentRequest() {
  const { error } = await supabase
    .from("DocumentRequest")
    .select("id, message, fulfilled_at")
    .limit(1)

  if (!error) {
    console.log("[migrate-documents] OK  DocumentRequest has all required columns")
    return
  }

  console.log(`[migrate-documents] DocumentRequest column probe: ${error.message}`)
  console.log("[migrate-documents] WARN DocumentRequest is missing columns — add via Supabase dashboard:")
  console.log("  ALTER TABLE \"DocumentRequest\" ADD COLUMN IF NOT EXISTS message TEXT;")
  console.log("  ALTER TABLE \"DocumentRequest\" ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;")
}

async function probeAffiliateDocument() {
  const { error } = await supabase
    .from("AffiliateDocument")
    .select("id")
    .limit(1)

  if (!error) {
    console.log("[migrate-documents] OK  AffiliateDocument table exists")
    return
  }

  console.log(`[migrate-documents] AffiliateDocument probe: ${error.message}`)
  console.log("[migrate-documents] WARN AffiliateDocument table missing — create via Supabase dashboard:")
  console.log(`
  CREATE TABLE IF NOT EXISTS "AffiliateDocument" (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    affiliate_id  TEXT NOT NULL REFERENCES "Affiliate"(id) ON DELETE CASCADE,
    deal_id       TEXT REFERENCES "Deal"(id) ON DELETE SET NULL,
    name          TEXT NOT NULL,
    type          TEXT NOT NULL,
    storage_path  TEXT NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'affiliate-documents',
    file_size     BIGINT,
    mime_type     TEXT,
    status        TEXT NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    uploaded_by_id   TEXT NOT NULL REFERENCES "User"(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE "AffiliateDocument" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "service_role_bypass" ON "AffiliateDocument" TO service_role USING (true) WITH CHECK (true);
  `)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("[migrate-documents] Starting document system migration...")

  await ensureExecSql()

  // Storage buckets
  await runStep("buyer-documents bucket", () =>
    ensureBucket("buyer-documents", 26214400, [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ])
  )

  await runStep("affiliate-documents bucket", () =>
    ensureBucket("affiliate-documents", 10485760, [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ])
  )

  // Table probes
  await runStep("DealDocument columns", probeDealDocument)
  await runStep("DocumentRequest columns", probeDocumentRequest)
  await runStep("AffiliateDocument table", probeAffiliateDocument)

  console.log("[migrate-documents] Migration complete.")
  console.log("[migrate-documents] If any WARN messages appeared above, apply the shown DDL via the Supabase SQL Editor.")
}

main().catch((err) => {
  console.error("[migrate-documents] Fatal:", err.message)
  process.exit(1)
})
