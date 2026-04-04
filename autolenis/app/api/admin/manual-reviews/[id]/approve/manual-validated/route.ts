import { type NextRequest, NextResponse } from "next/server"
import { getSession, isCmaApprover } from "@/lib/auth-server"
import { approveManualValidated, getManualReviewById } from "@/lib/services/contract-shield"
import { rateLimit, rateLimits } from "@/lib/middleware/rate-limit"
import { logCmaEvent } from "@/lib/services/contract-shield/helpers"

export async function POST(
  request: NextRequest,
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

    // Rate limit CMA approval actions per admin
    const rateLimitResult = await rateLimit(request, {
      ...rateLimits.cmaApproval,
      keyGenerator: () => `cma-approval:${session.userId}`,
    })
    if (rateLimitResult) {
      // Fetch review to get dealId for audit trail
      const review = await getManualReviewById(id)
      await logCmaEvent(review?.dealId || "", "MANUAL_APPROVAL_RATE_LIMIT_EXCEEDED", {
        adminId: session.userId,
        adminRole: session.role,
        manualReviewId: id,
      }, {
        userId: session.userId,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
        userAgent: request.headers.get("user-agent") || undefined,
      })
      return rateLimitResult
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const userAgent = request.headers.get("user-agent") || undefined

    const result = await approveManualValidated(id, {
      adminId: session.userId,
      adminRole: session.role,
      ipAddress: ip,
      userAgent,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve"
    return NextResponse.json(
      { error: { code: "CMA_ERROR", message } },
      { status: 400 },
    )
  }
}
