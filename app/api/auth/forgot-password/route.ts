import { NextResponse } from "next/server"
import { passwordResetService } from "@/lib/services/password-reset.service"
import { z } from "zod"
import { rateLimit, rateLimits } from "@/lib/middleware/rate-limit"
import { handleError } from "@/lib/middleware/error-handler"

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await rateLimit(request as any, rateLimits.auth)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    const result = await passwordResetService.requestPasswordReset(email)

    return NextResponse.json({ success: true, message: result.message })
  } catch (error) {
    return handleError(error)
  }
}
