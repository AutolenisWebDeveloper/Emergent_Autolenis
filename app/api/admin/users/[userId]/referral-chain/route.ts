import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, isAdminRole } from "@/lib/auth-server"
import { affiliateService } from "@/lib/services/affiliate.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await requireAuth()
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await params

    const chain = await affiliateService.getUserReferralChain(userId)

    return NextResponse.json(chain)
  } catch (error) {
    logger.error("[Admin User Referral Chain API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
