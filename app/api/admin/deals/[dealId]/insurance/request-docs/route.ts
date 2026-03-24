import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockActions, mockSelectors } from "@/lib/mocks/mockStore"

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["ADMIN"])
    const { dealId } = await params
    const body = await request.json()

    const { type, notes, dueDate } = body

    if (!type) {
      return NextResponse.json(
        { success: false, error: "type is required" },
        { status: 400 },
      )
    }

    if (isTestWorkspace(session)) {
      const requestEntry = mockActions.requestInsuranceDocs(dealId, type, notes, dueDate)
      return NextResponse.json({ success: true, data: requestEntry })
    }

    // Fail-closed: require workspace_id
    const wsId = session.workspace_id
    if (!wsId) {
      return NextResponse.json({ success: false, error: "Forbidden: no workspace" }, { status: 403 })
    }

    // Get the deal to find the buyerId — scoped to workspace
    const { data: deal, error: dealError } = await supabase
      .from("SelectedDeal")
      .select("id, buyerId")
      .eq("id", dealId)
      .eq("workspaceId", wsId)
      .single()

    if (dealError || !deal) {
      return NextResponse.json(
        { success: false, error: "Deal not found" },
        { status: 404 },
      )
    }

    const { data: docRequest, error: insertError } = await supabase
      .from("InsuranceDocRequest")
      .insert({
        dealId,
        buyerId: deal.buyerId,
        requestedByRole: "ADMIN",
        requestedByUserId: session.userId,
        type,
        status: "REQUESTED",
        notes: notes || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("[Admin DocRequest] Insert error:", insertError)
      return NextResponse.json(
        { success: false, error: "Failed to create document request" },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data: docRequest })
  } catch (error: any) {
    console.error("[Admin DocRequest] POST error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const user = await requireAuth(["ADMIN"])
    const { dealId } = await params

    if (isTestWorkspace(user)) {
      return NextResponse.json({ success: true, data: mockSelectors.insuranceDocRequests(dealId) })
    }

    // Fail-closed: require workspace_id
    const wsId = user.workspace_id
    if (!wsId) {
      return NextResponse.json({ success: false, error: "Forbidden: no workspace" }, { status: 403 })
    }

    // Verify deal belongs to workspace before reading doc requests
    const { data: dealCheck } = await supabase
      .from("SelectedDeal")
      .select("id")
      .eq("id", dealId)
      .eq("workspaceId", wsId)
      .single()

    if (!dealCheck) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 })
    }

    const { data: requests, error } = await supabase
      .from("InsuranceDocRequest")
      .select("*")
      .eq("dealId", dealId)
      .order("createdAt", { ascending: false })

    if (error) {
      console.error("[Admin DocRequest] GET error:", error)
      return NextResponse.json(
        { success: false, error: "Failed to fetch document requests" },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data: requests })
  } catch (error: any) {
    console.error("[Admin DocRequest] GET error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
