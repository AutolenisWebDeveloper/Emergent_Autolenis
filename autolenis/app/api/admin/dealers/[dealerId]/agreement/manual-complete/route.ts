import { type NextRequest, NextResponse } from "next/server"
import { withAuth, ADMIN_ROLES } from "@/lib/authz/guard"
import { dealerAgreementService } from "@/lib/services/dealer-agreement.service"
import { z } from "zod"

const manualCompleteSchema = z.object({
  note: z.string().min(1, "Admin note is required for manual completion"),
  signedDocumentPath: z.string().optional(),
})

/**
 * POST /api/admin/dealers/[dealerId]/agreement/manual-complete
 *
 * Emergency override: manually mark agreement as complete.
 * Requires admin note and creates immutable audit trail.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ dealerId: string }> },
) {
  const ctx = await withAuth(req, {
    roles: ADMIN_ROLES,
    auditAction: "DEALER_AGREEMENT_MANUAL_COMPLETE",
  })
  if (ctx instanceof NextResponse) return ctx

  try {
    const { dealerId } = await params
    const body = await req.json()
    const parsed = manualCompleteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors[0]?.message || "Invalid input",
          },
          correlationId: ctx.correlationId,
        },
        { status: 400 },
      )
    }

    const result = await dealerAgreementService.manualComplete(
      dealerId,
      ctx.userId,
      parsed.data.note,
      parsed.data.signedDocumentPath,
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
          message: err instanceof Error ? err.message : "Manual complete failed",
        },
        correlationId: ctx.correlationId,
      },
      { status: 500 },
    )
  }
}
