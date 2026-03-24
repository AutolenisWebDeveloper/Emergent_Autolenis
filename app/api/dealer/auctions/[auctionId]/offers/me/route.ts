import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerService } from "@/lib/services/dealer.service"
import { offerService } from "@/lib/services/offer.service"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ auctionId: string }> }) {
  try {
    const { auctionId } = await params
    const user = await getSessionUser()

    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer) {
      return NextResponse.json({ error: "Dealer profile not found" }, { status: 404 })
    }

    const summary = await offerService.getDealerOfferSummary(auctionId, dealer.id)
    return NextResponse.json(summary)
  } catch (error) {
    console.error("[API] Get dealer offer summary error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
