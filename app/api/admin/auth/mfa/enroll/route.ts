import { NextResponse } from "next/server"
import {
  getAdminSession,
  updateAdminSession,
  generateTotpSecret,
  generateTotpUri,
  generateQrCodeDataUrl,
  logAdminAction,
} from "@/lib/admin-auth"

export async function POST(_request: Request) {
  try {
    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: "Not authenticated. Please sign in first." }, { status: 401 })
    }

    if (session.mfaEnrolled) {
      return NextResponse.json({ error: "MFA already enrolled. Use the challenge endpoint." }, { status: 400 })
    }

    // Generate new TOTP secret
    const secret = generateTotpSecret()
    const factorId = crypto.randomUUID()
    const uri = generateTotpUri(secret, session.email)
    const qrCode = await generateQrCodeDataUrl(uri)

    // Store the secret temporarily in the session (will be saved permanently after verification)
    await updateAdminSession({ factorId })

    // Store secret temporarily in session (will be saved permanently after verification)
    // For now, we'll pass it back and expect it during verification

    await logAdminAction("MFA_ENROLL_STARTED", { userId: session.userId, email: session.email })

    return NextResponse.json({
      success: true,
      qrCode,
      secret, // User needs this for manual entry
      factorId,
    })
  } catch (error: any) {
    console.error("[MFA Enroll] Error:", error)
    return NextResponse.json({ error: "Failed to start MFA enrollment" }, { status: 500 })
  }
}
