import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { CheckoutService, CheckoutError } from "@/lib/services/checkout.service"

export async function POST(request: Request) {
  try {
    const session = await requireAuth(["BUYER"])
    const body = await request.json()
    const { type, auctionId, dealId } = body

    const supabase = await createClient()
    const { data: buyer, error: buyerError } = await supabase
      .from("BuyerProfile")
      .select("*")
      .eq("userId", session.userId)
      .single()

    if (buyerError || !buyer) {
      console.error("[Payment Checkout] Buyer not found:", buyerError)
      return NextResponse.json({ success: false, error: "Buyer profile not found" }, { status: 400 })
    }

    const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] || "https://autolenis.com"

    if (type === "deposit") {
      if (!auctionId) {
        return NextResponse.json({ success: false, error: "Auction ID required" }, { status: 400 })
      }

      const result = await CheckoutService.getOrCreateDepositCheckout({
        buyerId: buyer.id,
        auctionId,
        successUrl: `${baseUrl}/buyer/auction?success=deposit`,
        cancelUrl: `${baseUrl}/buyer/auction?canceled=true`,
      })

      return NextResponse.json({
        success: true,
        data: { url: result.url, sessionId: result.sessionId },
      })
    }

    if (type === "service_fee") {
      if (!dealId) {
        return NextResponse.json({ success: false, error: "Deal ID required" }, { status: 400 })
      }

      const result = await CheckoutService.getOrCreateServiceFeeCheckout({
        buyerId: buyer.id,
        dealId,
        successUrl: `${baseUrl}/buyer/deal?success=fee`,
        cancelUrl: `${baseUrl}/buyer/deal/fee?canceled=true`,
      })

      return NextResponse.json({
        success: true,
        data: { url: result.url, sessionId: result.sessionId },
      })
    }

    return NextResponse.json({ success: false, error: "Invalid payment type" }, { status: 400 })
  } catch (error: any) {
    if (error?.statusCode === 401 || error?.statusCode === 403) {
      return NextResponse.json({ success: false, error: error.statusCode === 403 ? "Forbidden" : "Unauthorized" }, { status: error.statusCode })
    }
    if (error instanceof CheckoutError) {
      const status = error.code === "UNAUTHORIZED" ? 403 : 400
      return NextResponse.json({ success: false, error: error.message }, { status })
    }
    console.error("[Payment Checkout] Error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
