import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { esignService } from "@/lib/services/esign.service"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { dealId } = await params
    const result = await esignService.getEnvelopeForBuyer(dealId, user.id)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("[E-Sign] Get status error:", error)
    return NextResponse.json({ error: "Failed to get e-sign status" }, { status: 500 })
  }
}
