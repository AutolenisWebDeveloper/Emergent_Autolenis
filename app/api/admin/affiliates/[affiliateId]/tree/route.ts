import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, isAdminRole } from "@/lib/auth-server"
import { affiliateService } from "@/lib/services/affiliate.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ affiliateId: string }> }) {
  try {
    const session = await requireAuth()
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { affiliateId } = await params

    const tree = await affiliateService.getAffiliateTree(affiliateId)

    return NextResponse.json(tree)
  } catch (error) {
    logger.error("[Admin Affiliate Tree API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
