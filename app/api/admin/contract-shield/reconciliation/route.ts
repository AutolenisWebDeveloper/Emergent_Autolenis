import { type NextRequest, NextResponse } from "next/server"
import { ContractShieldService } from "@/lib/services/contract-shield.service"
import { getSession, isAdminRole } from "@/lib/auth-server"

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { jobType } = body

    if (!jobType || !["SYNC_STATUSES", "CHECK_STALE_SCANS", "NOTIFY_PENDING"].includes(jobType)) {
      return NextResponse.json({ error: "Invalid job type" }, { status: 400 })
    }

    const job = await ContractShieldService.runReconciliationJob(jobType)

    return NextResponse.json({
      success: true,
      data: job,
    })
  } catch (error) {
    console.error("[Contract Shield Reconciliation] Error:", error)
    return NextResponse.json(
      { error: "Failed to run reconciliation job" },
      { status: 500 },
    )
  }
}
