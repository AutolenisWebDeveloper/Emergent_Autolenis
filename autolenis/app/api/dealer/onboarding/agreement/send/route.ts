import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerAgreementService } from "@/lib/services/dealer-agreement.service"
import { dealerService } from "@/lib/services/dealer.service"
import { z } from "zod"
import { randomUUID } from "crypto"

const sendSchema = z.object({
  dealerId: z.string().min(1, "dealerId is required"),
})

/**
 * POST /api/dealer/onboarding/agreement/send
 *
 * Create or reuse agreement record, send DocuSign envelope, return metadata.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      )
    }

    const body = await req.json()
    const parsed = sendSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors[0]?.message || "Invalid input",
          },
          correlationId: randomUUID(),
        },
        { status: 400 },
      )
    }

    // Ownership validation: ensure the user owns this dealer
    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer || dealer.id !== parsed.data.dealerId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have access to this dealer" }, correlationId: randomUUID() },
        { status: 403 },
      )
    }

    const agreement = await dealerAgreementService.sendAgreement(
      parsed.data.dealerId,
      user.userId,
    )

    return NextResponse.json({
      success: true,
      agreementId: agreement.id,
      envelopeId: agreement.docusignEnvelopeId,
      status: agreement.status,
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to send agreement",
        },
        correlationId: randomUUID(),
      },
      { status: 500 },
    )
  }
}
