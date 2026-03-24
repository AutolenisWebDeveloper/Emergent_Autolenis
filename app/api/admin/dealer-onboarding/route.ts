import { type NextRequest, NextResponse } from "next/server"
import { withAuth, ADMIN_ROLES } from "@/lib/authz/guard"
import { dealerOnboardingService } from "@/lib/services/dealer-onboarding"

/**
 * GET /api/admin/dealer-onboarding
 *
 * Admin queue: list dealer applications with optional status filter.
 */
export async function GET(req: NextRequest) {
  const ctx = await withAuth(req, {
    roles: ADMIN_ROLES,
    auditAction: "LIST_DEALER_APPLICATIONS",
  })
  if (ctx instanceof NextResponse) return ctx

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || undefined
    const page = parseInt(searchParams.get("page") || "1", 10)
    const perPage = parseInt(searchParams.get("perPage") || "25", 10)

    const result = await dealerOnboardingService.listApplications({
      status,
      page,
      perPage,
    })

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to list applications",
        },
        correlationId: ctx.correlationId,
      },
      { status: 500 },
    )
  }
}
