import { type NextRequest, NextResponse } from "next/server"
import { withAuth, ADMIN_ROLES } from "@/lib/authz/guard"
import { dealerAgreementService } from "@/lib/services/dealer-agreement.service"

/**
 * POST /api/admin/dealers/[dealerId]/agreement/resend
 *
 * Void old unsigned envelope if needed, then send a new one.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ dealerId: string }> },
) {
  const ctx = await withAuth(req, {
    roles: ADMIN_ROLES,
    auditAction: "DEALER_AGREEMENT_RESEND",
  })
  if (ctx instanceof NextResponse) return ctx

  try {
    const { dealerId } = await params
    const result = await dealerAgreementService.resendAgreement(dealerId, ctx.userId)

    return NextResponse.json({
      success: true,
      agreementId: result.id,
      status: result.status,
    })
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Resend failed",
        },
        correlationId: ctx.correlationId,
      },
      { status: 500 },
    )
  }
}
