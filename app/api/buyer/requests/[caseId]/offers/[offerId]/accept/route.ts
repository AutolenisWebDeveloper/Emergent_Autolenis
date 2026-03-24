import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { sourcingService, BuyerProfileMissingError } from "@/lib/services/sourcing.service"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ caseId: string; offerId: string }> }
) {
  try {
    const session = await requireAuth(["BUYER"])
    const { caseId, offerId } = await params

    // Resolve canonical BuyerProfile.id from session User.id
    let buyerProfileId: string
    try {
      buyerProfileId = await sourcingService.resolveBuyerProfileId(session.userId)
    } catch (profileError) {
      if (profileError instanceof BuyerProfileMissingError) {
        return NextResponse.json(
          { error: { code: "BUYER_PROFILE_MISSING", message: profileError.message } },
          { status: 404 },
        )
      }
      throw profileError
    }

    const data = await sourcingService.acceptOffer(caseId, offerId, buyerProfileId, session.userId)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: statusCode === 401 ? "Unauthorized" : "Forbidden" },
        { status: statusCode },
      )
    }
    console.error("[BUYER_OFFER_ACCEPT]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
