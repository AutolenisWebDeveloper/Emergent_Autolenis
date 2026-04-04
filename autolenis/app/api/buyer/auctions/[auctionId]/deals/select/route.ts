import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { DealService } from "@/lib/services/deal.service"
import { logger } from "@/lib/logger"

export async function POST(request: Request, { params }: { params: Promise<{ auctionId: string }> }) {
  try {
    const session = await requireAuth(["BUYER"])
    const { auctionId } = await params
    const body = await request.json()

    const { best_price_option_id, financing_option_id } = body

    if (!best_price_option_id) {
      return NextResponse.json({ success: false, error: "best_price_option_id is required" }, { status: 400 })
    }

    const result = await DealService.createOrGetSelectedDealFromBestPrice(
      session.userId,
      auctionId,
      best_price_option_id,
      financing_option_id,
    )

    return NextResponse.json({
      success: true,
      selected_deal_id: result.deal.id,
      status: result.deal.status,
      is_new: result.isNew,
    })
  } catch (error) {
    logger.error("Error selecting deal:", error)
    return NextResponse.json({ success: false, error: "Failed to select deal" }, { status: 500 })
  }
}
