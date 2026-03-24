import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"

// GET - Dealer fetches trade-in info for an auction (read-only)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ auctionId: string }> }) {
  try {
    const { auctionId } = await params
    const user = await getSessionUser()

    if (!user || user.role !== "DEALER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: dealer, error: dealerError } = await supabase
      .from("Dealer")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    if (dealerError) {
      console.error("[Dealer TradeIn API] Database error fetching dealer:", dealerError)
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }

    if (!dealer) {
      console.error("[Dealer TradeIn API] Dealer not found for user:", user.userId)
      return NextResponse.json({ success: false, error: "Dealer profile not found" }, { status: 404 })
    }

    const { data: participant, error: participantError } = await supabase
      .from("AuctionParticipant")
      .select("id")
      .eq("auctionId", auctionId)
      .eq("dealerId", dealer.id)
      .maybeSingle()

    if (participantError) {
      console.error("[Dealer TradeIn API] Database error checking participant:", participantError)
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }

    if (!participant) {
      console.error("[Dealer TradeIn API] Dealer not a participant in auction:", auctionId)
      return NextResponse.json(
        { success: false, error: "Access denied - you are not a participant in this auction" },
        { status: 403 },
      )
    }

    const { data: auction, error: auctionError } = await supabase
      .from("Auction")
      .select("id, buyerId, shortlistId")
      .eq("id", auctionId)
      .maybeSingle()

    if (auctionError) {
      console.error("[Dealer TradeIn API] Database error fetching auction:", auctionError)
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }

    if (!auction) {
      console.error("[Dealer TradeIn API] Auction not found:", auctionId)
      return NextResponse.json({ success: false, error: "Auction not found" }, { status: 404 })
    }

    const { data: tradeIns, error: tradeInError } = await supabase
      .from("TradeIn")
      .select("*")
      .eq("buyerId", auction.buyerId)
      .or(`shortlistId.eq.${auction.shortlistId},auctionId.eq.${auctionId}`)
      .order("createdAt", { ascending: false })
      .limit(1)

    if (tradeInError) {
      console.error("[Dealer TradeIn API] Error fetching trade-in:", tradeInError)
    }

    const tradeIn = tradeIns && tradeIns.length > 0 ? tradeIns[0] : null

    return NextResponse.json({
      success: true,
      data: {
        tradeIn: tradeIn
          ? {
              hasTrade: tradeIn.hasTrade,
              vin: tradeIn.vin,
              mileage: tradeIn.mileage,
              condition: tradeIn.condition,
              photoUrls: tradeIn.photoUrls || [],
              hasLoan: tradeIn.hasLoan,
              estimatedPayoffCents: tradeIn.estimatedPayoffCents,
            }
          : null,
      },
    })
  } catch (error) {
    console.error("[Dealer TradeIn API] GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch trade-in info" }, { status: 500 })
  }
}
