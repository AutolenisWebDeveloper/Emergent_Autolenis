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
 * GET /api/dealer/messages/threads — list buyer↔dealer message threads
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])

    if (isTestWorkspace(user)) return NextResponse.json({ success: true, data: [] })
    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const dealerId = await messagingService.resolveDealerIdForUser(user.userId)
    if (!dealerId) return jsonError("Dealer not found", 404)

    const threads = await messagingService.listThreadsForDealer(dealerId)
    return NextResponse.json({ success: true, data: threads })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ error: statusCode === 403 ? "Forbidden" : "Unauthorized" }, { status: statusCode })
    }
    return jsonError("Failed to load threads", 500)
  }
}

/**
 * POST /api/dealer/messages/threads — send a message to a thread
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])

    if (isTestWorkspace(user)) return NextResponse.json({ success: true })
    const dbCheck = requireDatabase()
    if (dbCheck) return dbCheck

    const dealerId = await messagingService.resolveDealerIdForUser(user.userId)
    if (!dealerId) return jsonError("Dealer not found", 404)

    const body = await req.json().catch(() => null)
    const threadId = body?.threadId ? String(body.threadId).trim() : ""
    const message = body?.message ? String(body.message).trim() : ""

    if (!threadId) return jsonError("threadId is required")
    if (!message) return jsonError("Message is required")

    const result = await messagingService.sendMessage({
      threadId,
      senderId: dealerId,
      senderType: "DEALER",
      body: message,
    })

    return NextResponse.json({ success: true, data: result.message })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ error: statusCode === 403 ? "Forbidden" : "Unauthorized" }, { status: statusCode })
    }
    return jsonError("Failed to send message", 400)
  }
}
