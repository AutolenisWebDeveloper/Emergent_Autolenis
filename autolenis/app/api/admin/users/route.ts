import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { AuthService } from "@/lib/services/auth.service"
import { isTestWorkspace } from "@/lib/app-mode"
import { randomUUID } from "crypto"
import { onUserCreated } from "@/lib/email/triggers"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { email, password, firstName, lastName, role, phone } = body

    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, firstName, lastName, and role are required" },
        { status: 400 }
      )
    }

    const validRoles = ["BUYER", "DEALER", "AFFILIATE"]
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      )
    }

    if (isTestWorkspace(user)) {
      return NextResponse.json({
        user: { id: randomUUID(), email, role, firstName, lastName },
      }, { status: 201 })
    }

    const result = await AuthService.signUp({
      email,
      password,
      firstName,
      lastName,
      role: role as "BUYER" | "DEALER" | "AFFILIATE",
      phone: phone || null,
    })

    // Fire email triggers (welcome email + admin notification) — non-blocking
    onUserCreated({
      userId: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName || firstName,
      role: result.user.role,
      referral: result.referral ? { code: result.referral.referralCode } : undefined,
    }).catch((err) => {
      logger.error("Admin create user: onUserCreated trigger failed", err as Error)
    })

    return NextResponse.json({ user: result.user }, { status: 201 })
  } catch (error) {
    console.error("[Admin Create User Error]", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}
