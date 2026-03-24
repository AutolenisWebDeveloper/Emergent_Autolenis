import { NextResponse } from "next/server"
import { logAdminAction } from "@/lib/admin-auth"
import { AuthService } from "@/lib/services/auth.service"
import { setSessionCookie } from "@/lib/auth-server"
import { rateLimit, rateLimits } from "@/lib/middleware/rate-limit"
import { handleError, AuthenticationError, ValidationError } from "@/lib/middleware/error-handler"
import { sendAdminNewDeviceEmail } from "@/lib/email/triggers"
import { logger } from "@/lib/logger"

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"]

export async function OPTIONS() {
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://autolenis.com'
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": appUrl,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID()
  try {
    const rateLimitResponse = await rateLimit(request as any, rateLimits.strict)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      throw new ValidationError("Email and password are required")
    }

    const identifier = email.toLowerCase()

    // Use the same AuthService.signIn used by regular sign-in to ensure
    // identical lookup, password verification, and session creation logic.
    let result
    try {
      result = await AuthService.signIn({ email: identifier, password })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("Invalid") || msg.includes("not found")) {
        await logAdminAction("LOGIN_FAILED", { email: identifier, reason: "invalid_credentials" })
        console.error(`signin_failed reason=invalid_credentials route=/api/admin/auth/signin correlationId=${correlationId}`)
        throw new AuthenticationError("Invalid email or password")
      }
      // Re-throw non-authentication errors (workspace lookup, DB issues, etc.)
      console.error(`signin_failed reason=service_error route=/api/admin/auth/signin correlationId=${correlationId} error=${msg}`)
      throw error
    }

    // Verify the authenticated user holds an admin-level role
    if (!ADMIN_ROLES.includes(result.user.role)) {
      await logAdminAction("LOGIN_FAILED", { email: identifier, reason: "insufficient_role", role: result.user.role })
      console.error(`signin_failed reason=insufficient_role route=/api/admin/auth/signin correlationId=${correlationId}`)
      throw new AuthenticationError("Invalid email or password")
    }

    await setSessionCookie(result.token)

    await logAdminAction("LOGIN_SUCCESS", { email: identifier, userId: result.user.id })

    // Send new-device security alert to the admin (fire-and-forget, non-blocking)
    sendAdminNewDeviceEmail(
      result.user.email,
      result.user.firstName || "there",
      result.user.id,
      {
        ip: (request as any).headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
          (request as any).headers?.get?.("x-real-ip") || undefined,
        userAgent: (request as any).headers?.get?.("user-agent") || undefined,
      }
    ).catch((err: unknown) => {
      logger.error("[Admin Signin] sendAdminNewDeviceEmail failed", { userId: result.user.id, error: err as Error })
    })

    return NextResponse.json({
      success: true,
      redirect: "/admin/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ success: false, error: "Authentication failed", correlationId }, { status: 401 })
    }
    console.error(`signin_failed reason=unhandled route=/api/admin/auth/signin correlationId=${correlationId} error=${error instanceof Error ? error.message : String(error)} stack=${error instanceof Error ? error.stack : ""}`)
    return NextResponse.json(
      { success: false, error: "Sign-in failed. Please try again.", correlationId },
      { status: 500 },
    )
  }
}
