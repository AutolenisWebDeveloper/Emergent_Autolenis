import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerService } from "@/lib/services/dealer.service"
import { AuctionService } from "@/lib/services/auction.service"
import { requireDealerAgreement } from "@/lib/auth/dealer-gate"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: auctionId } = await params
    const user = await getSessionUser()

    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    // Enforce dealer agreement gate before any offer action
    const gateResult = await requireDealerAgreement(dealer.id)
    if (gateResult) return gateResult

    const body = await req.json()

    // Validate required fields
    if (!body.inventoryItemId || !body.cashOtd) {
      return NextResponse.json(
        {
          error: "Missing required fields: inventoryItemId, cashOtd",
        },
        { status: 400 },
      )
    }

    const offer = await AuctionService.submitOffer(auctionId, dealer.id, {
      inventoryItemId: body.inventoryItemId,
      cashOtdCents: Math.round(body.cashOtd * 100),
      taxAmountCents: Math.round((body.taxAmount || 0) * 100),
      feesBreakdown: body.feesBreakdown || {},
      financingOptions: (body.financingOptions || []).map((opt: any) => ({
        lenderName: opt.lenderName,
        apr: opt.apr,
        termMonths: opt.termMonths,
        downPaymentCents: Math.round((opt.downPayment || 0) * 100),
        monthlyPaymentCents: Math.round((opt.monthlyPayment || 0) * 100),
      })),
    })

    return NextResponse.json({
      success: true,
      offer,
    })
  } catch (error) {
    console.error("[v0] Submit offer error:", error)
    return NextResponse.json({ error: "Request failed" }, { status: 400 })
  }
}
