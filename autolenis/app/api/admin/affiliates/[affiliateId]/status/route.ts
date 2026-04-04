import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockDb } from "@/lib/mocks/mockStore"
import { logger } from "@/lib/logger"
import { randomUUID } from "crypto"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ affiliateId: string }> }
) {
  const correlationId = randomUUID()
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized", correlationId }, { status: 401 })
    }

    const { affiliateId } = await params
    const body = await request.json()
    const { status, reason } = body

    if (!status || !["ACTIVE", "PENDING", "SUSPENDED", "INACTIVE"].includes(status)) {
      return NextResponse.json({ error: "Invalid status", correlationId }, { status: 400 })
    }

    if (isTestWorkspace(user)) {
      const affiliate = mockDb.affiliateProfiles.find((item: any) => item.id === affiliateId)
      if (affiliate) {
        affiliate.status = status
      }
      return NextResponse.json({
        success: true,
        affiliate: {
          id: affiliateId,
          status,
          reason,
        },
      })
    }

    const supabase = await createClient()

    // Update affiliate status
    const { data: affiliate, error } = await supabase
      .from("Affiliate")
      .update({
        status,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", affiliateId)
      .select()
      .single()

    if (error) {
      logger.error("[Affiliate Status Update] Update failed", { correlationId, error })
      return NextResponse.json({ error: "Failed to update affiliate status", correlationId }, { status: 500 })
    }

    // Log compliance event
    const { error: auditError } = await supabase.from("ComplianceEvent").insert({
      eventType: `AFFILIATE_STATUS_${status}`,
      action: `ADMIN_AFFILIATE_STATUS_${status}`,
      userId: user.userId,
      details: {
        affiliateId,
        previousStatus: affiliate.status,
        newStatus: status,
        reason: reason || null,
        updatedBy: user.email,
        correlationId,
      },
    })
    if (auditError) {
      logger.error("[Affiliate Status Update] Audit log write failed", { correlationId, error: auditError })
      return NextResponse.json(
        { error: "Affiliate status updated but audit log write failed", correlationId },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      affiliate: {
        id: affiliate.id,
        status: affiliate.status,
      },
    })
  } catch (error) {
    logger.error("[Affiliate Status Update] Unexpected error", { correlationId, error })
    return NextResponse.json({ error: "Failed to update affiliate status", correlationId }, { status: 500 })
  }
}
