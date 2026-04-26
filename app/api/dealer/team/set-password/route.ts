import { NextResponse } from "next/server"
import { getSession, setSessionCookie } from "@/lib/auth-server"
import { createSession } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { requireDatabase } from "@/lib/require-database"
import { isDealerRole } from "@/lib/authz/roles"
import bcrypt from "bcryptjs"
import { logger } from "@/lib/logger"
import { z } from "zod"

export const dynamic = "force-dynamic"

const schema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
})

/**
 * POST /api/dealer/team/set-password
 *
 * Forced first-login password change for dealers.
 * Does not require the current (temporary) password.
 * Sets User.force_password_reset = false after successful update and
 * re-issues the session cookie with an incremented session_version.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (!isDealerRole(session.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Validation failed"
      return NextResponse.json({ success: false, error: msg }, { status: 400 })
    }
    const { newPassword } = parsed.data

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const supabase = await createClient()
    // Fetch user record
    const { data: user, error: fetchError } = await supabase
      .from("User")
      .select("id, email, first_name, role, is_affiliate, workspace_id, workspace_mode, session_version, force_password_reset")
      .eq("id", session.userId)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    const newSessionVersion = ((user.session_version as number) ?? 0) + 1

    const { error: updateError } = await supabase
      .from("User")
      .update({
        passwordHash: newHash,
        force_password_reset: false,
        session_version: newSessionVersion,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", session.userId)

    if (updateError) {
      logger.error("[SetPassword] Update error", { error: updateError })
      return NextResponse.json({ success: false, error: "Failed to update password" }, { status: 500 })
    }

    // Re-issue session cookie so the dealer stays logged in
    const freshToken = await createSession({
      userId: session.userId,
      email: session.email,
      role: session.role,
      is_affiliate: session.is_affiliate,
      workspace_id: session.workspace_id,
      workspace_mode: session.workspace_mode,
      session_version: newSessionVersion,
      mfa_verified: session.mfa_verified,
    })
    await setSessionCookie(freshToken)

    logger.info("[SetPassword] Password updated, force_password_reset cleared", {
      userId: session.userId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("[SetPassword] Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
