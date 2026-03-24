import { NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { externalPreApprovalService } from "@/lib/services/external-preapproval.service"
import { externalPreApprovalReviewSchema } from "@/lib/validators/external-preapproval"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/external-preapprovals/[id]/review
 * Admin approves or rejects an external pre-approval submission.
 * On APPROVED: writes PreQualification with source=EXTERNAL_MANUAL.
 * RBAC: ADMIN / SUPER_ADMIN only.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      )
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing submission ID" },
        { status: 400 },
      )
    }

    const body = await request.json()
    const validationResult = externalPreApprovalReviewSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const result = await externalPreApprovalService.review(
      id,
      user.userId,
      validationResult.data,
    )

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error("[Admin External PreApproval Review API] POST error:", error)

    if (error.message === "Submission not found") {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 },
      )
    }

    if (error.message.startsWith("Cannot transition")) {
      return NextResponse.json(
        { success: false, error: "Invalid state transition" },
        { status: 409 },
      )
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    )
  }
}
