import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { BestPriceService } from "@/lib/services/best-price.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ auctionId: string }> }) {
  const correlationId = crypto.randomUUID()

  try {
    const { auctionId } = await params
    const session = await requireAuth(["BUYER"])

    const supabase = await createClient()

    // Verify auction ownership
    const { data: auction, error: auctionError } = await supabase
      .from("Auction")
      .select("id, buyerId, status")
      .eq("id", auctionId)
      .single()

    if (auctionError || !auction) {
      logger.error("[Buyer Best Price] Auction fetch error", { error: auctionError, correlationId })
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Auction not found" }, correlationId },
        { status: 404 },
      )
    }

    if (auction.buyerId !== session.userId) {
      // Check if user is buyer via buyerProfile
      const { data: buyerProfile } = await supabase
        .from("BuyerProfile")
        .select("id")
        .eq("userId", session.userId)
        .single()

      if (!buyerProfile || auction.buyerId !== buyerProfile.id) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Insufficient permissions" }, correlationId },
          { status: 403 },
        )
      }
    }

    // Verify auction status
    if (auction.status !== "CLOSED" && auction.status !== "COMPLETED" && auction.status !== "NO_OFFERS") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Best price report not available until auction is closed" }, correlationId },
        { status: 400 },
      )
    }

    // Check if best price options exist, compute if not
    const { count } = await supabase
      .from("BestPriceOption")
      .select("*", { count: "exact", head: true })
      .eq("auctionId", auctionId)

    if ((count || 0) === 0 && auction.status === "CLOSED") {
      await BestPriceService.computeBestPriceOptions(auctionId, "INITIAL")
    }

    // Get grouped options
    const options = await BestPriceService.getBestPriceOptions(auctionId)

    // Get offer count
    const { count: offerCount } = await supabase
      .from("AuctionOffer")
      .select("*", { count: "exact", head: true })
      .eq("auctionId", auctionId)

    return NextResponse.json({
      success: true,
      data: {
        auction: {
          id: auctionId,
          status: auction.status,
          offer_count: offerCount || 0,
        },
        ...options,
      },
    })
  } catch (error) {
    logger.error("[Buyer Best Price]", { error, correlationId })
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" }, correlationId },
      { status: 500 },
    )
  }
}
