import { requireAuth } from "@/lib/auth-server"
import { getUnreadCount } from "@/lib/notifications/notification.service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await requireAuth(["ADMIN", "SUPER_ADMIN"])
    const workspaceId = session.workspace_id

    if (!workspaceId) {
      return new Response("Workspace not found", { status: 400 })
    }

    const encoder = new TextEncoder()
    let closed = false
    const intervalRefs: ReturnType<typeof setInterval>[] = []

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial unread count
        try {
          const count = await getUnreadCount(workspaceId)
          const data = JSON.stringify({ type: "unread-count", count })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch {
          // Non-critical; client will poll
        }

        // Poll every 30 seconds for new count
        const pollInterval = setInterval(async () => {
          if (closed) {
            clearInterval(pollInterval)
            return
          }
          try {
            const count = await getUnreadCount(workspaceId)
            const data = JSON.stringify({ type: "unread-count", count })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          } catch {
            // Connection may have closed
            clearInterval(pollInterval)
            closed = true
          }
        }, 30000)

        // Keep alive ping every 15 seconds
        const keepAliveInterval = setInterval(() => {
          if (closed) {
            clearInterval(keepAliveInterval)
            return
          }
          try {
            controller.enqueue(encoder.encode(": keepalive\n\n"))
          } catch {
            clearInterval(keepAliveInterval)
            closed = true
          }
        }, 15000)

        // Store refs for cleanup in cancel()
        intervalRefs.push(pollInterval, keepAliveInterval)
      },
      cancel() {
        closed = true
        for (const ref of intervalRefs) clearInterval(ref)
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch {
    return new Response("Unauthorized", { status: 401 })
  }
}
