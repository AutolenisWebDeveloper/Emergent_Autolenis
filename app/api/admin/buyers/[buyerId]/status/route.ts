import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"
import { logger } from "@/lib/logger"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ buyerId: string }> }) {
  const correlationId = randomUUID()
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized", correlationId }, { status: 401 })
    }

    const { buyerId } = await params
    const body = await request.json()
    const { action } = body

    if (!action || !["suspend", "reactivate"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'suspend' or 'reactivate'.", correlationId }, { status: 400 })
    }

    if (isTestWorkspace(user)) {
      const buyer = mockSelectors.adminBuyerDetail(buyerId)
      return NextResponse.json({ success: true, buyer })
    }

    const supabase = await createClient()

    const newStatus = action === "suspend" ? "SUSPENDED" : "ACTIVE"

    const { data: updatedUser, error: updateError } = await supabase
      .from("User")
      .update({ status: newStatus })
      .eq("id", buyerId)
      .eq("workspaceId", user.workspace_id)
      .select()
      .single()

    if (updateError) {
      logger.error("[Admin Buyer Status] Update failed", { correlationId, error: updateError })
      return NextResponse.json({ error: `Failed to ${action} buyer`, correlationId }, { status: 500 })
    }

    const { error: auditError } = await supabase.from("ComplianceEvent").insert({
      eventType: action === "suspend" ? "BUYER_SUSPENDED" : "BUYER_REACTIVATED",
      action: `ADMIN_BUYER_${action.toUpperCase()}`,
      userId: user.userId,
      buyerId: updatedUser.id,
      details: { buyerEmail: updatedUser.email, action, correlationId },
    })
    if (auditError) {
      logger.error("[Admin Buyer Status] Audit log write failed", { correlationId, error: auditError })
      return NextResponse.json(
        { error: "Buyer status updated but audit log write failed", correlationId },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, buyer: updatedUser })
  } catch (error) {
    logger.error("[Admin Buyer Status] Unexpected error", { correlationId, error })
    return NextResponse.json({ error: "Failed to update buyer status", correlationId }, { status: 500 })
  }
}
