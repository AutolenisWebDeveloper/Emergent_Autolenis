import { NextResponse } from "next/server"
import { getSession, setSessionCookie } from "@/lib/auth-server"
import { createSession } from "@/lib/auth"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import bcrypt from "bcryptjs"
import { sendPasswordChangedEmail } from "@/lib/email/triggers"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

// POST /api/auth/change-password
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Current password and new password are required" },
        { status: 400 },
      )
    }

    // Validate new password complexity
    const passwordErrors: string[] = []
    if (newPassword.length < 8) passwordErrors.push("at least 8 characters")
    if (!/[A-Z]/.test(newPassword)) passwordErrors.push("an uppercase letter")
    if (!/[a-z]/.test(newPassword)) passwordErrors.push("a lowercase letter")
    if (!/[0-9]/.test(newPassword)) passwordErrors.push("a number")

    if (passwordErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: `Password must contain ${passwordErrors.join(", ")}` },
        { status: 400 },
      )
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Fetch user with password hash and current session version
    const { data: user, error: fetchError } = await supabase
      .from("User")
      .select("id, email, first_name, role, is_affiliate, workspace_id, workspace_mode, passwordHash, session_version")
      .eq("id", session.userId)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { success: false, error: "Password not set for this account" },
        { status: 400 },
      )
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 401 },
      )
    }

    // Hash new password and bump session_version to invalidate all prior sessions
    const newHash = await bcrypt.hash(newPassword, 10)
    const newSessionVersion = (user.session_version ?? 0) + 1

    const { error: updateError } = await supabase
      .from("User")
      .update({
        passwordHash: newHash,
        session_version: newSessionVersion,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", session.userId)

    if (updateError) {
      console.error("[ChangePassword] Update error:", updateError)
      return NextResponse.json({ success: false, error: "Failed to update password" }, { status: 500 })
    }

    // Re-issue session cookie with the new session_version so the current
    // session stays valid while all other (older) sessions are invalidated.
    const freshToken = await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      is_affiliate: user.is_affiliate ?? false,
      workspace_id: user.workspace_id ?? undefined,
      workspace_mode: user.workspace_mode ?? "LIVE",
      session_version: newSessionVersion,
    })
    await setSessionCookie(freshToken)

    // Send password changed security alert (fire-and-forget, non-blocking)
    sendPasswordChangedEmail(user.email, user.first_name || "there", session.userId).catch((err) => {
      logger.error("[ChangePassword] sendPasswordChangedEmail failed", { userId: session.userId, error: err as Error })
    })

    return NextResponse.json({ success: true, message: "Password changed successfully" })
  } catch (error: any) {
    console.error("[ChangePassword] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
