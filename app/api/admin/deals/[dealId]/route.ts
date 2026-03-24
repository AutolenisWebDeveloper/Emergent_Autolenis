import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { DealService } from "@/lib/services/deal.service"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"
import { supabase } from "@/lib/db"

export async function GET(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const user = await requireAuth(["ADMIN"])
    const { dealId } = await params

    if (isTestWorkspace(user)) {
      const deal = mockSelectors.adminDealDetail(dealId)
      if (!deal) {
        return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 })
      }
      return NextResponse.json({ success: true, deal })
    }

    // Fail-closed: require workspace_id for non-test workspaces
    const wsId = user.workspace_id
    if (!wsId) {
      return NextResponse.json({ success: false, error: "Forbidden: no workspace" }, { status: 403 })
    }

    // Verify deal belongs to workspace before loading full detail
    const { data: dealCheck } = await supabase
      .from("SelectedDeal")
      .select("id")
      .eq("id", dealId)
      .eq("workspaceId", wsId)
      .single()

    if (!dealCheck) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 })
    }

    const dealData = await DealService.getDealForAdmin(dealId)

    return NextResponse.json({
      success: true,
      deal: dealData,
      data: dealData,
    })
  } catch (error: any) {
    console.error("Error fetching deal for admin:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
