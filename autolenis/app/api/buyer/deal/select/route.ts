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
      throw new Error("Buyer profile not found")
    }

    const deal = await BestPriceService.selectDeal(buyer.id, body.auctionId, body.offerId, body.financingOptionId)

    return NextResponse.json({
      success: true,
      data: { deal },
    })
  } catch (error) {
    console.error("[Deal Select] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to select deal" }, { status: 500 })
  }
}
