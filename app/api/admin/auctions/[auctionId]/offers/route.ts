import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { offerService } from "@/lib/services/offer.service"
import { logger } from "@/lib/logger"
import { handleRouteError } from "@/lib/utils/route-error"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ auctionId: string }> }) {
  try {
    const { auctionId } = await params
    await requireAuth(["ADMIN"])

    const offers = await offerService.getAuctionOffers(auctionId)
    return NextResponse.json({ offers })
  } catch (error: unknown) {
    logger.error("[API] Admin get auction offers error:", error)
    return handleRouteError(error, "Internal server error")
  }
}
