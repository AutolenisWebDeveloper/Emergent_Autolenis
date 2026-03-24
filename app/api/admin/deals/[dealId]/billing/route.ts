import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"

export async function GET(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const user = await requireAuth(["ADMIN", "SUPER_ADMIN"])
    const { dealId } = await params

    if (isTestWorkspace(user)) {
      const data = mockSelectors.adminDealBilling(dealId)
      if (!data) {
        return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 })
      }
      return NextResponse.json({ success: true, data })
    }

    // Fail-closed: require workspace_id for non-test workspaces
    const wsId = user.workspace_id
    if (!wsId) {
      return NextResponse.json({ success: false, error: "Forbidden: no workspace" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: { dealId, ledger: [], paymentRequests: [], deposits: [] },
    })
  } catch (error: any) {
    console.error("[Admin Deal Billing API]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
