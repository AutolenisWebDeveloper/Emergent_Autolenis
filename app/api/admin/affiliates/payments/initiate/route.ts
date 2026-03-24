import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { isTestWorkspace } from "@/lib/app-mode"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { affiliateId, amount, method } = body

    if (!affiliateId || typeof affiliateId !== "string") {
      return NextResponse.json({ error: "affiliateId is required" }, { status: 400 })
    }
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "A positive amount is required" }, { status: 400 })
    }
    if (!method || typeof method !== "string") {
      return NextResponse.json({ error: "Payment method is required" }, { status: 400 })
    }

    if (isTestWorkspace(user)) {
      return NextResponse.json({
        success: true,
        payment: {
          id: `payout_mock_${randomUUID().slice(0, 8)}`,
          affiliateId,
          amount,
          paymentMethod: method,
          status: "INITIATED",
          paymentId: null,
          paidAt: null,
          createdAt: new Date().toISOString(),
        },
      }, { status: 201 })
    }

    const supabase = await createClient()

    const paymentData: Record<string, any> = {
      affiliateId,
      amount,
      paymentMethod: method,
      status: "INITIATED",
    }

    if (user.workspace_id) {
      paymentData.workspaceId = user.workspace_id
    }

    const { data: payment, error } = await supabase
      .from("Payout")
      .insert(paymentData)
      .select()
      .single()

    if (error) {
      const correlationId = randomUUID()
      logger.error("[Admin Initiate Payment Error]", error, { correlationId })
      return NextResponse.json({ error: "Failed to initiate payment", correlationId }, { status: 500 })
    }

    return NextResponse.json({ success: true, payment }, { status: 201 })
  } catch (error) {
    const correlationId = randomUUID()
    logger.error("[Admin Initiate Payment Error]", error, { correlationId })
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 })
  }
}
