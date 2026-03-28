import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { InsuranceService } from "@/lib/services/insurance.service"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["BUYER"])
    const { dealId } = await params

    const data = await InsuranceService.getInsuranceOverview(session.userId, dealId)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ success: false, error: statusCode === 403 ? "Forbidden" : "Unauthorized" }, { status: statusCode })
    }
    console.error("Error fetching insurance:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch insurance" }, { status: 500 })
  }
}
