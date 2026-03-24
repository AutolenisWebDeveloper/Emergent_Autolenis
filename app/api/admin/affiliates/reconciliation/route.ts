import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAuth, isAdminRole } from "@/lib/auth-server"
import { affiliateService } from "@/lib/services/affiliate.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

// GET - View reconciliation logs
export async function GET(_request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: logs, error: logsError } = await supabase
      .from("commission_reconciliation_logs")
      .select("*")
      .order("run_at", { ascending: false })
      .limit(50)

    if (logsError) {
      logger.error("[Admin Reconciliation Logs API] Error:", logsError)
      return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
    }

    return NextResponse.json({ logs: logs || [] })
  } catch (error) {
    logger.error("[Admin Reconciliation Logs API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Trigger manual reconciliation
export async function POST(_request: NextRequest) {
  try {
    const session = await requireAuth()
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const results = await affiliateService.runReconciliation()

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    logger.error("[Admin Manual Reconciliation API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
