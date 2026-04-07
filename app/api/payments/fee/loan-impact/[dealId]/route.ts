import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { PaymentService } from "@/lib/services/payment.service"
import { handleRouteError } from "@/lib/utils/route-error"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    await requireAuth(["BUYER"])
    const { dealId } = await params

    const impact = await PaymentService.getLoanImpact(dealId)

    return NextResponse.json({
      success: true,
      data: {
        feeAmount: impact.feeAmount,
        apr: impact.apr,
        termMonths: impact.termMonths,
        baseMonthly: impact.baseMonthly,
        newMonthly: impact.newMonthly,
        monthlyIncrease: impact.monthlyIncrease,
        totalExtraCost: impact.totalExtraCost,
        // Cents for calculations
        feeAmountCents: impact.feeAmountCents,
        baseMonthlyCents: impact.baseMonthlyCents,
        newMonthlyCents: impact.newMonthlyCents,
        deltaMonthlyCents: impact.deltaMonthlyCents,
        totalExtraCostCents: impact.totalExtraCostCents,
      },
    })
  } catch (error: unknown) {
    console.error("[Payment Fee Loan Impact]", error)
    return handleRouteError(error, "Internal server error")
  }
}