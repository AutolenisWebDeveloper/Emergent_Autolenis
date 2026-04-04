import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { PaymentService } from "@/lib/services/payment.service"
import { DealService } from "@/lib/services/deal.service"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["BUYER"])
    const { dealId } = await params

    // Verify ownership
    await DealService.getSelectedDealForBuyer(session.userId, dealId)

    const feeOptions = await PaymentService.getFeeOptions(dealId)

    return NextResponse.json({
      success: true,
      data: {
        fee_amount_cents: feeOptions.baseFeeCents,
        deposit_applied_cents: feeOptions.depositAppliedCents,
        remaining_cents: feeOptions.remainingCents,
        existing_payment: feeOptions.existingPayment,
        options: feeOptions.options,
      },
    })
  } catch (error) {
    console.error("Error fetching concierge fee:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch concierge fee" }, { status: 500 })
  }
}
