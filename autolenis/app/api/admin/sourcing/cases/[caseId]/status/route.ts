import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAuth } from "@/lib/auth-server"
import { sourcingService } from "@/lib/services/sourcing.service"
import { emailService } from "@/lib/services/email.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const correlationId = randomUUID()
  try {
    const session = await requireAuth(["ADMIN", "SUPER_ADMIN"])

    const { caseId } = await params
    const body = await request.json()

    const result = await sourcingService.updateCaseStatus(
      caseId,
      body.status,
      body.adminSubStatus,
      session.userId,
      "ADMIN",
      body.notes,
    )

    // Fire-and-forget: notify the buyer about the status change via email.
    // Uses the canonical sourcing service to resolve buyer contact from the
    // case's BuyerProfile (buyerId is BuyerProfile.id, not User.id).
    void (async () => {
      try {
        const contact = await sourcingService.getCaseBuyerContact(caseId)
        if (contact) {
          await emailService.sendVehicleRequestStatusUpdate(
            contact.email,
            contact.buyerName,
            body.status,
            contact.userId,
          )
        } else {
          logger.warn("[ADMIN_STATUS_UPDATE] Buyer contact not found for case", { caseId, correlationId })
        }
      } catch (notifyErr) {
        logger.error("[ADMIN_STATUS_UPDATE] Buyer notification email failed", {
          error: String(notifyErr),
          correlationId,
        })
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
    const message = error instanceof Error ? error.message : String(error)
    logger.error("[ADMIN_SOURCING_CASE_STATUS]", { error: message, correlationId })
    return NextResponse.json(
      { error: { code: 500, message: message.includes("Invalid status transition") ? message : "Unable to update status. Please try again." }, correlationId },
      { status: message.includes("Invalid status transition") ? 422 : 500 },
    )
  }
}
