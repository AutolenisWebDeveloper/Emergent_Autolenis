import { NextResponse, type NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { requireDatabase } from "@/lib/require-database"
import { isTestWorkspace } from "@/lib/app-mode"
import { messagingService } from "@/lib/services/messaging.service"

export const dynamic = "force-dynamic"

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

/**
 * GET /api/buyer/messages — list buyer message threads
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth(["BUYER"])

    if (isTestWorkspace(user)) return NextResponse.json({ success: true, data: [] })
    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const buyerId = await messagingService.resolveBuyerProfileId(user.userId)
    if (!buyerId) return jsonError("Buyer profile not found", 404)

    const threads = await messagingService.listThreadsForBuyer(buyerId)
    return NextResponse.json({ success: true, data: threads })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ error: statusCode === 403 ? "Forbidden" : "Unauthorized" }, { status: statusCode })
    }
    return jsonError("Failed to load messages", 500)
  }
}

/**
 * POST /api/buyer/messages — create a new thread or send a message
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["BUYER"])

    if (isTestWorkspace(user)) return NextResponse.json({ success: true, data: { id: "test_thread" } })
    const dbCheck = requireDatabase()
    if (dbCheck) return dbCheck

    const buyerId = await messagingService.resolveBuyerProfileId(user.userId)
    if (!buyerId) return jsonError("Buyer profile not found", 404)

    const body = await req.json().catch(() => null)
    if (!body) return jsonError("Invalid request body")

    // Create thread
    if (body.action === "create_thread") {
      const dealerId = body.dealerId ? String(body.dealerId).trim() : ""
      if (!dealerId) return jsonError("dealerId is required")

      const result = await messagingService.createThread({
        buyerId,
        dealerId,
        requestId: body.requestId ?? null,
        dealId: body.dealId ?? null,
        workspaceId: user.workspace_id ?? null,
      })

      return NextResponse.json({
        success: true,
        data: {
          id: result.thread.id,
          created: result.created,
          readiness: result.readiness,
        },
      }, { status: result.created ? 201 : 200 })
    }

    // Send message
    if (body.action === "send_message") {
      const threadId = body.threadId ? String(body.threadId).trim() : ""
      const message = body.message ? String(body.message).trim() : ""

      if (!threadId) return jsonError("threadId is required")
      if (!message) return jsonError("Message is required")

      const result = await messagingService.sendMessage({
        threadId,
        senderId: buyerId,
        senderType: "BUYER",
        body: message,
      })

      return NextResponse.json({ success: true, data: result.message })
    }

    return jsonError("Invalid action. Use 'create_thread' or 'send_message'.")
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ error: statusCode === 403 ? "Forbidden" : "Unauthorized" }, { status: statusCode })
    }
    return jsonError("Failed to process request", 400)
  }
}
