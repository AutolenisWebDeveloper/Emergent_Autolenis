import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { BestPriceService } from "@/lib/services/best-price.service"
import { logger } from "@/lib/logger"

export async function POST(_request: Request, { params }: { params: Promise<{ auctionId: string }> }) {
  const correlationId = crypto.randomUUID()

  try {
    const { auctionId } = await params
    const session = await requireAuth(["ADMIN", "SUPER_ADMIN"])

    const supabase = await createClient()

    const { data: auction, error: auctionError } = await supabase
      .from("Auction")
      .select("id, status")
      .eq("id", auctionId)
      .single()

    if (auctionError || !auction) {
      logger.error("[Admin Recompute] Auction not found", { error: auctionError, correlationId })
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Auction not found" }, correlationId },
        { status: 404 },
      )
    }

    // Allow recompute for CLOSED auctions only
    if (auction.status !== "CLOSED") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: `Cannot recompute for auction with status ${auction.status}` }, correlationId },
        { status: 400 },
      )
    }

    // Recompute
    const options = await BestPriceService.computeBestPriceOptions(auctionId, "RECOMPUTE")

    const { error: auditError } = await supabase.from("ComplianceEvent").insert({
      eventType: "ADMIN_BEST_PRICE_RECOMPUTE",
      action: "ADMIN_RECOMPUTE_BEST_PRICE",
      userId: session.userId,
      dealId: auctionId,
      details: {
        auctionId,
        options_created: options.length,
        recomputed_at: new Date().toISOString(),
        correlationId,
      },
    })
    if (auditError) {
      logger.error("[Admin Recompute] Audit log write failed", { correlationId, error: auditError })
      return NextResponse.json(
        { error: { code: "AUDIT_FAILURE", message: "Recompute succeeded but audit log write failed" }, correlationId },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        message: "Best price options recomputed successfully",
        options_created: options.length,
        auction_id: auctionId,
      },
    })
  } catch (error) {
    logger.error("[Admin Recompute]", { error, correlationId })
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Internal server error" }, correlationId },
      { status: 500 },
    )
  }
}
