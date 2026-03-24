import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { AuctionService } from "@/lib/services/auction.service"

export async function POST(request: Request) {
  try {
    const session = await getSessionUser()

    if (!session || session.role !== "BUYER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const { data: buyer, error } = await supabase
      .from("BuyerProfile")
      .select("id")
      .eq("userId", session.userId)
      .single()

    if (error || !buyer) {
      return NextResponse.json({ success: false, error: "Buyer profile not found" }, { status: 404 })
    }

    const auction = await AuctionService.createAuction(buyer.id, body.shortlistId)

    return NextResponse.json({
      success: true,
      data: { auction },
    })
  } catch (error) {
    console.error("[Buyer Auction API] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to create auction" }, { status: 500 })
  }
}
