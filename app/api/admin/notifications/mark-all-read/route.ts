import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { markAllAsRead } from "@/lib/notifications/notification.service"

export async function POST() {
  try {
    const session = await requireAuth(["ADMIN", "SUPER_ADMIN"])
    const workspaceId = session.workspace_id

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 400 })
    }

    const success = await markAllAsRead(workspaceId)

    return NextResponse.json({ success })
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number }
    if (err?.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to mark all as read" }, { status: 500 })
  }
}
