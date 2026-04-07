import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { externalPreApprovalService } from "@/lib/services/external-preapproval.service"
import { handleRouteError } from "@/lib/utils/route-error"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/preapprovals/:submissionId
 * Admin: get details of a single submission.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  try {
    await requireAuth(["ADMIN"])
    const { submissionId } = await params

    const submission = await externalPreApprovalService.getById(submissionId)

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: { submission } })
  } catch (error: unknown) {
    return handleRouteError(error, "Unauthorized")
  }
}
