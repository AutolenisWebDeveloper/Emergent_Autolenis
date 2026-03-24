import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { InsuranceService } from "@/lib/services/insurance.service"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"
import { supabase } from "@/lib/db"

export async function GET(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const user = await requireAuth(["ADMIN"])
    const { dealId } = await params

    if (isTestWorkspace(user)) {
      const data = mockSelectors.adminDealInsurance(dealId)
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

    // Verify deal belongs to workspace before loading insurance detail
    const { data: dealCheck } = await supabase
      .from("SelectedDeal")
      .select("id")
      .eq("id", dealId)
      .eq("workspaceId", wsId)
      .single()

    if (!dealCheck) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 })
    }

    const data = await InsuranceService.getAdminFullDetail(dealId)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error("Error fetching admin insurance detail:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
