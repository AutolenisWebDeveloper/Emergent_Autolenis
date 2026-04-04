import { type NextRequest, NextResponse } from "next/server"
import { ContractShieldService } from "@/lib/services/contract-shield.service"
import { getSession, isAdminRole } from "@/lib/auth-server"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const scanId = searchParams.get("scanId") || undefined
    const adminId = searchParams.get("adminId") || undefined
    const buyerAcknowledged = searchParams.get("buyerAcknowledged")
      ? searchParams.get("buyerAcknowledged") === "true"
      : undefined
    const startDate = searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined
    const endDate = searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined

    const overrides = await ContractShieldService.getOverridesLedger({
      scanId,
      adminId,
      buyerAcknowledged,
      startDate,
      endDate,
    })

    return NextResponse.json({
      success: true,
      data: overrides,
    })
  } catch (error) {
    logger.error("[Contract Shield Overrides] Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch overrides" },
      { status: 500 },
    )
  }
}
