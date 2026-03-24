import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAuth } from "@/lib/auth-server"
import { sourcingService, BuyerProfileMissingError } from "@/lib/services/sourcing.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const correlationId = randomUUID()
  try {
    const session = await requireAuth(["BUYER"])
    const { caseId } = await params

    // Resolve canonical BuyerProfile.id from session User.id
    let buyerProfileId: string
    try {
      buyerProfileId = await sourcingService.resolveBuyerProfileId(session.userId)
    } catch (profileError) {
      if (profileError instanceof BuyerProfileMissingError) {
        return NextResponse.json(
          { error: { code: "BUYER_PROFILE_MISSING", message: profileError.message }, correlationId },
          { status: 404 },
        )
      }
      throw profileError
    }

    const data = await sourcingService.getCaseForBuyer(caseId, buyerProfileId)
    if (!data) {
      return NextResponse.json(
        { error: { code: 404, message: "Case not found" }, correlationId },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: { code: statusCode, message: statusCode === 401 ? "Unauthorized" : "Forbidden" }, correlationId },
        { status: statusCode },
      )
    }
    logger.error("[BUYER_REQUEST_GET]", { error: String(error), correlationId })
    return NextResponse.json(
      { error: { code: 500, message: "Unable to load request details. Please try again." }, correlationId },
      { status: 500 },
    )
  }
}
