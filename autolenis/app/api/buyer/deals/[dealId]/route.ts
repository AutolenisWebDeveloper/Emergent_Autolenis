import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { DealService } from "@/lib/services/deal.service"

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
    return NextResponse.json({ success: false, error: "Failed to fetch deal" }, { status: 500 })
  }
}
