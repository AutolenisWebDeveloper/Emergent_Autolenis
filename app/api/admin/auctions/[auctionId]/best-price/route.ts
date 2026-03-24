import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { BestPriceService } from "@/lib/services/best-price.service"
import { logger } from "@/lib/logger"

export async function GET(_request: Request, { params }: { params: Promise<{ auctionId: string }> }) {
  const correlationId = crypto.randomUUID()

  try {
    const { auctionId } = await params
    await requireAuth(["ADMIN", "SUPER_ADMIN"])

    const supabase = await createClient()

    const { data: auction, error: auctionError } = await supabase
      .from("Auction")
      .select(`
        id,
        status,
        buyerId,
        createdAt,
        closedAt,
        shortlist:Shortlist(
          buyer:BuyerProfile(*)
        )
      `)
      .eq("id", auctionId)
      .single()

    if (auctionError || !auction) {
      logger.error("[Admin Best Price] Auction fetch error", { error: auctionError, correlationId })
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Auction not found" }, correlationId },
        { status: 404 },
      )
    }

    // Get all options (raw, not grouped)
    const options = await BestPriceService.getRawOptions(auctionId)

    const { data: runLogs } = await supabase
      .from("best_price_run_logs")
      .select("*")
      .eq("auction_id", auctionId)
      .order("run_at", { ascending: false })
      .limit(10)

    const { count: offerCount } = await supabase
      .from("AuctionOffer")
      .select("*", { count: "exact", head: true })
      .eq("auctionId", auctionId)

    const { count: validOfferCount } = await supabase
      .from("AuctionOffer")
      .select("*", { count: "exact", head: true })
      .eq("auctionId", auctionId)
      .eq("is_valid", true)

    return NextResponse.json({
      success: true,
      data: {
        auction: {
          id: auctionId,
          status: auction.status,
          buyer_id: auction.buyerId,
          created_at: auction.createdAt,
          closed_at: auction.closedAt,
        },
        metrics: {
          total_offers: offerCount || 0,
          valid_offers: validOfferCount || 0,
          best_price_options_count: options.length,
        },
        options: options.map((opt: any) => ({
          id: opt.id,
          type: opt.type,
          rank: opt.rank,
          score: opt.score,
          is_declined: opt.is_declined,
          declined_at: opt.declined_at,
          offer_id: opt.offerId,
          inventory_item_id: opt.inventoryItemId,
          dealer_id: opt.dealerId,
          cash_otd: opt.cashOtd,
          monthly_payment: opt.monthlyPayment,
          snapshot: opt.snapshot_json,
          created_at: opt.createdAt,
        })),
        run_logs: runLogs || [],
      },
    })
  } catch (error) {
    logger.error("[Admin Best Price]", { error, correlationId })
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" }, correlationId },
      { status: 500 },
    )
  }
}
