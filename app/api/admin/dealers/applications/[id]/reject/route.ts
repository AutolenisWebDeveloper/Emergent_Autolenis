import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { dealerApprovalService } from "@/lib/services/dealer-approval.service"

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
  } catch (error: any) {
    console.error("[RejectDealerApplication] Error:", error)
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : error instanceof Error && error.message === "Forbidden" ? 403 : 500
    const msg = status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error"
    return NextResponse.json({ error: msg }, { status })
  }
}
