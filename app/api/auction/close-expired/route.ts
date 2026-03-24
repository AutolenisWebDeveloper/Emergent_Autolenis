import { NextResponse } from "next/server"
import { AuctionService } from "@/lib/services/auction.service"
import { logger } from "@/lib/logger"
import { timingSafeEqual } from "node:crypto"

// This endpoint can be called by a cron job to close expired auctions
export async function POST(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env['CRON_SECRET']

    if (cronSecret) {
      const expected = `Bearer ${cronSecret}`
      if (
        !authHeader ||
        authHeader.length !== expected.length ||
        !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const closedCount = await AuctionService.closeExpiredAuctions()

    return NextResponse.json({
      success: true,
      data: { closedCount },
    })
  } catch (error: any) {
    logger.error("[Auction Close Expired]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
