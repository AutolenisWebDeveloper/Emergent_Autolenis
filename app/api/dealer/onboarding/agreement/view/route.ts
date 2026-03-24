import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerAgreementService } from "@/lib/services/dealer-agreement.service"
import { dealerService } from "@/lib/services/dealer.service"
import { z } from "zod"
import { randomUUID } from "crypto"

const viewSchema = z.object({
  agreementId: z.string().min(1, "agreementId is required"),
})

/**
 * POST /api/dealer/onboarding/agreement/view
 *
 * Generate an embedded signing URL (DocuSign recipient view).
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
    const parsed = viewSchema.safeParse(body)
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

    // Ownership validation: verify the agreement belongs to the user's dealer
    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have access to this agreement" }, correlationId: randomUUID() },
        { status: 403 },
      )
    }
    const agreement = await dealerAgreementService.getAgreementForDealer(dealer.id)
    if (!agreement || agreement.id !== parsed.data.agreementId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Agreement not found" }, correlationId: randomUUID() },
        { status: 404 },
      )
    }

    // Server-enforced return URL — client cannot redirect to arbitrary domain
    const returnUrl = process.env.DOCUSIGN_RETURN_URL
      || `${process.env.NEXT_PUBLIC_APP_URL || "https://www.autolenis.com"}/dealer/onboarding/agreement/success`

    const result = await dealerAgreementService.getSigningUrl(
      parsed.data.agreementId,
      returnUrl,
    )

    return NextResponse.json({
      success: true,
      url: result.url,
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to generate signing URL",
        },
        correlationId: randomUUID(),
      },
      { status: 500 },
    )
  }
}
