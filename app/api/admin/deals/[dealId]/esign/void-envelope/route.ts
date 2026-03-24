import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { esignService } from "@/lib/services/esign.service"
import { supabase } from "@/lib/db"
import { z } from "zod"

const schema = z.object({
  reason: z.string().min(1, "Reason is required"),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { dealId } = await params

    // Fail-closed: require workspace_id
    const wsId = user.workspace_id
    if (!wsId) {
      return NextResponse.json({ error: "Forbidden: no workspace" }, { status: 403 })
    }

    // Verify deal belongs to workspace before mutation
    const { data: dealCheck } = await supabase
      .from("SelectedDeal")
      .select("id")
      .eq("id", dealId)
      .eq("workspaceId", wsId)
      .single()

    if (!dealCheck) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    }

    const body = await req.json()
    const { reason } = schema.parse(body)

    const result = await esignService.voidEnvelope(dealId, user.userId, reason)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[Admin E-Sign] Void error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
