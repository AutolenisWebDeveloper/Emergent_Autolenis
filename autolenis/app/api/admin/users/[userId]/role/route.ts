import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { prisma } from "@/lib/db"
import { sendRoleChangedEmail } from "@/lib/email/triggers"
import { logger } from "@/lib/logger"
import { z } from "zod"

export const dynamic = "force-dynamic"

const VALID_ROLES = ["BUYER", "DEALER", "AFFILIATE", "ADMIN", "DEALER_USER", "AFFILIATE_ONLY"] as const

const roleUpdateSchema = z.object({
  role: z.enum(VALID_ROLES),
})

// PATCH /api/admin/users/[userId]/role — Update a user's role (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const actor = await getSessionUser()
    if (!actor || !isAdminRole(actor.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await params
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const parsed = roleUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      )
    }

    const { role: newRole } = parsed.data

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, first_name: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const oldRole = user.role as string
    if (oldRole === newRole) {
      return NextResponse.json(
        { error: "User already has this role" },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    })

    // Send security alert email (fire-and-forget, non-blocking)
    sendRoleChangedEmail(
      user.email,
      user.first_name || "there",
      userId,
      oldRole,
      newRole
    ).catch((err) => {
      logger.error("[Admin Role Change] sendRoleChangedEmail failed", err as Error)
    })

    logger.info("[Admin Role Change] Role updated", {
      actorId: actor.id,
      targetUserId: userId,
      oldRole,
      newRole,
    })

    return NextResponse.json({ success: true, userId, oldRole, newRole })
  } catch (error) {
    logger.error("[Admin Role Change] Unexpected error", error as Error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
