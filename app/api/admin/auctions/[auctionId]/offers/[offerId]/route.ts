import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { offerService } from "@/lib/services/offer.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ auctionId: string; offerId: string }> }) {
  try {
    const { auctionId, offerId } = await params
    await requireAuth(["ADMIN"])

    const offer = await offerService.getOfferDetail(offerId)

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 })
    }

    // Verify offer belongs to this auction
    if (offer.auctionId !== auctionId) {
      return NextResponse.json({ error: "Offer does not belong to this auction" }, { status: 400 })
    }

    return NextResponse.json(offer)
  } catch (error: any) {
    logger.error("[API] Admin get offer detail error:", error)
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : error instanceof Error && error.message === "Forbidden" ? 403 : 500
    const msg = status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error"
    return NextResponse.json({ error: msg }, { status })
  }
}
