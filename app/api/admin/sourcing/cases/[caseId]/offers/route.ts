import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAuth } from "@/lib/auth-server"
import { sourcingService } from "@/lib/services/sourcing.service"
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

    const caseData = await sourcingService.getCaseForAdmin(caseId)
    if (!caseData) {
      return NextResponse.json(
        { error: { code: 404, message: "Case not found" }, correlationId },
        { status: 404 },
      )
    }

    const result = await sourcingService.createOffer(
      caseId,
      { ...body, buyerId: caseData.buyerId },
      session.userId,
      "ADMIN_ENTERED",
    )

    // AdminAuditLog for compliance
    void prisma.adminAuditLog.create({
      data: {
        userId: session.userId,
        workspaceId: session.workspace_id ?? null,
        action: "ADMIN_OFFER_CREATED",
        details: {
          offerId: result.id,
          caseId,
          buyerId: caseData.buyerId,
          sourceType: "ADMIN_ENTERED",
          make: body.make,
          modelName: body.modelName,
        },
      },
    }).catch((err: unknown) => logger.error("[AUDIT] Offer create audit failed", { error: String(err) }))

    return NextResponse.json({ success: true, data: result, correlationId })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: { code: statusCode, message: (error as Error).message }, correlationId },
        { status: statusCode },
      )
    }
    logger.error("[ADMIN_SOURCING_CASE_OFFERS]", { error: String(error), correlationId })
    return NextResponse.json(
      { error: { code: 500, message: "Unable to create offer." }, correlationId },
      { status: 500 },
    )
  }
}
