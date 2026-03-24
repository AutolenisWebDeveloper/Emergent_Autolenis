import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { PaymentService } from "@/lib/services/payment.service"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    await requireAuth(["BUYER"])
    const { dealId } = await params

    const feeOptions = await PaymentService.getFeeOptions(dealId)

    return NextResponse.json({
      success: true,
      data: {
        baseFee: feeOptions.baseFeeCents / 100,
        depositCredit: feeOptions.depositAppliedCents / 100,
        finalAmount: feeOptions.remainingCents / 100,
        baseFeeCents: feeOptions.baseFeeCents,
        depositAppliedCents: feeOptions.depositAppliedCents,
        remainingCents: feeOptions.remainingCents,
        totalOtdCents: feeOptions.totalOtdCents,
        options: feeOptions.options,
      },
    })
  } catch (error: any) {
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      return NextResponse.json({ success: false, error: error.statusCode === 403 ? "Forbidden" : "Unauthorized" }, { status: error.statusCode })
    }
    console.error("[Payment Fee Options]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
