import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import * as dealerOnboardingConversionService from "@/lib/services/dealer-onboarding-conversion.service"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// GET /api/dealer/onboarding/conversion-status — Check conversion progress
export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])
    const supabase = await createClient()

    // Find prospect linked to this user's dealer or email
    const { data: dealer } = await supabase
      .from("Dealer")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    // Try to find a conversion by dealer ID or prospect
    const { data: prospect } = await supabase
      .from("DealerProspect")
      .select("id")
      .eq("convertedDealerId", dealer?.id ?? "none")
      .maybeSingle()

    if (!prospect?.id) {
      return NextResponse.json({ success: true, data: null })
    }

    const status = await dealerOnboardingConversionService.getConversionStatus(prospect.id)
    return NextResponse.json({ success: true, data: status })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ error: (error as Error).message }, { status: statusCode })
    }
    console.error("[onboarding-conversion] Error:", error)
    return NextResponse.json({ error: "Failed to get conversion status" }, { status: 500 })
  }
}
