/**
 * migrate-documents.js
 *
 * Creates the buyer-documents and affiliate-documents storage buckets via the
 * Supabase JS client, then prints the path to the SQL file that must be run
 * manually in the Supabase SQL editor to create the three document tables.
 *
 * Run: node scripts/migrate-documents.js
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[migrate-documents] ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

async function ensureBucket(name, fileSizeLimit, allowedMimeTypes) {
  const { data: existing } = await supabase.storage.getBucket(name)
  if (existing) {
    console.log(`[migrate-documents] Bucket "${name}": already exists — OK.`)
    return
  }
  const { error } = await supabase.storage.createBucket(name, {
    public: false,
    fileSizeLimit,
    allowedMimeTypes,
  })
  if (error && !error.message?.includes("already exists")) {
    console.error(`[migrate-documents] Bucket "${name}" ERROR:`, error.message)
  } else {
    console.log(`[migrate-documents] Bucket "${name}": created.`)
  }
}

async function main() {
  console.log("[migrate-documents] Step 1/2 — Creating storage buckets via Supabase JS client...")

  await ensureBucket("buyer-documents", 26214400, [
    "application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp",
  ])
  await ensureBucket("affiliate-documents", 10485760, [
    "application/pdf", "image/jpeg", "image/jpg", "image/png",
  ])

  console.log("")
  console.log("[migrate-documents] Step 2/2 — Database tables require manual SQL execution.")
  console.log("")
  console.log("=".repeat(72))
  console.log("  ACTION REQUIRED: Run the following SQL file in the Supabase SQL editor:")
  console.log("  Dashboard → SQL Editor → New query → paste the contents of:")
  console.log("")
  console.log("    scripts/migrate-documents.sql")
  console.log("")
  console.log("  This creates DealDocument, DocumentRequest, AffiliateDocument tables")
  console.log("  with all required columns, indexes, and service-role RLS policies.")
  console.log("=".repeat(72))
  console.log("")

  // Print the SQL inline for convenience
  try {
    const sql = readFileSync(join(__dirname, "migrate-documents.sql"), "utf8")
    console.log("--- SQL START ---")
    console.log(sql)
    console.log("--- SQL END ---")
  } catch {
    console.log("(Could not read SQL file — open scripts/migrate-documents.sql directly.)")
  }
}

main().catch((err) => {
  console.error("[migrate-documents] Fatal:", err)
  process.exit(1)
})
