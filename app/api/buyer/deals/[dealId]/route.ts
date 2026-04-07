import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { DealService } from "@/lib/services/deal.service"
import { handleRouteError } from "@/lib/utils/route-error"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["BUYER"])
    const { dealId } = await params

    const dealData = await DealService.getSelectedDealForBuyer(session.userId, dealId)

    return NextResponse.json({
      success: true,
      data: dealData,
    })
  } catch (error) {
    console.error("Error fetching deal:", error)
    return handleRouteError(error, "Failed to fetch deal")
  }
}
