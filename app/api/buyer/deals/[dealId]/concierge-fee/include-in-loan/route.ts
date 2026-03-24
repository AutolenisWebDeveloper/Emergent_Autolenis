import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { DealService } from "@/lib/services/deal.service"

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["BUYER"])
    const { dealId } = await params
    const body = await request.json()

    const { confirm } = body

    if (!confirm) {
      return NextResponse.json({ success: false, error: "Confirmation required" }, { status: 400 })
    }

    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    const result = await DealService.includeConciergeFeeInLoan(session.userId, dealId, confirm, ipAddress, userAgent)

    return NextResponse.json({
      success: true,
      data: {
        payment: result.payment,
        disclosure: result.disclosure,
        impact: result.impact,
      },
    })
  } catch (error) {
    console.error("Error including fee in loan:", error)
    return NextResponse.json({ success: false, error: "Failed to include fee in loan" }, { status: 500 })
  }
}
