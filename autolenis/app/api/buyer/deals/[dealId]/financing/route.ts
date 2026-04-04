import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { DealService } from "@/lib/services/deal.service"
import { uuidSchema, financingChoiceSchema } from "@/lib/validators/api"

export async function POST(request: Request, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const session = await requireAuth(["BUYER"])
    const { dealId } = await params

    // Validate dealId path param
    const dealIdResult = uuidSchema.safeParse(dealId)
    if (!dealIdResult.success) {
      return NextResponse.json(
        { success: false, error: "Invalid deal ID format", code: "VALIDATION_ERROR" },
        { status: 400 },
      )
    }

    const body = await request.json()

    // Validate request body
    const parsed = financingChoiceSchema.safeParse(body)
    if (!parsed.success) {
      const fields: Record<string, string> = {}
      parsed.error.errors.forEach((err) => {
        fields[err.path.join(".")] = err.message
      })
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "Validation failed",
          code: "VALIDATION_ERROR",
          fields,
        },
        { status: 400 },
      )
    }

    const { payment_type, primary_financing_offer_id, external_preapproval } = parsed.data

    const result = await DealService.updateFinancingChoice(session.userId, dealId, {
      paymentType: payment_type,
      primaryFinancingOfferId: primary_financing_offer_id,
      externalPreApproval: external_preapproval
        ? {
            lenderName: external_preapproval.lender_name,
            approvedAmountCents: external_preapproval.approved_amount_cents,
            apr: external_preapproval.apr,
            termMonths: external_preapproval.term_months,
            documentUrl: external_preapproval.document_url ?? "",
          }
        : undefined,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error updating financing:", error)
    return NextResponse.json({ success: false, error: "Failed to update financing" }, { status: 500 })
  }
}
