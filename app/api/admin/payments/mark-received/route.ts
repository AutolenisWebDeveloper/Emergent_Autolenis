import { NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockActions } from "@/lib/mocks/mockStore"

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { paymentRequestId } = await request.json()
    if (!paymentRequestId) {
      return NextResponse.json({ success: false, error: "Missing paymentRequestId" }, { status: 400 })
    }

    if (isTestWorkspace(user)) {
      const paymentRequest = mockActions.markBuyerPaymentReceived(paymentRequestId)
      return NextResponse.json({ success: true, data: paymentRequest })
    }

    return NextResponse.json({ success: false, error: "Payment processing not available" }, { status: 501 })
  } catch (error: any) {
    console.error("[Admin Payment Received API]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
