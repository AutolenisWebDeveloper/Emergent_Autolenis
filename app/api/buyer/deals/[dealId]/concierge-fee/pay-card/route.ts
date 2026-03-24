import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { DealService } from "@/lib/services/deal.service"

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["BUYER"])
    const { dealId } = await params
    const body = await request.json()

    const result = await DealService.payConciergeFeeByCard(session.userId, dealId, body.payment_method_id)

    return NextResponse.json({
      success: true,
      data: {
        payment: result.payment,
        client_secret: result.clientSecret,
        fee_options: result.feeOptions,
        already_paid: result.alreadyPaid,
      },
    })
  } catch (error) {
    console.error("Error creating fee payment:", error)
    return NextResponse.json({ success: false, error: "Failed to process fee payment" }, { status: 500 })
  }
}
