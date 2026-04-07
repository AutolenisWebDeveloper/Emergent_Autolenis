import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prequalService } from "@/lib/services/prequal.service"
import { handleRouteError } from "@/lib/utils/route-error"

// GET /api/admin/buyers/:buyerId/prequal - Admin view of buyer prequal history
export async function GET(_request: Request, { params }: { params: Promise<{ buyerId: string }> }) {
  try {
    const session = await requireAuth(["ADMIN"])
    const { buyerId } = await params
    const workspaceId = session.workspace_id

    const data = await prequalService.getPreQualHistoryForUser(buyerId, workspaceId)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: unknown) {
    console.error("[Admin Buyer Prequal] Error:", error)
    return handleRouteError(error, "Internal server error")
  }
}
