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
 * GET /api/buyer/messages/[threadId] — get messages in a thread
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ threadId: string }> }) {
  try {
    const user = await requireAuth(["BUYER"])
    const { threadId } = await ctx.params

    if (isTestWorkspace(user)) {
      return NextResponse.json({ success: true, data: { id: threadId, messages: [], readiness: null } })
    }
    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const buyerId = await messagingService.resolveBuyerProfileId(user.userId)
    if (!buyerId) return jsonError("Buyer profile not found", 404)

    const threadData = await messagingService.getThreadForBuyer(threadId, buyerId)
    if (!threadData) return jsonError("Thread not found", 404)

    const messages = await messagingService.listMessages(threadId, buyerId)
    const readiness = await messagingService.buildBuyerReadinessPayloadForMessaging(buyerId)

    return NextResponse.json({
      success: true,
      data: {
        id: threadData.id,
        dealerId: threadData.dealerId,
        approvalType: threadData.approvalType,
        identityReleased: threadData.identityReleased,
        status: threadData.status,
        readiness,
        messages: messages.map((m: any) => ({
          id: m.id,
          senderType: m.senderType,
          body: m.body,
          containsSensitiveData: m.containsSensitiveData,
          createdAt: m.createdAt,
          isMe: m.senderType === "BUYER",
        })),
      },
    })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ error: statusCode === 403 ? "Forbidden" : "Unauthorized" }, { status: statusCode })
    }
    return jsonError("Failed to load thread", 500)
  }
}
