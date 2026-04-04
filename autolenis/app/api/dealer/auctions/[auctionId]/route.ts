import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

export const dynamic = "force-dynamic"

const RESERVED_SEGMENTS = ["offers", "invited", "loading", "settings", "undefined"]

export async function GET(_req: NextRequest, { params }: { params: Promise<{ auctionId: string }> }) {
  try {
    const { auctionId } = await params

    if (!auctionId || RESERVED_SEGMENTS.includes(auctionId) || auctionId === "undefined") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid auction ID",
        },
        { status: 400 },
      )
    }

    const user = await getSessionUser()

    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const { data: dealer, error: dealerError } = await supabase
      .from("Dealer")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    if (dealerError || !dealer) {
      console.error("[v0] Dealer not found:", dealerError?.message || "No dealer record")
      return NextResponse.json({ success: false, error: "Dealer not found" }, { status: 404 })
    }

    const { data: participant, error: participantError } = await supabase
      .from("AuctionParticipant")
      .select("id")
      .eq("auctionId", auctionId)
      .eq("dealerId", dealer.id)
      .maybeSingle()

    if (participantError || !participant) {
      console.error("[v0] Participant not found:", participantError?.message || "Not invited")
      return NextResponse.json({ success: false, error: "Dealer not invited to this auction" }, { status: 403 })
    }

    const { data: auction, error: auctionError } = await supabase
      .from("Auction")
      .select(`
        *,
        buyer:BuyerProfile!Auction_buyerId_fkey(
          id,
          firstName,
          lastName,
          city,
          state,
          preQualification:PreQualification(
            maxOtd,
            budgetMin,
            budgetMax,
            creditTier
          )
        ),
        shortlist:Shortlist!Auction_shortlistId_fkey(
          id,
          items:ShortlistItem(
            inventoryItemId
          )
        )
      `)
      .eq("id", auctionId)
      .maybeSingle()

    if (auctionError || !auction) {
      console.error("[v0] Auction not found:", auctionError?.message || "No auction record")
      return NextResponse.json({ success: false, error: "Auction not found" }, { status: 404 })
    }

    const inventoryItemIds = auction.shortlist?.items?.map((item: any) => item.inventoryItemId) || []

    let dealerInventory: any[] = []
    if (inventoryItemIds.length > 0) {
      const { data: inventory, error: inventoryError } = await supabase
        .from("InventoryItem")
        .select("*")
        .eq("dealerId", dealer.id)
        .eq("status", "AVAILABLE")
        .in("id", inventoryItemIds)

      if (inventoryError) {
        console.error("[v0] Error fetching dealer inventory:", inventoryError.message)
      } else {
        dealerInventory = inventory || []
      }
    }

    const { data: offers, error: offerError } = await supabase
      .from("AuctionOffer")
      .select(`
        *,
        financingOptions:AuctionFinancingOption(*)
      `)
      .eq("auctionId", auctionId)
      .eq("participantId", participant.id)
      .limit(1)

    if (offerError) {
      console.error("[v0] Error fetching offer:", offerError.message)
    }

    const existingOffer = offers && offers.length > 0 ? offers[0] : null

    return NextResponse.json({
      success: true,
      auction,
      participantId: participant.id,
      dealerInventory,
      existingOffer,
    })
  } catch (error) {
    console.error("[v0] Auction detail error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
