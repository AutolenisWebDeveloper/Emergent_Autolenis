import { NextResponse } from "next/server"
import { z } from "zod"
import { emailVerificationService } from "@/lib/services/email-verification.service"
import { rateLimit, rateLimits } from "@/lib/middleware/rate-limit"
import { logger } from "@/lib/logger"

const GENERIC_RESPONSE = {
  ok: true,
  message: "If that email exists, we sent a new verification link.",
}

const resendSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  // Always return the same generic response to prevent email enumeration
  try {
    // Rate limit by IP
    const ipRateLimitResponse = await rateLimit(request as any, rateLimits.resendVerification)
    if (ipRateLimitResponse) {
      // Rate limited — still return 200 generic to avoid leaking info
      logger.info("Resend verification rate-limited by IP")
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
    }

    let body: { email?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
    }

    const parsed = resendSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase()

    // Rate limit by normalized email
    const emailRateLimitResponse = await rateLimit(request as any, {
      ...rateLimits.resendVerification,
      keyGenerator: () => `resend-email:${normalizedEmail}`,
    })
    if (emailRateLimitResponse) {
      logger.info("Resend verification rate-limited by email")
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
    }

    // Fire-and-forget: never let internal errors change the response
    try {
      await emailVerificationService.resendVerificationByEmail(normalizedEmail)
    } catch (err) {
      logger.error("Resend verification internal error", err as Error)
    }

    return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
  } catch (err) {
    logger.error("Resend verification unexpected error", err as Error)
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
  }
}
