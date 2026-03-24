import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { InsuranceService } from "@/lib/services/insurance.service"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockActions } from "@/lib/mocks/mockStore"
import { supabase } from "@/lib/db"

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["ADMIN"])
    const { dealId } = await params
    const body = await request.json()

    const { policy_id, verified } = body

    if (!policy_id || typeof verified !== "boolean") {
      return NextResponse.json(
        { success: false, error: "policy_id and verified (boolean) are required" },
        { status: 400 },
      )
    }

    if (isTestWorkspace(session)) {
      const policy = mockActions.verifyInsurancePolicy(dealId, policy_id, verified)
      if (!policy) {
        return NextResponse.json({ success: false, error: "Policy not found" }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: policy })
    }

    // Fail-closed: require workspace_id
    const wsId = session.workspace_id
    if (!wsId) {
      return NextResponse.json({ success: false, error: "Forbidden: no workspace" }, { status: 403 })
    }

    // Verify deal belongs to workspace before mutation
    const { data: dealCheck } = await supabase
      .from("SelectedDeal")
      .select("id")
      .eq("id", dealId)
      .eq("workspaceId", wsId)
      .single()

    if (!dealCheck) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 })
    }

    const result = await InsuranceService.verifyExternalPolicy(session.userId, dealId, policy_id, verified)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error("Error verifying external policy:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
