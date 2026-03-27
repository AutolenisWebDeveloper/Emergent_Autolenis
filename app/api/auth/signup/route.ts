import { NextResponse } from "next/server"
import { AuthService } from "@/lib/services/auth.service"
import { signUpSchema } from "@/lib/validators/auth"
import { setSessionCookie } from "@/lib/auth-server"
import { getRoleBasedRedirect } from "@/lib/auth"
import { rateLimit, rateLimits } from "@/lib/middleware/rate-limit"
import { handleError, ConflictError, ValidationError } from "@/lib/middleware/error-handler"
import { logger } from "@/lib/logger"
import { onUserCreated } from "@/lib/email/triggers"
import { emailVerificationService } from "@/lib/services/email-verification.service"

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
  logger.info("SignUp request received")

  // ── Parse & validate BEFORE env-var check and rate limiting ─────────────
  // This ensures schema validation errors always return 400, even in CI
  // environments where Supabase is not configured.
  let body
  try {
    body = await request.json()
  } catch (parseError) {
    logger.error("Failed to parse signup request body", { error: parseError })
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request format",
      },
      { status: 400 },
    )
  }

  logger.debug("Parsing signup request", { email: body.email })

  // Use safeParse to guarantee validation errors always return 400, never 500
  const parseResult = signUpSchema.safeParse(body)
  if (!parseResult.success) {
    const fields: Record<string, string> = {}
    parseResult.error.errors.forEach((err) => {
      fields[err.path.join(".")] = err.message
    })
    logger.debug("Signup validation failed", { fields })
    return NextResponse.json(
      {
        success: false,
        error: parseResult.error.errors[0]?.message || "Validation failed",
        code: "VALIDATION_ERROR",
        fields,
      },
      { status: 400 },
    )
  }
  const validated = parseResult.data

  if (!process.env['NEXT_PUBLIC_SUPABASE_URL'] || !process.env['SUPABASE_SERVICE_ROLE_KEY']) {
    logger.error("Missing required environment variables for signup")
    return NextResponse.json(
      {
        success: false,
        error: "Server configuration error. Please contact support.",
      },
      { status: 503 },
    )
  }

  // ── Rate-limit only valid-looking requests ─────────────────────────────
  try {
    const rateLimitResponse = await rateLimit(request as any, rateLimits.auth)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    logger.debug("Signup input validated, calling AuthService")

    const result = await AuthService.signUp(validated)
    logger.info("Sign up successful", { userId: result.user.id, role: result.user.role })

    const { user, token } = result

    await setSessionCookie(token)

    // Track email send outcomes for truthful UX
    let verificationEmailQueued = true
    let welcomeEmailQueued = true

    // Fire email triggers asynchronously (best-effort, do not block response)
    onUserCreated({
      userId: user.id,
      email: user.email,
      firstName: user.firstName || validated.firstName,
      role: user.role,
      referral: result.referral ? { code: result.referral.referralCode } : undefined,
      packageTier: user.packageTier ?? undefined,
    }).catch((err) => {
      welcomeEmailQueued = false
      logger.error("Welcome email trigger failed (non-fatal)", err as Error)
    })

    // Send verification email (fire-and-forget — never block signup response)
    emailVerificationService.createVerificationToken(user.id, user.email).catch((err) => {
      verificationEmailQueued = false
      logger.error("Verification email send failed after signup (non-fatal)", err as Error)
    })

    const redirect = getRoleBasedRedirect(user.role, true)

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
    if ((error instanceof Error ? error.message : "").includes("already exists")) {
      return handleError(new ConflictError("An account with this email already exists"))
    }
    // Catch validation-like errors from AuthService (e.g. missing package tier)
    if ((error instanceof Error ? error.message : "").includes("Package tier is required") ||
        (error instanceof Error ? error.message : "").includes("Validation")) {
      return handleError(new ValidationError("Registration validation failed. Please check your input."))
    }
    // All other errors — structured response, never expose internal details
    logger.error("Signup service error", error instanceof Error ? error : undefined)
    return NextResponse.json(
      {
        success: false,
        error: "Unable to complete registration. Please try again later.",
        code: "SERVICE_ERROR",
      },
      { status: 422 },
    )
  }
}
