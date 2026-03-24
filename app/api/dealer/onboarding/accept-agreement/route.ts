import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import * as dealerOnboardingConversionService from "@/lib/services/dealer-onboarding-conversion.service"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// POST /api/dealer/onboarding/accept-agreement — Accept partner agreement
export async function POST(_req: NextRequest) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])
    const supabase = await createClient()

    const { data: dealer } = await supabase
      .from("Dealer")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    const { data: prospect } = await supabase
      .from("DealerProspect")
      .select("id")
      .eq("convertedDealerId", dealer?.id ?? "none")
      .maybeSingle()

    if (!prospect?.id) {
      return NextResponse.json({ error: "No active conversion found" }, { status: 404 })
    }

    const conversion = await dealerOnboardingConversionService.getConversionStatus(prospect.id)
    if (!conversion) {
      return NextResponse.json({ error: "No active conversion found" }, { status: 404 })
    }

    const result = await dealerOnboardingConversionService.acceptAgreement((conversion as { id: string }).id)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ error: (error as Error).message }, { status: statusCode })
    }
    console.error("[onboarding-agreement] Error:", error)
    return NextResponse.json({ error: "Failed to accept agreement" }, { status: 500 })
  }
}
