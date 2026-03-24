import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { verifyTotp } from "@/lib/admin-auth"
import bcrypt from "bcryptjs"
import { sendMfaDisabledEmail } from "@/lib/email/triggers"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

// POST /api/auth/mfa/disable — Disable 2FA (requires password + TOTP code)
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { password, code } = body

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required to disable 2FA" },
        { status: 400 },
      )
    }

    if (!code || typeof code !== "string" || code.length !== 6) {
      return NextResponse.json(
        { success: false, error: "A valid 6-digit code is required" },
        { status: 400 },
      )
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Get user with MFA secret and password hash
    const { data: user } = await supabase
      .from("User")
      .select("id, email, first_name, passwordHash, mfa_secret, mfa_enrolled")
      .eq("id", session.userId)
      .single()

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    if (!user.mfa_enrolled) {
      return NextResponse.json(
        { success: false, error: "Two-factor authentication is not enabled" },
        { status: 400 },
      )
    }

    // Verify password
    if (!user.passwordHash) {
      return NextResponse.json(
        { success: false, error: "Password not set for this account" },
        { status: 400 },
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect password" },
        { status: 401 },
      )
    }

    // Verify TOTP code
    if (!user.mfa_secret) {
      return NextResponse.json(
        { success: false, error: "MFA configuration error" },
        { status: 500 },
      )
    }

    const isTotpValid = verifyTotp(user.mfa_secret, code)
    if (!isTotpValid) {
      return NextResponse.json(
        { success: false, error: "Invalid authentication code" },
        { status: 400 },
      )
    }

    // Disable MFA
    const { error: updateError } = await supabase
      .from("User")
      .update({
        mfa_enrolled: false,
        mfa_secret: null,
        mfa_factor_id: null,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", session.userId)

    if (updateError) {
      console.error("[MFA Disable] Update error:", updateError)
      return NextResponse.json({ success: false, error: "Failed to disable 2FA" }, { status: 500 })
    }

    // Send MFA disabled security alert (fire-and-forget, non-blocking)
    sendMfaDisabledEmail(user.email, user.first_name || "there", session.userId).catch((err) => {
      logger.error("[MFA Disable] sendMfaDisabledEmail failed", err as Error)
    })

    return NextResponse.json({
      success: true,
      message: "Two-factor authentication disabled successfully",
    })
  } catch (error: any) {
    console.error("[MFA Disable] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
