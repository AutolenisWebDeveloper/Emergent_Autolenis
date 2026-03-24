import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { PaymentService } from "@/lib/services/payment.service"

export async function POST(request: Request) {
  try {
    await requireAuth(["BUYER"])
    const body = await request.json()

    const result = await PaymentService.createServiceFeePayment(body.dealId, body.userId || "")

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      return NextResponse.json({ success: false, error: error.statusCode === 403 ? "Forbidden" : "Unauthorized" }, { status: error.statusCode })
    }
    console.error("[Payment Fee Pay Card]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
