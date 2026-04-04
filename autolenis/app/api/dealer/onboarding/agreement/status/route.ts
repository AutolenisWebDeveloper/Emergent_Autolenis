import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerAgreementService } from "@/lib/services/dealer-agreement.service"
import { dealerService } from "@/lib/services/dealer.service"
import { randomUUID } from "crypto"

/**
 * GET /api/dealer/onboarding/agreement/status
 *
 * Returns the latest agreement state for the current dealer.
 * Query param: dealerId
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      )
    }

    const { searchParams } = new URL(req.url)
    const dealerId = searchParams.get("dealerId")

    if (!dealerId) {
      return NextResponse.json(
        {
          error: { code: "VALIDATION_ERROR", message: "dealerId query param required" },
          correlationId: randomUUID(),
        },
        { status: 400 },
      )
    }

    // Ownership validation: ensure the user owns this dealer
    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer || dealer.id !== dealerId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have access to this dealer" }, correlationId: randomUUID() },
        { status: 403 },
      )
    }

    const agreement = await dealerAgreementService.getAgreementForDealer(dealerId)

    if (!agreement) {
      return NextResponse.json({
        agreement: null,
        status: "REQUIRED",
      })
    }

    return NextResponse.json({
      agreement: {
        id: agreement.id,
        status: agreement.status,
        version: agreement.version,
        agreementName: agreement.agreementName,
        envelopeId: agreement.docusignEnvelopeId,
        signerEmail: agreement.signerEmail,
        signerName: agreement.signerName,
        sentAt: agreement.sentAt,
        viewedAt: agreement.viewedAt,
        signedAt: agreement.signedAt,
        completedAt: agreement.completedAt,
      },
      status: agreement.status,
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to get status",
        },
        correlationId: randomUUID(),
      },
      { status: 500 },
    )
  }
}
