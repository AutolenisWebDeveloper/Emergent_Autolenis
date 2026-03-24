import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Get dealer profile
    const { data: dealer } = await supabase
      .from("Dealer")
      .select("id, workspaceId")
      .eq("userId", user.userId)
      .single()

    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    // Find outstanding fees for this dealer
    const { data: deals } = await supabase
      .from("SelectedDeal")
      .select("id")
      .eq("dealerId", dealer.id)

    const dealIds = deals?.map((d: { id: string }) => d.id) || []

    if (dealIds.length === 0) {
      return NextResponse.json({ error: "No outstanding fees" }, { status: 400 })
    }

    const { data: fees } = await supabase
      .from("ServiceFeePayment")
      .select("id, amount")
      .in("dealId", dealIds)
      .in("status", ["DUE", "PENDING", "OVERDUE"])

    const totalDue = (fees || []).reduce((sum: number, f: any) => sum + (f.amount || 0), 0)

    if (totalDue <= 0) {
      return NextResponse.json({ error: "No outstanding balance" }, { status: 400 })
    }

    // Create Stripe checkout session if Stripe is configured
    const feeIds = (fees || []).map((f: any) => f.id)

    // Check if Stripe is configured
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (stripeKey) {
      const { default: Stripe } = await import("stripe")
      const stripe = new Stripe(stripeKey)

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "AutoLenis Service Fees",
                description: `Payment for ${feeIds.length} outstanding fee(s)`,
              },
              unit_amount: Math.round(totalDue * 100),
            },
            quantity: 1,
          },
        ],
        metadata: {
          dealerId: dealer.id,
          workspaceId: dealer.workspaceId,
          feeIds: JSON.stringify(feeIds),
          type: "dealer_service_fee",
        },
        success_url: `${appUrl}/dealer/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/dealer/payments/cancel`,
      })

      return NextResponse.json({ success: true, url: session.url })
    }

    return NextResponse.json({
      error: "Payment processing not configured. Contact support.",
    }, { status: 503 })
  } catch (error) {
    console.error("[Dealer Payments Checkout] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
