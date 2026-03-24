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
 * GET /api/dealer/messages/threads/[threadId] — get messages in a thread
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ threadId: string }> }) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])
    const { threadId } = await ctx.params

    if (isTestWorkspace(user)) {
      return NextResponse.json({ success: true, data: { id: threadId, messages: [], readiness: null } })
    }
    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const dealerId = await messagingService.resolveDealerIdForUser(user.userId)
    if (!dealerId) return jsonError("Dealer not found", 404)

    const threadData = await messagingService.getThreadForDealer(threadId, dealerId)
    if (!threadData) return jsonError("Thread not found", 404)

    const messages = await messagingService.listMessages(threadId, dealerId)
    const readiness = await messagingService.buildBuyerReadinessPayloadForMessaging(threadData.buyerId)

    return NextResponse.json({
      success: true,
      data: {
        id: threadData.id,
        buyerId: threadData.identityReleased ? threadData.buyerId : undefined,
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
          isMe: m.senderType === "DEALER",
        })),
      },
    })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ error: (error as Error).message }, { status: statusCode })
    }
    return jsonError("Failed to load thread", 500)
  }
}
