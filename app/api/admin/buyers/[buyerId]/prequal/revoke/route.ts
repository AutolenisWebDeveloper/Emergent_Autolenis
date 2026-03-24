import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prequalService } from "@/lib/services/prequal.service"

// POST /api/admin/buyers/:buyerId/prequal/revoke - Admin revoke prequal
export async function POST(request: Request, { params }: { params: Promise<{ buyerId: string }> }) {
  try {
    const session = await requireAuth(["ADMIN"])
    const { buyerId } = await params
    const body = await request.json().catch((err) => {
      console.error("[Admin Buyer Prequal Revoke] Failed to parse request body:", err)
      return {}
    })

    await prequalService.revokePreQual(buyerId, session.userId, body.reason)

    return NextResponse.json({
      success: true,
      message: "Pre-qualification revoked successfully",
    })
  } catch (error: unknown) {
    console.error("[Admin Buyer Prequal Revoke] Error revoking prequal:", error)
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : error instanceof Error && error.message === "Forbidden" ? 403 : 500
    const msg = status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error"
    return NextResponse.json({ success: false, error: msg }, { status })
  }
}
