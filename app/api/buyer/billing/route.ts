import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await requireAuth(["BUYER"])
    const supabase = await createClient()

    const { data: buyer, error: buyerError } = await supabase
      .from("BuyerProfile")
      .select("id")
      .eq("userId", session.userId)
      .single()

    if (buyerError || !buyer) {
      return NextResponse.json({ success: false, error: "Buyer profile not found" }, { status: 404 })
    }

    // Get all deposits for this buyer
    const { data: deposits, error: depositsError } = await supabase
      .from("DepositPayment")
      .select("*")
      .eq("buyerId", buyer.id)
      .order("createdAt", { ascending: false })

    if (depositsError) {
      throw depositsError
    }

    // Get all service fee payments for this buyer's deals
    const { data: serviceFees, error: serviceFeesError } = await supabase
      .from("ServiceFeePayment")
      .select(`
        *,
        deal:SelectedDeal(*)
      `)
      .or(`user_id.eq.${session.userId},deal.buyerId.eq.${buyer.id}`)
      .order("createdAt", { ascending: false })

    if (serviceFeesError) {
      throw serviceFeesError
    }

    return NextResponse.json({
      success: true,
      data: {
        deposits: deposits || [],
        serviceFees: serviceFees || [],
      },
    })
  } catch (error) {
    console.error("[Buyer Billing] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch billing information" }, { status: 500 })
  }
}
