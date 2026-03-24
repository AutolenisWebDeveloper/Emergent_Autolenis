import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { dealerApprovalService } from "@/lib/services/dealer-approval.service"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(["ADMIN"])
    const { id } = await params

    await dealerApprovalService.approveApplication(id, user.userId)

    return NextResponse.json({ success: true, message: "Dealer approved successfully" })
  } catch (error: any) {
    console.error("[ApproveDealerApplication] Error:", error)
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : error instanceof Error && error.message === "Forbidden" ? 403 : 500
    const msg = status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error"
    return NextResponse.json({ error: msg }, { status })
  }
}
