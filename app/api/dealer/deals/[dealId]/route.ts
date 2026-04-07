import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { DealService } from "@/lib/services/deal.service"
import { createClient } from "@/lib/supabase/server"
import { handleRouteError } from "@/lib/utils/route-error"

export async function GET(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["DEALER", "DEALER_USER"])
    const { dealId } = await params

    const supabase = await createClient()
    const { data: dealerUser, error } = await supabase
      .from("DealerUser")
      .select("*")
      .eq("userId", session.userId)
      .single()

    if (error || !dealerUser) {
      console.error("[Dealer Deal] Dealer user not found:", error)
      return NextResponse.json({ success: false, error: "Dealer not found" }, { status: 403 })
    }

    const dealData = await DealService.getDealForDealer(dealerUser.dealerId, dealId)

    if (!dealData) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: dealData,
    })
  } catch (error) {
    console.error("[Dealer Deal] Error:", error)
    return handleRouteError(error, "Deal not found or access denied")
  }
}
