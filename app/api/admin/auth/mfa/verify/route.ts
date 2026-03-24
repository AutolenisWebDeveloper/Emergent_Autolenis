import { NextResponse } from "next/server"
import {
  getAdminSession,
  updateAdminSession,
  checkMfaRateLimit,
  recordMfaAttempt,
  verifyTotp,
  saveMfaSecret,
  logAdminAction,
  clearAdminSession,
} from "@/lib/admin-auth"
import { createSession } from "@/lib/auth"
import { setSessionCookie } from "@/lib/auth-server"
import { supabase, isDatabaseConfigured } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { code, isEnrollment, factorId, secret } = await request.json()

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 })
    }

    const session = await getAdminSession()

    if (!session) {
      return NextResponse.json({ error: "Not authenticated. Please sign in first." }, { status: 401 })
    }

    // Check MFA rate limit
    const rateLimit = await checkMfaRateLimit(session.userId)
    if (!rateLimit.allowed) {
      await logAdminAction("MFA_BLOCKED", { userId: session.userId, reason: "rate_limit" })
      await clearAdminSession()
      return NextResponse.json({ error: "Too many failed attempts. Please sign in again." }, { status: 429 })
    }

    let mfaSecret: string | null = null

    if (isEnrollment && secret) {
      // During enrollment, the secret is passed from the client
      mfaSecret = secret
    } else if (isDatabaseConfigured()) {
      // For challenge, get the secret from the database
      const { data } = await supabase.from("User").select("mfaSecret").eq("id", session.userId).maybeSingle()

      mfaSecret = data?.mfaSecret
    }

    if (!mfaSecret) {
      return NextResponse.json({ error: "MFA not configured. Please enroll first." }, { status: 400 })
    }

    // Verify the TOTP code
    const isValid = verifyTotp(mfaSecret, code)

    if (!isValid) {
      await recordMfaAttempt(session.userId, false)
      await logAdminAction("MFA_FAILED", { userId: session.userId })
      return NextResponse.json(
        {
          error: "Invalid verification code",
          attemptsRemaining: (rateLimit.attemptsRemaining || 1) - 1,
        },
        { status: 401 },
      )
    }

    // Successful verification
    await recordMfaAttempt(session.userId, true)

    if (isEnrollment && factorId) {
      // Save MFA secret to database
      await saveMfaSecret(session.userId, mfaSecret, factorId)
      await updateAdminSession({ mfaEnrolled: true })
      await logAdminAction("MFA_ENROLLED", { userId: session.userId })
    }

    // Mark MFA as verified
    await updateAdminSession({ mfaVerified: true })
    await logAdminAction("MFA_VERIFIED", { userId: session.userId })

    // Look up workspace for the admin user — safe fallback to LIVE
    let workspaceId: string | undefined
    let workspaceMode: "LIVE" | "TEST" = "LIVE"
    try {
      if (isDatabaseConfigured()) {
        const { data: userRow } = await supabase
          .from("User")
          .select("workspaceId")
          .eq("id", session.userId)
          .maybeSingle()
        if (userRow?.workspaceId) {
          workspaceId = userRow.workspaceId
          const { data: wsRow } = await supabase
            .from("Workspace")
            .select("mode")
            .eq("id", workspaceId)
            .maybeSingle()
          if (wsRow?.mode) {
            workspaceMode = wsRow.mode as "LIVE" | "TEST"
          }
        }
      }
    } catch {
      // Workspace lookup failed — proceed with LIVE defaults
      console.warn("[MFA Verify] Workspace lookup failed, defaulting to LIVE")
      workspaceId = undefined
      workspaceMode = "LIVE"
    }

    // Create the main session token
    const token = await createSession({
      userId: session.userId,
      email: session.email,
      role: session.role,
      workspace_id: workspaceId,
      workspace_mode: workspaceMode,
      mfa_verified: true,
    })
    await setSessionCookie(token)

    return NextResponse.json({
      success: true,
      message: isEnrollment ? "MFA enrolled successfully" : "MFA verified successfully",
    })
  } catch (error: any) {
    console.error("[MFA Verify] Error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
