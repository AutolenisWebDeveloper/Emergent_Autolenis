import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockDb } from "@/lib/mocks/mockStore"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()

    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (isTestWorkspace(user)) {
      return NextResponse.json({ success: true, data: { auctions: mockDb.auctions || [] } })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const { data: buyerProfile, error: buyerError } = await supabase
      .from("BuyerProfile")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    if (buyerError) {
      logger.error("[Auctions] Buyer profile fetch error:", buyerError)
      return NextResponse.json({ success: false, error: "Failed to fetch buyer profile" }, { status: 500 })
    }

    if (!buyerProfile) {
      return NextResponse.json({
        success: true,
        data: { auctions: [] },
      })
    }

    // Build query with workspace scoping
    let query = supabase
      .from("Auction")
      .select(
        `
        *,
        shortlist:Shortlist(
          *,
          items:ShortlistItem(
            *,
            inventoryItem:InventoryItem(
              *,
              dealer:Dealer(*)
            )
          )
        ),
        offers:AuctionOffer(
          *,
          financingOptions:AuctionOfferFinancingOption(*),
          participant:AuctionParticipant(
            dealer:Dealer(*)
          )
        )
      `,
      )
      .eq("buyerId", buyerProfile.id)
      .order("createdAt", { ascending: false })

    // Workspace scoping
    if (user.workspace_id) {
      query = query.eq("workspaceId", user.workspace_id)
    }

    const { data: auctions, error: auctionsError } = await query

    if (auctionsError) {
      logger.error("[Auctions] Fetch error:", auctionsError)
      return NextResponse.json({ success: false, error: "Failed to load auctions" }, { status: 500 })
    }

    // Normalize and add defensive mappings
    const normalizedAuctions = (auctions || []).map((auction: any) => {
      const shortlist = auction.shortlist || null
      const items = (shortlist?.items || []).map((item: any) => ({
        id: item.id,
        inventoryItem: item.inventoryItem
          ? {
              ...item.inventoryItem,
              vehicle: item.inventoryItem || null,
              dealer: item.inventoryItem.dealer || null,
            }
          : null,
      }))

      // Normalize offers — pull dealer from participant if available
      const offers = (auction.offers || [])
        .map((offer: any) => ({
          id: offer.id,
          auctionId: offer.auctionId,
          otdPrice: offer.cashOtd ?? offer.otdPrice ?? 0,
          cashOtd: offer.cashOtd ?? 0,
          taxAmount: offer.taxAmount ?? 0,
          feesBreakdown: offer.feesBreakdown || null,
          dealer: offer.participant?.dealer || offer.dealer || null,
          financingOptions: (offer.financingOptions || []).map((opt: any) => ({
            apr: opt.apr ?? 0,
            termMonths: opt.termMonths ?? 0,
            downPayment: opt.downPayment ?? 0,
            monthlyPayment: opt.monthlyPayment ?? 0,
          })),
          createdAt: offer.createdAt,
        }))
        .sort((a: any, b: any) => (a.otdPrice || 0) - (b.otdPrice || 0))

      return {
        id: auction.id,
        status: auction.status || "PENDING",
        startsAt: auction.startsAt,
        endsAt: auction.endsAt,
        closedAt: auction.closedAt,
        createdAt: auction.createdAt,
        shortlist: shortlist
          ? {
              id: shortlist.id,
              items,
            }
          : null,
        offers,
      }
    })

    return NextResponse.json({
      success: true,
      data: { auctions: normalizedAuctions },
    })
  } catch (error) {
    logger.error("[Auctions] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch auctions" }, { status: 500 })
  }
}
