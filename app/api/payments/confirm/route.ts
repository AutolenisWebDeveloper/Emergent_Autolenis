import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { stripe } from "@/lib/stripe"
import { PaymentService } from "@/lib/services/payment.service"

export async function POST(request: Request) {
  try {
    await requireAuth(["BUYER"])
    const body = await request.json()
    const { paymentIntentId, type } = body

    // Verify the payment intent succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        {
          success: false,
          error: "Payment not completed",
        },
        { status: 400 },
      )
    }

    if (type === "deposit") {
      const payment = await PaymentService.confirmDepositPayment(paymentIntentId)
      return NextResponse.json({ success: true, data: payment })
    }

    if (type === "service_fee") {
      const payment = await PaymentService.confirmServiceFeePayment(paymentIntentId)
      return NextResponse.json({ success: true, data: payment })
    }

    return NextResponse.json({ success: false, error: "Invalid payment type" }, { status: 400 })
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ success: false, error: statusCode === 403 ? "Forbidden" : "Unauthorized" }, { status: statusCode })
    }
    console.error("[Payment Confirm]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
