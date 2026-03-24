import { NextResponse } from "next/server"
import { passwordResetService } from "@/lib/services/password-reset.service"
import { z } from "zod"

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

// GET - Validate token
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ success: false, valid: false, error: "Reset token is required" }, { status: 400 })
    }

    const result = await passwordResetService.validateToken(token)

    return NextResponse.json({ success: true, valid: result.valid, message: result.message })
  } catch (error) {
    console.error("[ResetPassword] Validation error:", error)
    return NextResponse.json({ success: false, valid: false, error: "Invalid reset link" }, { status: 500 })
  }
}

// POST - Reset password
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, password } = resetPasswordSchema.parse(body)

    const result = await passwordResetService.resetPassword(token, password)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return NextResponse.json({ success: false, error: firstError?.message || "Validation error" }, { status: 400 })
    }

    console.error("[ResetPassword] Error:", error)
    return NextResponse.json({ success: false, error: "An error occurred. Please try again." }, { status: 500 })
  }
}
