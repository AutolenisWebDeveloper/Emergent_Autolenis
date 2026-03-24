import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { listNotifications, markAsRead } from "@/lib/notifications/notification.service"
import type { NotificationPriority, NotificationCategory } from "@/lib/notifications/types"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const session = await requireAuth(["ADMIN", "SUPER_ADMIN"])
    const workspaceId = session.workspace_id

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const priority = searchParams.get("priority") as NotificationPriority | null
    const category = searchParams.get("category") as NotificationCategory | null
    const status = searchParams.get("status") as "unread" | "read" | "archived" | null
    const cursor = searchParams.get("cursor")
    const limit = searchParams.get("limit")

    const { notifications, total } = await listNotifications(workspaceId, {
      priority: priority || undefined,
      category: category || undefined,
      status: status || undefined,
      cursor: cursor || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })

    const unreadCount = notifications.filter((n) => !n.isRead).length

    return NextResponse.json({
      notifications,
      unreadCount,
      total,
    })
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number }
    if (err?.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth(["ADMIN", "SUPER_ADMIN"])
    const workspaceId = session.workspace_id

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 400 })
    }

    const body = await request.json()
    const { id, read } = body || {}

    if (!id) {
      return NextResponse.json({ error: "Notification ID required" }, { status: 400 })
    }

    if (read) {
      const success = await markAsRead(id, workspaceId)
      return NextResponse.json({ success, notificationId: id })
    }

    return NextResponse.json({ success: true, notificationId: id })
  } catch (error: unknown) {
    const err = error as Error & { statusCode?: number }
    if (err?.statusCode === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 })
  }
}

