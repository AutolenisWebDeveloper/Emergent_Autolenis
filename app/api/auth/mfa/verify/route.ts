import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { verifyTotp } from "@/lib/admin-auth"
import { sendMfaEnabledEmail } from "@/lib/email/triggers"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

// POST /api/auth/mfa/verify — Verify TOTP code and enable 2FA
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { code } = body

    if (!code || typeof code !== "string" || code.length !== 6) {
      return NextResponse.json(
        { success: false, error: "A valid 6-digit code is required" },
        { status: 400 },
      )
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Get user with pending MFA secret
    const { data: user } = await supabase
      .from("User")
      .select("id, email, first_name, mfa_secret, mfa_enrolled")
      .eq("id", session.userId)
      .single()

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    if (!user.mfa_secret) {
      return NextResponse.json(
        { success: false, error: "No enrollment in progress. Please start enrollment first." },
        { status: 400 },
      )
    }

    // Verify the TOTP code
    const isValid = verifyTotp(user.mfa_secret, code)

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid code. Please try again." },
        { status: 400 },
      )
    }

    // Enable MFA
    const { error: updateError } = await supabase
      .from("User")
      .update({
        mfa_enrolled: true,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", session.userId)

    if (updateError) {
      console.error("[MFA Verify] Update error:", updateError)
      return NextResponse.json({ success: false, error: "Failed to enable 2FA" }, { status: 500 })
    }

    // Send MFA enabled security alert (fire-and-forget, non-blocking)
    sendMfaEnabledEmail(user.email, user.first_name || "there", session.userId).catch((err) => {
      logger.error("[MFA Verify] sendMfaEnabledEmail failed", err as Error)
    })

    return NextResponse.json({
      success: true,
      message: "Two-factor authentication enabled successfully",
    })
  } catch (error: any) {
    console.error("[MFA Verify] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
