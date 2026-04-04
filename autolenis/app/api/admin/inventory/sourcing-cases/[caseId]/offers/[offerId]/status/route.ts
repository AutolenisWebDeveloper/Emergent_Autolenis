import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAuth } from "@/lib/auth-server"
import { updateOfferStatus, selectOffer } from "@/lib/services/inventory-sourcing/case.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string; offerId: string }> },
) {
  const correlationId = randomUUID()
  try {
    await requireAuth(["ADMIN", "SUPER_ADMIN"])

    const { caseId, offerId } = await params
    const body = await request.json()

    if (!body.status) {
      return NextResponse.json(
        { error: { code: 400, message: "status is required." }, correlationId },
        { status: 400 },
      )
    }

    const data = body.status === "SELECTED"
      ? await selectOffer(caseId, offerId)
      : await updateOfferStatus(offerId, body.status)

    return NextResponse.json({ success: true, data, correlationId })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: { code: statusCode, message: (error as Error).message }, correlationId },
        { status: statusCode },
      )
    }
    const message = error instanceof Error ? error.message : String(error)
    logger.error("[ADMIN_CASE_OFFER_STATUS]", { error: message, correlationId })
    return NextResponse.json(
      {
        error: {
          code: message.includes("Invalid status transition") ? 422 : 500,
          message: message.includes("Invalid status transition") ? message : "Unable to update offer status.",
        },
        correlationId,
      },
      { status: message.includes("Invalid status transition") ? 422 : 500 },
    )
  }
}
