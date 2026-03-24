import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { isTestWorkspace } from "@/lib/app-mode"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const VALID_STATUSES = ["INITIATED", "PROCESSING", "PAID", "FAILED", "CANCELED", "PENDING", "COMPLETED"]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { paymentId } = await params
    const body = await request.json()
    const { status, externalTransactionId } = body

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      )
    }

    if (isTestWorkspace(user)) {
      return NextResponse.json({
        success: true,
        payment: {
          id: paymentId,
          status,
          paymentId: externalTransactionId || null,
          paidAt: status === "PAID" || status === "COMPLETED" ? new Date().toISOString() : null,
        },
      })
    }

    const supabase = await createClient()

    const updateData: Record<string, any> = {
      status,
    }

    if (externalTransactionId) {
      updateData.paymentId = externalTransactionId
    }

    if (status === "PAID" || status === "COMPLETED") {
      updateData.paidAt = new Date().toISOString()
    }

    let query = supabase
      .from("Payout")
      .update(updateData)
      .eq("id", paymentId)

    if (user.workspace_id) {
      query = query.eq("workspaceId", user.workspace_id)
    }

    const { data: payment, error } = await query.select().single()

    if (error) {
      const correlationId = randomUUID()
      logger.error("[Admin Update Payment Error]", error, { correlationId })
      return NextResponse.json({ error: "Failed to update payment", correlationId }, { status: 500 })
    }

    return NextResponse.json({ success: true, payment })
  } catch (error) {
    const correlationId = randomUUID()
    logger.error("[Admin Update Payment Error]", error, { correlationId })
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 })
  }
}
