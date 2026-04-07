import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAuth } from "@/lib/auth-server"
import { sourcingService, SourcingService } from "@/lib/services/sourcing.service"
import { emailService } from "@/lib/services/email.service"
import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string; offerId: string }> },
) {
  const correlationId = randomUUID()
  try {
    const session = await requireAuth(["ADMIN", "SUPER_ADMIN"])

    const { offerId } = await params

    const result = await sourcingService.presentOffer(offerId, session.userId)

    // AdminAuditLog for compliance
    void prisma.adminAuditLog.create({
      data: {
        userId: session.userId,
        workspaceId: session.workspace_id ?? null,
        action: "OFFER_PRESENTED_TO_BUYER",
        details: { offerId, caseId: result.caseId, status: result.status },
      },
    }).catch((err: unknown) => logger.error("[AUDIT] Offer present audit failed", { error: String(err) }))

    // Fire-and-forget buyer notification email (never block the response)
    void (async () => {
      try {
        const contact = await sourcingService.getOfferBuyerContact(offerId)
        if (contact) {
          const vehicleSummary = SourcingService.buildVehicleSummary(result)
          await emailService.sendSourcedOfferPresentedEmail(
            contact.email,
            contact.buyerName,
            vehicleSummary,
            result.caseId,
            contact.userId,
          )
        }
      } catch (err) {
        logger.error("[ADMIN_SOURCING_OFFER_PRESENT] Buyer notification email failed", { error: String(err), correlationId })
      }
    })()

    return NextResponse.json({ success: true, data: result, correlationId })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: { code: statusCode, message: (error as Error).message }, correlationId },
        { status: statusCode },
      )
    }
    logger.error("[ADMIN_SOURCING_OFFER_PRESENT]", { error: String(error), correlationId })
    return NextResponse.json(
      { error: { code: 500, message: "Unable to present offer." }, correlationId },
      { status: 500 },
    )
  }
}
