import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { dealerApprovalService } from "@/lib/services/dealer-approval.service"
import { handleRouteError } from "@/lib/utils/route-error"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(["ADMIN"])
    const { id } = await params
    const body = await request.json()

    if (!body.reason) {
      return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 })
    }

    await dealerApprovalService.rejectApplication(id, user.userId, body.reason)

    return NextResponse.json({ success: true, message: "Application rejected" })
  } catch (error: unknown) {
    console.error("[RejectDealerApplication] Error:", error)
    return handleRouteError(error, "Internal server error")
  }
}
