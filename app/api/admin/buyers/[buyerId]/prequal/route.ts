import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prequalService } from "@/lib/services/prequal.service"

// GET /api/admin/buyers/:buyerId/prequal - Admin view of buyer prequal history
export async function GET(_request: Request, { params }: { params: Promise<{ buyerId: string }> }) {
  try {
    await requireAuth(["ADMIN"])
    const { buyerId } = await params

    const data = await prequalService.getPreQualHistoryForUser(buyerId)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: unknown) {
    console.error("[Admin Buyer Prequal] Error:", error)
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : error instanceof Error && error.message === "Forbidden" ? 403 : 500
    const msg = status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error"
    return NextResponse.json({ success: false, error: msg }, { status })
  }
}
