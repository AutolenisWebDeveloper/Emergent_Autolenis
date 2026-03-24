import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    if (!user.userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 })
    }

    const { data: dealer, error: dealerError } = await supabase
      .from("Dealer")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    if (dealerError) {
      console.error("[Dealer Requests] Dealer query error:", dealerError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!dealer) {
      return NextResponse.json({ success: true, data: [] })
    }

    // Get auctions where this dealer is a participant (invited)
    const { data: participants, error: participantsError } = await supabase
      .from("AuctionParticipant")
      .select(`
        auctionId,
        auction:Auction(
          id,
          status,
          createdAt,
          buyerId,
          shortlistId,
          buyer:BuyerProfile(
            firstName,
            lastName,
            city,
            state,
            zip
          ),
          shortlist:Shortlist(
            items:ShortlistItem(
              inventoryItem:InventoryItem(
                priceCents,
                year, make, model, trim
              )
            )
          )
        )
      `)
      .eq("dealerId", dealer.id)
      .order("invitedAt", { ascending: false })

    if (participantsError) {
      console.error("[Dealer Requests] Participants query error:", participantsError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    const data = (participants || [])
      .filter((p: any) => p.auction && p.auction.status !== "CANCELLED")
      .map((p: any) => {
        const auction = p.auction
        const buyer = auction.buyer
        const items = auction.shortlist?.items || []
        const firstItem = items[0]
        const inv = firstItem?.inventoryItem

        const vehicleStr = inv
          ? `${inv.year} ${inv.make} ${inv.model}${inv.trim ? " " + inv.trim : ""}`
          : "Vehicle TBD"
        const buyerName = buyer ? `${buyer.firstName} ${buyer.lastName}` : "Buyer"
        const location = buyer ? `${buyer.city}, ${buyer.state}` : ""
        const budget = inv?.priceCents ? inv.priceCents / 100 : 0

        return {
          id: auction.id,
          vehicle: vehicleStr,
          buyerName,
          location,
          budget,
          matchScore: 0,
          tradeIn: null,
          status: auction.status,
          createdAt: auction.createdAt,
        }
      })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[Dealer Requests] Error:", error)
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 })
  }
}
