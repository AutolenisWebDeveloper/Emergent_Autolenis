import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { InsuranceService } from "@/lib/services/insurance.service"

export async function GET(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["DEALER_USER"])
    const { dealId } = await params

    const supabase = await createClient()
    const { data: dealerUser, error } = await supabase
      .from("DealerUser")
      .select("*")
      .eq("userId", session.userId)
      .single()

    if (error || !dealerUser) {
      console.error("[Dealer Insurance] Dealer user not found:", error)
      return NextResponse.json({ success: false, error: "Dealer not found" }, { status: 403 })
    }

    const data = await InsuranceService.getDealerView(dealerUser.dealerId, dealId)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("[Dealer Insurance] Error:", error)
    return NextResponse.json({ success: false, error: "Request failed" }, { status: 400 })
  }
}
