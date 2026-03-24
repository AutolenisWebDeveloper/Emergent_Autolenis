import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerService } from "@/lib/services/dealer.service"
import { offerService, type OfferSubmissionInput } from "@/lib/services/offer.service"
import { requireDealerAgreement } from "@/lib/auth/dealer-gate"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: Promise<{ auctionId: string }> }) {
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

    // Enforce dealer agreement gate before any offer action
    const gateResult = await requireDealerAgreement(dealer.id)
    if (gateResult) return gateResult

    const body = await req.json()

    // Transform input to match service interface
    const input: OfferSubmissionInput = {
      inventory_item_id: body.inventory_item_id,
      cash_otd_cents: body.cash_otd_cents,
      fee_breakdown: body.fee_breakdown,
      financing_options: body.financing_options || [],
      offer_notes: body.offer_notes,
    }

    const result = await offerService.submitOffer(auctionId, dealer.id, user.id, input)

    if (!result.success) {
      return NextResponse.json({ success: false, errors: result.errors }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Submit offer error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
