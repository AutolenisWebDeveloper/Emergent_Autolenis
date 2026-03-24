import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hashPassword } from "@/lib/auth-server"
import { rateLimit, rateLimits } from "@/lib/middleware/rate-limit"
import { handleError, ValidationError, ConflictError } from "@/lib/middleware/error-handler"
import { getAdminSession } from "@/lib/admin-auth"

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
  try {
    const rateLimitResponse = await rateLimit(request as any, rateLimits.strict)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const { email, password, firstName, lastName, bootstrapSecret } = body

    // SECURITY: Only existing admins can create new admin accounts.
    // Exception: when ADMIN_BOOTSTRAP_SECRET is set, the very first admin
    // can be created by including the matching `bootstrapSecret` in the body.
    const session = await getAdminSession()
    const isAdmin = session && (session.role === "ADMIN" || session.role === "SUPER_ADMIN")

    if (!isAdmin) {
      const envSecret = process.env["ADMIN_BOOTSTRAP_SECRET"]
      const isBootstrap = envSecret && bootstrapSecret === envSecret

      if (!isBootstrap) {
        return NextResponse.json({ error: "Admin authentication required to create admin accounts" }, { status: 401 })
      }
    }

    if (!email || !password || !firstName || !lastName) {
      throw new ValidationError("All fields are required")
    }

    const emailRegex = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/
    if (!emailRegex.test(email)) {
      throw new ValidationError("Invalid email format")
    }

    if (password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters")
    }

    // Admin accounts require stronger passwords
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      throw new ValidationError("Password must contain uppercase, lowercase, and number")
    }

    const supabase = createAdminClient()

    const { data: existingUsers } = await supabase.from("User").select("id").eq("email", email.toLowerCase()).limit(1)

    if (existingUsers && existingUsers.length > 0) {
      throw new ConflictError("An account with this email already exists")
    }

    const passwordHash = await hashPassword(password)

    const userId = crypto.randomUUID()
    const now = new Date().toISOString()

    const { data: newUsers, error: userError } = await supabase
      .from("User")
      .insert({
        id: userId,
        email: email.toLowerCase(),
        passwordHash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        role: "ADMIN",
        is_email_verified: true,
        createdAt: now,
        updatedAt: now,
      })
      .select("id, email, role")

    if (userError) {
      console.error("[Admin Signup] User creation error:", userError.message)
      throw new Error("Failed to create account")
    }

    if (!newUsers || newUsers.length === 0) {
      throw new Error("Failed to create account")
    }

    return NextResponse.json({
      success: true,
      message: "Admin account created successfully",
    })
  } catch (error) {
    return handleError(error)
  }
}
