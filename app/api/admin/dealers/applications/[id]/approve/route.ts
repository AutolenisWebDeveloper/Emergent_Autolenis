import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { dealerApprovalService } from "@/lib/services/dealer-approval.service"
import { handleRouteError } from "@/lib/utils/route-error"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(["ADMIN"])
    const { id } = await params

    await dealerApprovalService.approveApplication(id, user.userId)

    return NextResponse.json({ success: true, message: "Dealer approved successfully" })
  } catch (error: unknown) {
    console.error("[ApproveDealerApplication] Error:", error)
    return handleRouteError(error, "Internal server error")
  }
}
