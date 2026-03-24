import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { DealService, DealStatus, type DealStatus as DealStatusType } from "@/lib/services/deal.service"
import { supabase } from "@/lib/db"

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["ADMIN"])
    const { dealId } = await params
    const body = await request.json()

    const { status, cancel_reason } = body

    if (!status) {
      return NextResponse.json({ success: false, error: "status is required" }, { status: 400 })
    }

    // Fail-closed: require workspace_id
    const wsId = session.workspace_id
    if (!wsId) {
      return NextResponse.json({ success: false, error: "Forbidden: no workspace" }, { status: 403 })
    }

    // Verify deal belongs to workspace before status mutation
    const { data: dealCheck } = await supabase
      .from("SelectedDeal")
      .select("id")
      .eq("id", dealId)
      .eq("workspaceId", wsId)
      .single()

    if (!dealCheck) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 })
    }

    // Only allow valid DealStatus values
    const validStatuses = Object.values(DealStatus) as DealStatusType[]

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid deal status" }, { status: 400 })
    }

    const result = await DealService.adminOverrideStatus(
      dealId,
      status,
      cancel_reason || `Admin override to ${status}`,
      session.userId,
    )

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error("Error updating deal status:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
