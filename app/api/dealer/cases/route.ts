import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getSessionUser } from "@/lib/auth-server"
import { dealerService } from "@/lib/services/dealer.service"
import { dealerPortalService } from "@/lib/services/inventory-sourcing/dealer-portal.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

/**
 * GET /api/dealer/cases
 *
 * Returns all sourcing-case invites for the authenticated dealer,
 * with embedded case details. This is the dealer's "inbox".
 */
export async function GET(_req: NextRequest) {
  const correlationId = randomUUID()
  try {
    const user = await getSessionUser()

    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json(
        { error: { code: 401, message: "Unauthorized" }, correlationId },
        { status: 401 },
      )
    }

    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer) {
      return NextResponse.json(
        { error: { code: 404, message: "Dealer not found" }, correlationId },
        { status: 404 },
      )
    }

    const items = await dealerPortalService.getInvitesForDealer(dealer.id)

    return NextResponse.json({ success: true, data: items, correlationId })
  } catch (error) {
    logger.error("[DEALER_CASES]", { error: String(error), correlationId })
    return NextResponse.json(
      { error: { code: 500, message: "Failed to load dealer cases" }, correlationId },
      { status: 500 },
    )
  }
}
