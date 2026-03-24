import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { DealService } from "@/lib/services/deal.service"

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["BUYER"])
    const { dealId } = await params
    const body = await request.json()

    const { insurance_quote_id } = body

    if (!insurance_quote_id) {
      return NextResponse.json({ success: false, error: "insurance_quote_id is required" }, { status: 400 })
    }

    const policy = await DealService.selectInsuranceQuote(session.userId, dealId, insurance_quote_id)

    return NextResponse.json({
      success: true,
      data: { policy },
    })
  } catch (error) {
    console.error("Error selecting insurance:", error)
    return NextResponse.json({ success: false, error: "Failed to select insurance" }, { status: 500 })
  }
}
