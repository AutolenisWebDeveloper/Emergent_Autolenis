import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      )
    }

    if (user.role !== "BUYER") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => ({}))

    // Delegate to the canonical fee payment service
    const { PaymentService } = await import("@/lib/services/payment.service")
      .catch((importErr) => {
        console.error("[buyer/fee/pay-card] PaymentService import failed:", importErr)
        return { PaymentService: null }
      })

    if (!PaymentService) {
      return NextResponse.json(
        { success: false, error: "Payment service unavailable" },
        { status: 503 },
      )
    }

    const result = await PaymentService.createServiceFeePayment(
      body.dealId,
      user.userId,
    )
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error("[buyer/fee/pay-card] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process fee payment" },
      { status: 500 },
    )
  }
}
