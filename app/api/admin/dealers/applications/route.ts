import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { dealerApprovalService } from "@/lib/services/dealer-approval.service"

export async function GET() {
  try {
    await requireAuth(["ADMIN"])

    const applications = await dealerApprovalService.getPendingApplications()

    return NextResponse.json({ success: true, data: applications })
  } catch (error: any) {
    console.error("[DealerApplications] Error:", error)
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : error instanceof Error && error.message === "Forbidden" ? 403 : 500
    const msg = status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error"
    return NextResponse.json({ error: msg }, { status })
  }
}
