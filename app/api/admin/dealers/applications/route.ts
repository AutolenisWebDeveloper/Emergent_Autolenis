import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { dealerApprovalService } from "@/lib/services/dealer-approval.service"
import { handleRouteError } from "@/lib/utils/route-error"

export async function GET() {
  try {
    await requireAuth(["ADMIN"])

    const applications = await dealerApprovalService.getPendingApplications()

    return NextResponse.json({ success: true, data: applications })
  } catch (error: unknown) {
    console.error("[DealerApplications] Error:", error)
    return handleRouteError(error, "Internal server error")
  }
}
