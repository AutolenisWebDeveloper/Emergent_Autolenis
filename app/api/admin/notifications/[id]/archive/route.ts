import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { archiveNotification } from "@/lib/notifications/notification.service"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["ADMIN", "SUPER_ADMIN"])
    const workspaceId = session.workspace_id
    const { id } = await params

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 400 })
    }

    const success = await archiveNotification(id, workspaceId)

    return NextResponse.json({ success })
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number }
    if (err?.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to archive notification" }, { status: 500 })
  }
}
