import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { getUnreadCount } from "@/lib/notifications/notification.service"

export async function GET() {
  try {
    const session = await requireAuth(["ADMIN", "SUPER_ADMIN"])
    const workspaceId = session.workspace_id

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 400 })
    }

    const count = await getUnreadCount(workspaceId)

    return NextResponse.json({ unreadCount: count })
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number }
    if (err?.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to get unread count" }, { status: 500 })
  }
}
