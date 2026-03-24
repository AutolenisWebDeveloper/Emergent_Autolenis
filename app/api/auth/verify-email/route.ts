import { NextResponse } from "next/server"
import { emailVerificationService } from "@/lib/services/email-verification.service"
import { logger } from "@/lib/logger"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    logger.info("[VerifyEmail] Callback entry", { hasToken: !!token })

    if (!token) {
      return NextResponse.redirect(new URL("/auth/verify-email?error=missing_token", request.url))
    }

    const result = await emailVerificationService.verifyEmail(token)

    if (!result.success) {
      logger.warn("[VerifyEmail] Verification failed", { message: result.message })
      return NextResponse.redirect(
        new URL(`/auth/verify-email?error=${encodeURIComponent(result.message)}`, request.url),
      )
    }

    logger.info("[VerifyEmail] Verification succeeded", { userId: result.userId })
    return NextResponse.redirect(new URL("/auth/verify-email?success=true", request.url))
  } catch (error: any) {
    logger.error("[VerifyEmail] Unexpected error", { error: error.message })
    return NextResponse.redirect(new URL("/auth/verify-email?error=verification_failed", request.url))
  }
}
