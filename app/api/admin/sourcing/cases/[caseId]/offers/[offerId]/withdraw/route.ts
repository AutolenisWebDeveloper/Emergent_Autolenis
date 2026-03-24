import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAuth } from "@/lib/auth-server"
import { sourcingService } from "@/lib/services/sourcing.service"
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

    const result = await sourcingService.withdrawOffer(offerId, session.userId)

    return NextResponse.json({ success: true, data: result, correlationId })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: { code: statusCode, message: (error as Error).message }, correlationId },
        { status: statusCode },
      )
    }
    logger.error("[ADMIN_SOURCING_OFFER_WITHDRAW]", { error: String(error), correlationId })
    return NextResponse.json(
      { error: { code: 500, message: "Unable to withdraw offer." }, correlationId },
      { status: 500 },
    )
  }
}
