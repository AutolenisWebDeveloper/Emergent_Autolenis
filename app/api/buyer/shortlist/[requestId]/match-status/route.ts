import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import * as inventoryMatchService from "@/lib/services/inventory-match.service"

export const dynamic = "force-dynamic"

// GET /api/buyer/shortlist/[requestId]/match-status — Get match status for a request
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requestId } = await params
    if (!requestId) {
      return NextResponse.json({ error: "requestId is required" }, { status: 400 })
    }

    const status = await inventoryMatchService.getMatchStatus(requestId)
    return NextResponse.json({ success: true, data: status })
  } catch (error) {
    console.error("[match-status] Error:", error)
    return NextResponse.json({ error: "Failed to get match status" }, { status: 500 })
  }
}
