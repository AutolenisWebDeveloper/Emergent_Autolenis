import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAuth } from "@/lib/auth-server"
import { sourcingService, BuyerProfileMissingError } from "@/lib/services/sourcing.service"
import { logger } from "@/lib/logger"

export async function POST(
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

    const data = await sourcingService.submitCase(caseId, buyerProfileId, session.userId)
    return NextResponse.json({ success: true, data, correlationId })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: { code: statusCode, message: statusCode === 401 ? "Unauthorized" : "Forbidden" }, correlationId },
        { status: statusCode },
      )
    }
    const message = error instanceof Error ? error.message : String(error)
    logger.error("[BUYER_REQUEST_SUBMIT]", { error: message, correlationId })
    return NextResponse.json(
      { error: { code: 500, message: message.includes("Invalid status transition") ? message : "Unable to submit request. Please try again." }, correlationId },
      { status: message.includes("Invalid status transition") ? 422 : 500 },
    )
  }
}
