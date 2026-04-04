import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { externalPreApprovalService } from "@/lib/services/external-preapproval.service"
import { externalPreApprovalReviewSchema } from "@/lib/validators/external-preapproval"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/preapprovals/:submissionId/review
 * Admin: approve (VERIFY) or reject a submission.
 * On VERIFY, a PreQualification record is created/updated with source=EXTERNAL_MANUAL.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  try {
    const session = await requireAuth(["ADMIN"])
    const { submissionId } = await params
    const body = await request.json()

    // Validate review input
    const parsed = externalPreApprovalReviewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues.map((i) => i.message).join("; ") },
        { status: 400 },
      )
    }

    const result = await externalPreApprovalService.review(
      submissionId,
      session.userId,
      parsed.data,
    )

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[Admin PreApproval Review] Error:", message)
    return NextResponse.json(
      { success: false, error: message },
      {
        status:
          message === "Unauthorized"
            ? 401
            : message === "Forbidden"
              ? 403
              : message === "Submission not found"
                ? 404
                : 400,
      },
    )
  }
}
