import { type NextRequest, NextResponse } from "next/server"
import { withAuth, ADMIN_ROLES } from "@/lib/authz/guard"
import { dealerOnboardingService } from "@/lib/services/dealer-onboarding"
import { z } from "zod"

/**
 * GET /api/admin/dealer-onboarding/[applicationId]
 *
 * Get a single dealer application detail for admin review.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const ctx = await withAuth(req, {
    roles: ADMIN_ROLES,
    auditAction: "VIEW_DEALER_APPLICATION",
  })
  if (ctx instanceof NextResponse) return ctx

  try {
    const { applicationId } = await params
    const application = await dealerOnboardingService.getApplication(applicationId)

    if (!application) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Application not found" }, correlationId: ctx.correlationId },
        { status: 404 },
      )
    }

    return NextResponse.json({ application })
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to get application",
        },
        correlationId: ctx.correlationId,
      },
      { status: 500 },
    )
  }
}

// ---------------------------------------------------------------------------
// Admin actions on a dealer application
// ---------------------------------------------------------------------------

const actionSchema = z.object({
  action: z.enum([
    "submit_for_review",
    "request_more_info",
    "send_agreement",
    "approve",
    "reject",
    "activate",
    "suspend",
  ]),
  notes: z.string().optional(),
  reason: z.string().optional(),
})

/**
 * POST /api/admin/dealer-onboarding/[applicationId]
 *
 * Perform admin actions: approve, reject, request info, send agreement, activate, suspend.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const ctx = await withAuth(req, {
    roles: ADMIN_ROLES,
    auditAction: "DEALER_ONBOARDING_ACTION",
  })
  if (ctx instanceof NextResponse) return ctx

  try {
    const { applicationId } = await params
    const body = await req.json()
    const parsed = actionSchema.safeParse(body)

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

    const { action, notes, reason } = parsed.data
    let result

    switch (action) {
      case "request_more_info":
        result = await dealerOnboardingService.requestMoreInfo(
          applicationId,
          notes || "",
          ctx.userId,
        )
        break

      case "send_agreement":
        result = await dealerOnboardingService.sendDealerAgreement(
          applicationId,
          ctx.userId,
        )
        break

      case "approve":
        result = await dealerOnboardingService.approveDealerApplication(
          applicationId,
          ctx.userId,
        )
        break

      case "reject":
        if (!reason) {
          return NextResponse.json(
            {
              error: { code: "VALIDATION_ERROR", message: "Reason is required for rejection" },
              correlationId: ctx.correlationId,
            },
            { status: 400 },
          )
        }
        result = await dealerOnboardingService.rejectDealerApplication(
          applicationId,
          ctx.userId,
          reason,
        )
        break

      case "activate":
        result = await dealerOnboardingService.activateDealer(
          applicationId,
          ctx.userId,
        )
        break

      case "suspend": {
        const application = await dealerOnboardingService.getApplication(applicationId)
        if (!application?.dealerId) {
          return NextResponse.json(
            {
              error: { code: "NOT_FOUND", message: "No linked dealer to suspend" },
              correlationId: ctx.correlationId,
            },
            { status: 400 },
          )
        }
        result = await dealerOnboardingService.suspendDealer(
          application.dealerId,
          ctx.userId,
          reason || "Suspended by admin",
        )
        break
      }

      default:
        return NextResponse.json(
          {
            error: { code: "INVALID_ACTION", message: `Unknown action: ${action}` },
            correlationId: ctx.correlationId,
          },
          { status: 400 },
        )
    }

    return NextResponse.json({ success: true, result })
  } catch (err) {
    const statusCode = err instanceof Error && err.message.includes("Invalid status transition")
      ? 409
      : 500
    return NextResponse.json(
      {
        error: {
          code: statusCode === 409 ? "INVALID_TRANSITION" : "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Action failed",
        },
        correlationId: ctx.correlationId,
      },
      { status: statusCode },
    )
  }
}
