import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { PreQualService } from "@/lib/services/prequal.service"

// POST /api/buyer/prequal/refresh - Refresh/re-run pre-qualification
export async function POST(request: Request) {
  try {
    const session = await requireAuth(["BUYER"])

    const requestContext = {
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    }

    const result = await PreQualService.refreshPreQual(session.userId, requestContext)

    return NextResponse.json({
      success: true,
      data: { preQualification: result },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    console.error("[PreQual Refresh] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to refresh pre-qualification" }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}
