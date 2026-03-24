/**
 * Backfill Script: Migrate existing internal Users to Supabase Auth
 *
 * For each User where auth_user_id is NULL:
 *   1. Create a Supabase auth user via Admin API (email_confirm matches is_email_verified)
 *   2. Update internal User.auth_user_id with the Supabase auth user ID
 *   3. Set force_password_reset = true
 *   4. Send password recovery email via Supabase Admin API
 *   5. Increment session_version to invalidate existing sessions
 *
 * This script is IDEMPOTENT and RESUMABLE:
 *   - Users already having auth_user_id are skipped
 *   - Failed users are logged and can be retried
 *
 * Usage:
 *   npx tsx scripts/backfill-supabase-auth.ts
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DATABASE_URL (Prisma)
 */

import { createClient } from "@supabase/supabase-js"
import { writeFileSync } from "fs"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface BackfillResult {
  userId: string
  email: string
  status: "success" | "skipped" | "failed"
  authUserId?: string
  error?: string
}

async function backfill() {
  console.log("=== Supabase Auth Backfill Script ===")
  console.log(`Target: ${SUPABASE_URL}`)
  console.log(`Started: ${new Date().toISOString()}\n`)

  // Fetch all users without auth_user_id
  const { data: users, error: fetchError } = await supabase
    .from("User")
    .select("id, email, is_email_verified, role, first_name, session_version")
    .is("auth_user_id", null)
    .order("createdAt", { ascending: true })

  if (fetchError) {
    console.error("Failed to fetch users:", fetchError.message)
    process.exit(1)
  }

  if (!users || users.length === 0) {
    console.log("No users need backfilling. All users already have auth_user_id.")
    process.exit(0)
  }

  console.log(`Found ${users.length} users to backfill.\n`)

  const results: BackfillResult[] = []
  let successCount = 0
  let failCount = 0
  let skipCount = 0

  for (const user of users) {
    try {
      // Double-check: re-read to confirm still null (idempotency for concurrent runs)
      const { data: freshUser } = await supabase
        .from("User")
        .select("auth_user_id")
        .eq("id", user.id)
        .single()

      if (freshUser?.auth_user_id) {
        console.log(`[SKIP] ${user.email} — already has auth_user_id`)
        results.push({ userId: user.id, email: user.email, status: "skipped" })
        skipCount++
        continue
      }

      // 1. Create Supabase auth user
      const tempPassword = crypto.randomUUID() + "Aa1!" // Meets complexity requirements
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: tempPassword,
        email_confirm: user.is_email_verified ?? false,
        user_metadata: {
          internal_user_id: user.id,
          role: user.role,
          first_name: user.first_name,
        },
      })

      if (authError) {
        // If user already exists in auth, try to find and link them
        if (authError.message?.includes("already been registered")) {
          // Search by email via RPC (may not exist — non-fatal)
          try {
            const { data: existingByEmail } = await supabase
              .rpc("get_auth_user_by_email", { user_email: user.email })
              .single()

            const existingId = (existingByEmail as Record<string, unknown> | null)?.id as string | undefined
            if (existingId) {
              // Link existing auth user
              const { error: updateError } = await supabase
                .from("User")
                .update({
                  auth_user_id: existingId,
                  force_password_reset: true,
                  session_version: (user.session_version ?? 0) + 1,
                })
                .eq("id", user.id)

              if (!updateError) {
                console.log(`[LINKED] ${user.email} → ${existingId} (existing auth user)`)
                results.push({ userId: user.id, email: user.email, status: "success", authUserId: existingId })
                successCount++
                continue
              }
            }
          } catch {
            // RPC may not exist — fall through to error
          }
        }

        console.error(`[FAIL] ${user.email}: ${authError.message}`)
        results.push({ userId: user.id, email: user.email, status: "failed", error: authError.message })
        failCount++
        continue
      }

      const authUserId = authData.user.id

      // 2. Update internal User with auth_user_id
      const { error: updateError } = await supabase
        .from("User")
        .update({
          auth_user_id: authUserId,
          force_password_reset: true,
          session_version: (user.session_version ?? 0) + 1,
        })
        .eq("id", user.id)

      if (updateError) {
        console.error(`[FAIL] ${user.email}: Could not update internal User: ${updateError.message}`)
        results.push({ userId: user.id, email: user.email, status: "failed", error: updateError.message })
        failCount++
        continue
      }

      // 3. Generate password recovery link (sends email via Supabase)
      try {
        await supabase.auth.admin.generateLink({
          type: "recovery",
          email: user.email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || "https://autolenis.com"}/auth/reset-password`,
          },
        })
      } catch (recoveryErr: any) {
        console.warn(`[WARN] ${user.email}: Recovery email failed (non-fatal): ${recoveryErr.message}`)
      }

      console.log(`[OK] ${user.email} → ${authUserId}`)
      results.push({ userId: user.id, email: user.email, status: "success", authUserId })
      successCount++
    } catch (err: any) {
      console.error(`[FAIL] ${user.email}: ${err.message}`)
      results.push({ userId: user.id, email: user.email, status: "failed", error: err.message })
      failCount++
    }
  }

  // Write CSV report
  const csvHeader = "user_id,email,status,auth_user_id,error\n"
  const csvRows = results.map(
    (r) => `${r.userId},${r.email},${r.status},${r.authUserId || ""},${(r.error || "").replace(/,/g, ";")}`
  )
  const csvContent = csvHeader + csvRows.join("\n")
  const reportPath = `backfill-report-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`
  writeFileSync(reportPath, csvContent, "utf-8")

  console.log("\n=== Backfill Complete ===")
  console.log(`Success: ${successCount}`)
  console.log(`Skipped: ${skipCount}`)
  console.log(`Failed:  ${failCount}`)
  console.log(`Report:  ${reportPath}`)
}

backfill().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
