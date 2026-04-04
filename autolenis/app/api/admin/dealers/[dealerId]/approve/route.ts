import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"
import { logger } from "@/lib/logger"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function POST(_request: NextRequest, { params }: { params: Promise<{ dealerId: string }> }) {
  const correlationId = randomUUID()
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized", correlationId }, { status: 401 })
    }

    const { dealerId } = await params

    if (isTestWorkspace(user)) {
      const dealer = mockSelectors.adminDealerDetail(dealerId)
      return NextResponse.json({ success: true, dealer })
    }

    let query = supabase
      .from("Dealer")
      .update({
        verified: true,
        active: true,
      })
      .eq("id", dealerId)

    if (user.workspace_id) {
      query = query.eq("workspaceId", user.workspace_id)
    }

    const { data: dealer, error: dealerError } = await query.select().single()

    if (dealerError) {
      logger.error("[Admin Approve Dealer] Update failed", { correlationId, dealerId, workspaceId: user.workspace_id, error: dealerError })
      return NextResponse.json({ error: "Failed to approve dealer", correlationId }, { status: 500 })
    }

    const { error: auditError } = await supabase.from("ComplianceEvent").insert({
      eventType: "DEALER_APPROVED",
      action: "ADMIN_DEALER_APPROVE",
      userId: user.userId,
      details: { dealerId: dealer.id, dealerName: dealer.name || dealer.businessName, correlationId },
    })
    if (auditError) {
      logger.error("[Admin Approve Dealer] Audit log write failed", { correlationId, error: auditError })
      return NextResponse.json(
        { error: "Dealer approved but audit log write failed", correlationId },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, dealer })
  } catch (error) {
    logger.error("[Admin Approve Dealer] Unexpected error", { correlationId, error })
    return NextResponse.json({ error: "Failed to approve dealer", correlationId }, { status: 500 })
  }
}
