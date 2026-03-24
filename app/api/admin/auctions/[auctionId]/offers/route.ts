import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { offerService } from "@/lib/services/offer.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ auctionId: string }> }) {
  try {
    const { auctionId } = await params
    await requireAuth(["ADMIN"])

    const offers = await offerService.getAuctionOffers(auctionId)
    return NextResponse.json({ offers })
  } catch (error: any) {
    logger.error("[API] Admin get auction offers error:", error)
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : error instanceof Error && error.message === "Forbidden" ? 403 : 500
    const msg = status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error"
    return NextResponse.json({ error: msg }, { status })
  }
}
