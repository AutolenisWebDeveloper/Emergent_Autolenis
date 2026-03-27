import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { userService } from "@/lib/services/user.service"

// DELETE /api/admin/users/:userId — Soft-delete a user (admin only)
export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const admin = await requireAuth(["ADMIN", "SUPER_ADMIN"])
    const { userId } = await params

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // Prevent admin from deleting themselves
    if (userId === admin.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    await userService.softDeleteUser(userId, admin.id)

    return NextResponse.json({ success: true, message: "User soft-deleted" })
  } catch (error: unknown) {
    if (error.message?.includes("active deal")) {
      return NextResponse.json({ error: "Cannot delete user with active deals in progress" }, { status: 409 })
    }
    console.error("[Admin Delete User]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
