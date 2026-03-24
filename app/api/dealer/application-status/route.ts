import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { dealerApprovalService } from "@/lib/services/dealer-approval.service"

export async function GET() {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])
    const status = await dealerApprovalService.getApplicationStatus(user.userId)
    return NextResponse.json({ success: true, data: status })
  } catch (error) {
    console.error("[ApplicationStatus] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
