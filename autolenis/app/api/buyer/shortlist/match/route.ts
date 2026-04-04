import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import * as inventoryMatchService from "@/lib/services/inventory-match.service"

export const dynamic = "force-dynamic"

// POST /api/buyer/shortlist/match — Trigger matching for buyer's active request
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const buyerRequestId = body.buyerRequestId

    if (!buyerRequestId) {
      return NextResponse.json(
        { error: "buyerRequestId is required" },
        { status: 400 },
      )
    }

    const result = await inventoryMatchService.matchBuyerRequest(buyerRequestId)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[shortlist-match] Error:", error)
    return NextResponse.json({ error: "Failed to match inventory" }, { status: 500 })
  }
}
