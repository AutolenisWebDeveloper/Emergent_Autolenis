import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser, isAdminRole } from "@/lib/auth-server"
import { adminService } from "@/lib/services/admin.service"
import { z } from "zod"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockActions } from "@/lib/mocks/mockStore"

const schema = z.object({
  depositId: z.string(),
  reason: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { depositId, reason } = schema.parse(body)

    if (isTestWorkspace(user)) {
      const refund = mockActions.createBuyerRefund("deal_gold_001", "buyer_gold_001", 100_000, reason)
      const issued = mockActions.issueBuyerRefund(refund.id)
      return NextResponse.json(issued)
    }

    const result = await adminService.refundDeposit(depositId, reason, user.userId)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[Admin Refund Deposit]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
