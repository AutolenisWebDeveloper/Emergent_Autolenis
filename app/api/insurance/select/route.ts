import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { InsuranceService } from "@/lib/services/insurance.service"

export async function POST(request: Request) {
  try {
    const session = await requireAuth(["BUYER"])
    const body = await request.json()

    const result = await InsuranceService.selectQuote(session.userId, body.dealId, body.quoteId)

    return NextResponse.json({
      success: true,
      data: { policy: result },
    })
  } catch (error: any) {
    console.error("[Insurance Select]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
