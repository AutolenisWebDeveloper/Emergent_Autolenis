import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import * as dealerOnboardingConversionService from "@/lib/services/dealer-onboarding-conversion.service"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// GET /api/dealer/onboarding/status — Get dealer onboarding/conversion status
export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])
    const supabase = await createClient()

    const { data: dealer } = await supabase
      .from("Dealer")
      .select("id, verified, active")
      .eq("userId", user.userId)
      .maybeSingle()

    if (!dealer?.id) {
      return NextResponse.json({
        success: true,
        data: { status: "not_started", dealer: null },
      })
    }

    // Check if there's a conversion in progress
    const { data: prospect } = await supabase
      .from("DealerProspect")
      .select("id, status")
      .eq("convertedDealerId", dealer.id)
      .maybeSingle()

    let conversionStatus = null
    if (prospect?.id) {
      conversionStatus = await dealerOnboardingConversionService.getConversionStatus(prospect.id)
    }

    return NextResponse.json({
      success: true,
      data: {
        status: dealer.verified ? "verified" : dealer.active ? "active" : "pending",
        dealer: { id: dealer.id, verified: dealer.verified, active: dealer.active },
        conversion: conversionStatus,
      },
    })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ error: (error as Error).message }, { status: statusCode })
    }
    console.error("[onboarding-status] Error:", error)
    return NextResponse.json({ error: "Failed to get status" }, { status: 500 })
  }
}
