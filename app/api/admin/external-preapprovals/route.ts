import { NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { externalPreApprovalService } from "@/lib/services/external-preapproval.service"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/external-preapprovals
 * Admin queue: list pending external pre-approval submissions.
 * RBAC: ADMIN / SUPER_ADMIN only.
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const perPage = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("perPage") || "20", 10)),
    )

    const result = await externalPreApprovalService.listPendingReview({
      page,
      perPage,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error("[Admin External PreApproval API] GET error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    )
  }
}