import { NextResponse } from "next/server"
import { AuthService } from "@/lib/services/auth.service"
import { signInSchema } from "@/lib/validators/auth"
import { setSessionCookie } from "@/lib/auth-server"
import { getRoleBasedRedirect } from "@/lib/auth"
import { rateLimit, rateLimits } from "@/lib/middleware/rate-limit"
import { logger } from "@/lib/logger"

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
  logger.info("SignIn request received", { correlationId })

  // ── Parse & validate BEFORE env-var check ─────────────────────────────
  // This ensures schema validation errors always return 400, even in CI
  // environments where Supabase is not configured.
  let body
  try {
    body = await request.json()
  } catch (parseError) {
    logger.error("Failed to parse signin request body", parseError, { correlationId })
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request format",
      },
      { status: 400 },
    )
  }

  logger.debug("Parsing signin request", { email: body.email, correlationId })

  // Use safeParse so invalid inputs always return 400, never 500
  const parseResult = signInSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: parseResult.error.errors[0]?.message || "Validation failed",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    )
  }
  const validated = parseResult.data

  if (!process.env['NEXT_PUBLIC_SUPABASE_URL'] || !process.env['SUPABASE_SERVICE_ROLE_KEY']) {
    logger.error("Missing required environment variables for signin", undefined, { correlationId })
    return NextResponse.json(
      {
        success: false,
        error: "Server configuration error. Please contact support.",
      },
      { status: 503 },
    )
  }

  try {
    const rateLimitResponse = await rateLimit(request as any, rateLimits.signin)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    logger.debug("Signin input validated, calling AuthService", { correlationId })

    const result = await AuthService.signIn(validated)
    logger.info("Sign in successful", { userId: result.user.id, email: result.user.email, correlationId })

    const { user, token } = result

    await setSessionCookie(token)
    logger.debug("Session cookie set for signin", { correlationId })

    const redirect = getRoleBasedRedirect(user.role)
    logger.debug("Redirecting after signin", { redirect, role: user.role, correlationId })

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        redirect,
      },
    })
  } catch (error: unknown) {
    if (error.code === "EMAIL_NOT_VERIFIED") {
      logger.info("Signin: email not verified", { correlationId })
      return NextResponse.json(
        {
          success: false,
          error: "EMAIL_NOT_VERIFIED",
          requiresEmailVerification: true,
          message: "Please verify your email address before signing in.",
          verificationEmailSent: true,
        },
        { status: 403 },
      )
    }
    if (error.message?.includes("Invalid") || error.message?.includes("not found")) {
      logger.warn("Signin: invalid credentials", { correlationId })
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      )
    }
    logger.error("Signin: unhandled error", { correlationId, error: error?.message })
    return NextResponse.json(
      { success: false, error: "Sign-in failed. Please try again.", correlationId },
      { status: 500 },
    )
  }
}
