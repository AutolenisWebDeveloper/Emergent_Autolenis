import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { externalPreApprovalService } from "@/lib/services/external-preapproval.service"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/preapprovals
 * Admin queue: lists external pre-approval submissions.
 * Query param ?status=SUBMITTED,IN_REVIEW (defaults to pending items)
 */
export async function GET(request: Request) {
  try {
    await requireAuth(["ADMIN"])

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get("status")

    const statuses = statusParam
      ? (statusParam.split(",") as any[])
      : ["SUBMITTED", "IN_REVIEW"]

    const submissions = await externalPreApprovalService.listByStatus(statuses)

    return NextResponse.json({
      success: true,
      data: { submissions },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: message },
      { status: message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500 },
    )
  }
}
