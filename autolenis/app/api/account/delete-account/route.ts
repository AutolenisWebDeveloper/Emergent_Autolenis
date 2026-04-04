import { NextResponse } from "next/server"
import { getSession, clearSession } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { prisma } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { logger } from "@/lib/logger"
import { emailService } from "@/lib/services/email.service"
import { UserService } from "@/lib/services/user.service"

export const dynamic = "force-dynamic"

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required to delete your account"),
}).strict()

// POST /api/account/delete-account
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { password } = deleteAccountSchema.parse(body)

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Fetch user with password hash
    const { data: user, error: fetchError } = await supabase
      .from("User")
      .select("id, email, first_name, passwordHash")
      .eq("id", session.userId)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { success: false, error: "Password not set for this account" },
        { status: 400 },
      )
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Password is incorrect" },
        { status: 401 },
      )
    }

    // Check for active deals before allowing deletion
    const buyerProfiles = await prisma.buyerProfile.findMany({
      where: { userId: session.userId },
      select: { id: true },
    })
    const buyerProfileIds = buyerProfiles.map((bp: { id: string }) => bp.id)

    if (buyerProfileIds.length > 0) {
      const activeDeals = await prisma.selectedDeal.count({
        where: {
          buyerId: { in: buyerProfileIds },
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          deletedAt: null,
        },
      })

      if (activeDeals > 0) {
        return NextResponse.json(
          { success: false, error: "Cannot delete account while deals are in progress" },
          { status: 409 },
        )
      }
    }

    // Store user info for confirmation email before soft-delete
    const userEmail = user.email
    const userFirstName = user.first_name || "there"

    // Soft-delete user — set deletedAt timestamp instead of hard delete
    await prisma.user.update({
      where: { id: session.userId },
      data: { deletedAt: new Date() },
    })

    // Clear session cookie
    await clearSession()

    // Send account deletion confirmation email (fire-and-forget)
    emailService.sendAccountDeletionConfirmationEmail(userEmail, userFirstName).catch((err: unknown) => {
      logger.error("delete-account: confirmation email failed", { error: err instanceof Error ? err.message : String(err) })
    })

    logger.info("delete-account: soft-deleted", { userId: session.userId })

    return NextResponse.json({ success: true, message: "Account deleted successfully" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message || "Invalid input" },
        { status: 400 },
      )
    }
    logger.error("delete-account: unexpected error", { error: error instanceof Error ? error.message : "Unknown error" })
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
