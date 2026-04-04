import { type NextRequest, NextResponse } from "next/server"
import { withAuth, ADMIN_ROLES } from "@/lib/authz/guard"
import { dealerAgreementService } from "@/lib/services/dealer-agreement.service"
import { z } from "zod"

const voidSchema = z.object({
  reason: z.string().optional(),
})

/**
 * POST /api/admin/dealers/[dealerId]/agreement/void
 *
 * Void an active agreement envelope and block dealer until corrected.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ dealerId: string }> },
) {
  const ctx = await withAuth(req, {
    roles: ADMIN_ROLES,
    auditAction: "DEALER_AGREEMENT_VOID",
  })
  if (ctx instanceof NextResponse) return ctx

  try {
    const { dealerId } = await params
    const body = await req.json()
    const parsed = voidSchema.safeParse(body)

    const result = await dealerAgreementService.voidAgreement(
      dealerId,
      ctx.userId,
      parsed.success ? parsed.data.reason : undefined,
    )

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
          message: err instanceof Error ? err.message : "Void failed",
        },
        correlationId: ctx.correlationId,
      },
      { status: 500 },
    )
  }
}
