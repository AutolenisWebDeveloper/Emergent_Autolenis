import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { generateTotpSecret, generateTotpUri, generateQrCodeDataUrl } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

// POST /api/auth/mfa/enroll — Start TOTP enrollment
export async function POST() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Check if already enrolled
    const { data: user } = await supabase
      .from("User")
      .select("id, email, mfa_enrolled")
      .eq("id", session.userId)
      .single()

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    if (user.mfa_enrolled) {
      return NextResponse.json(
        { success: false, error: "Two-factor authentication is already enabled" },
        { status: 400 },
      )
    }

    // Generate TOTP secret and QR code
    const secret = generateTotpSecret()
    const uri = generateTotpUri(secret, user.email)
    const qrCodeUrl = await generateQrCodeDataUrl(uri)
    const factorId = crypto.randomUUID()

    // Store the pending secret temporarily on the user record
    // It will be confirmed once the user verifies a code
    const { error: updateError } = await supabase
      .from("User")
      .update({
        mfa_secret: secret,
        mfa_factor_id: factorId,
      })
      .eq("id", session.userId)

    if (updateError) {
      console.error("[MFA Enroll] Update error:", updateError)
      return NextResponse.json({ success: false, error: "Failed to start enrollment" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        secret,
        qrCodeUrl,
        factorId,
      },
    })
  } catch (error: any) {
    console.error("[MFA Enroll] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
