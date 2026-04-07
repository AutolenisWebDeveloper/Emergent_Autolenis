import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAuth } from "@/lib/auth-server"
import { sourcingService } from "@/lib/services/sourcing.service"
import { emailService } from "@/lib/services/email.service"
import { prisma } from "@/lib/db"
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

    if (!body.offerId) {
      return NextResponse.json(
        { error: { code: 400, message: "offerId is required to invite a dealer" }, correlationId },
        { status: 400 },
      )
    }
    if (!body.dealerEmail || !body.dealerName) {
      return NextResponse.json(
        { error: { code: 400, message: "dealerEmail and dealerName are required" }, correlationId },
        { status: 400 },
      )
    }

    const result = await sourcingService.createDealerInvite(
      caseId,
      body.offerId,
      body.dealerEmail,
      body.dealerName,
      session.userId,
    )

    // AdminAuditLog for compliance
    void prisma.adminAuditLog.create({
      data: {
        userId: session.userId,
        workspaceId: session.workspace_id ?? null,
        action: "SOURCING_DEALER_INVITE_SENT",
        details: {
          inviteId: result.invite.id,
          caseId,
          offerId: body.offerId,
          dealerEmail: body.dealerEmail,
          dealerName: body.dealerName,
        },
      },
    }).catch((err: unknown) => logger.error("[AUDIT] Dealer invite audit failed", { error: String(err) }))

    // Fire-and-forget dealer invite email (never block the response)
    const vehicleSummary = body.vehicleSummary || "Vehicle"
    const marketZip = body.marketZip || ""
    emailService
      .sendDealerInviteEmail(
        body.dealerEmail,
        body.dealerName,
        result.rawToken,
        vehicleSummary,
        marketZip,
      )
      .catch((err) => logger.error("[ADMIN_SOURCING_INVITE_DEALER] Invite email failed", { error: String(err), correlationId }))

    return NextResponse.json({ success: true, data: { inviteId: result.invite.id }, correlationId })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: { code: statusCode, message: (error as Error).message }, correlationId },
        { status: statusCode },
      )
    }
    logger.error("[ADMIN_SOURCING_INVITE_DEALER]", { error: String(error), correlationId })
    return NextResponse.json(
      { error: { code: 500, message: "Unable to send dealer invite." }, correlationId },
      { status: 500 },
    )
  }
}
