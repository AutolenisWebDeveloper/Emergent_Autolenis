import { type NextRequest, NextResponse } from "next/server"
import { getSession, isCmaApprover } from "@/lib/auth-server"
import { getManualReviewById } from "@/lib/services/contract-shield"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const session = await getSession()

    if (!session || !isCmaApprover(session.role)) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "CMA approver role required" } },
        { status: 401 },
      )
    }

    const review = await getManualReviewById(id)
    if (!review) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Manual review not found" } },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: review })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get manual review"
    return NextResponse.json(
      { error: { code: "CMA_ERROR", message } },
      { status: 500 },
    )
  }
}
