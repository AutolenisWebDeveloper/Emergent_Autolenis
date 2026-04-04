import { NextResponse } from "next/server"
import { isTestWorkspace } from "@/lib/app-mode"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { mockActions } from "@/lib/mocks/mockStore"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()

  if (isTestWorkspace(user)) {
    const dealId = body.dealId || "deal_gold_001"
    const buyerId = body.buyerId || "buyer_gold_001"
    const amount = body.amountCents || 25_000
    const reason = body.reason || "Additional fee"
    const paymentRequest = mockActions.requestBuyerPayment(dealId, buyerId, amount, reason)
    return NextResponse.json({
      success: true,
      message: "Payment request queued",
      data: { paymentRequest },
    })
  }

  return NextResponse.json(
    { error: "Payment link generation not configured. Please set up Stripe integration." },
    { status: 501 }
  )
}
