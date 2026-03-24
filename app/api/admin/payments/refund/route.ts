import { NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { PaymentService } from "@/lib/services/payment.service"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockActions, mockSelectors } from "@/lib/mocks/mockStore"

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { paymentId, type, reason } = await request.json()
    if (!paymentId || !reason) {
      return NextResponse.json({ success: false, error: "Missing paymentId and reason" }, { status: 400 })
    }

    if (isTestWorkspace(user)) {
      const dealId = "deal_gold_001"
      const buyerId = "buyer_gold_001"
      const amount = mockSelectors.adminPayments().deposits.find((payment: any) => payment.id === paymentId)?.amountCents || 0
      const refund = mockActions.createBuyerRefund(dealId, buyerId, amount, reason)
      const issued = mockActions.issueBuyerRefund(refund.id)
      return NextResponse.json({ success: true, data: issued })
    }

    const result = await PaymentService.processRefund(paymentId, type || "deposit", reason, user.userId)
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error("[Admin Payment Refund API]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
