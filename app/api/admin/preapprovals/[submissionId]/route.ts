import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { externalPreApprovalService } from "@/lib/services/external-preapproval.service"

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
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: message },
      { status: message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500 },
    )
  }
}
