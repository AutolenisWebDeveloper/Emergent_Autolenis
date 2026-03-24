import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { BestPriceService } from "@/lib/services/best-price.service"

export async function POST(request: Request) {
  try {
    const session = await requireAuth(["BUYER"])
    const body = await request.json()
    const supabase = await createClient()

    const { data: buyer, error: buyerError } = await supabase
      .from("BuyerProfile")
      .select("id")
      .eq("userId", session.userId)
      .single()

    if (buyerError || !buyer) {
      return NextResponse.json(
        {
          success: false,
          error: "Buyer profile not found",
        },
        { status: 404 },
      )
    }

    // Decline the offer and get updated options
    const updatedOptions = await BestPriceService.declineOffer(body.auctionId, body.offerId, buyer.id)

    return NextResponse.json({
      success: true,
      data: {
        options: updatedOptions,
        message:
          (updatedOptions as any).length > 0
            ? "Offer declined. Here are your updated options."
            : "You've reviewed all available offers.",
      },
    })
  } catch (error) {
    console.error("[Auction Decline] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to decline offer" }, { status: 500 })
  }
}
