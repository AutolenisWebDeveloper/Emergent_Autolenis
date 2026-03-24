import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { adminService } from "@/lib/services/admin.service"
import { PaymentService } from "@/lib/services/payment.service"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockActions, mockSelectors } from "@/lib/mocks/mockStore"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = (searchParams.get("type") as any) || "all"
    const status = searchParams.get("status") || "all"
    const search = searchParams.get("search") || undefined
    const page = Number.parseInt(searchParams.get("page") || "1")

    if (isTestWorkspace(user)) {
      return NextResponse.json({ success: true, data: mockSelectors.adminPayments() })
    }

    const wsId = user.workspace_id
    if (!wsId) {
      return NextResponse.json({ error: "Forbidden: no workspace" }, { status: 403 })
    }

    const result = await adminService.getAllPayments({ type, status, search, page, workspaceId: wsId })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[Admin Payments Error]", error)
    return NextResponse.json({ error: "Failed to load payments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, paymentId, depositId, type, reason } = await request.json()

    if (isTestWorkspace(user)) {
      if (action === "refund_deposit" || action === "refund") {
        const id = paymentId || depositId
        const dealId = "deal_gold_001"
        const buyerId = "buyer_gold_001"
        const amount = id
          ? mockSelectors.adminPayments().deposits.find((payment: any) => payment.id === id)?.amountCents || 0
          : 0
        const refund = mockActions.createBuyerRefund(dealId, buyerId, amount, reason || "Refund requested")
        const issued = mockActions.issueBuyerRefund(refund.id)
        return NextResponse.json({ success: true, data: issued })
      }
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    // Fail-closed: require workspace_id for non-test workspaces
    const wsId = user.workspace_id
    if (!wsId) {
      return NextResponse.json({ error: "Forbidden: no workspace" }, { status: 403 })
    }

    if (action === "refund_deposit" || action === "refund") {
      const id = paymentId || depositId
      const paymentType = type || "deposit"

      if (!id || !reason) {
        return NextResponse.json({ error: "Missing paymentId and reason" }, { status: 400 })
      }

      const result = await PaymentService.processRefund(id, paymentType, reason, user.userId)
      return NextResponse.json({ success: true, data: result })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("[Admin Payments Action Error]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
