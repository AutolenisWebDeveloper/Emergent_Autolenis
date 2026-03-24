import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerService } from "@/lib/services/dealer.service"

export const dynamic = "force-dynamic"

// Get submitted offers
export async function GET(_req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const offers = await dealerService.getSubmittedOffers(dealer.id)

    return NextResponse.json({ success: true, offers })
  } catch (error) {
    console.error("[v0] Offers error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Submit offer
export async function POST(_req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const { auctionId, ...offerData } = await _req.json()
    const offer = await dealerService.submitOffer(auctionId, dealer.id, offerData)

    return NextResponse.json({ success: true, offer })
  } catch (error) {
    console.error("[v0] Submit offer error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
