import { type NextRequest, NextResponse } from "next/server"
import { ContractShieldService } from "@/lib/services/contract-shield.service"
import { getSession, isAdminRole } from "@/lib/auth-server"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession()

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rules = await ContractShieldService.getActiveRules()

    return NextResponse.json({
      success: true,
      data: rules,
    })
  } catch (error) {
    logger.error("[Admin Contract Shield Rules]", error)
    return NextResponse.json(
      { error: "Failed to fetch rules" },
      { status: 500 },
    )
  }
}
