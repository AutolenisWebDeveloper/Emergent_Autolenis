import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { BestPriceService } from "@/lib/services/best-price.service"
import { logger } from "@/lib/logger"

export async function POST(request: Request, { params }: { params: Promise<{ auctionId: string }> }) {
  try {
    const { auctionId } = await params
    const session = await requireAuth(["BUYER"])
    const body = await request.json()

    const { type, best_price_option_id } = body

    if (!type || !best_price_option_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: type and best_price_option_id" },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    // Verify auction ownership
    const { data: auction, error: auctionError } = await supabase
      .from("Auction")
      .select("*")
      .eq("id", auctionId)
      .single()

    if (auctionError || !auction) {
      logger.error("[Best Price Decline] Auction fetch error:", auctionError)
      return NextResponse.json({ success: false, error: "Auction not found" }, { status: 404 })
    }

    // Get buyer profile
    const { data: buyerProfile } = await supabase
      .from("BuyerProfile")
      .select("id")
      .eq("userId", session.userId)
      .single()

    const buyerId = buyerProfile?.id || session.userId

    if (auction.buyerId !== buyerId && auction.buyerId !== session.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    // Decline the option using service
    const result = await BestPriceService.declineOption(auctionId, best_price_option_id, buyerId)

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        message: result.next_option
          ? "Offer declined. Here is your next best option."
          : "No more alternative offers for this category.",
      },
    })
  } catch (error) {
    logger.error("[Best Price Decline] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to decline offer" }, { status: 500 })
  }
}
