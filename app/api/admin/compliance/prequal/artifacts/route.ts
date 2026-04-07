import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prequalSessionService } from "@/lib/services/prequal-session.service"
import { handleRouteError } from "@/lib/utils/route-error"

// GET /api/admin/compliance/prequal/artifacts?userId=xxx&sessionId=xxx
// Export consent artifacts and provider evidence for compliance review
export async function GET(request: Request) {
  try {
    await requireAuth(["ADMIN"])

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")
    const userId = searchParams.get("userId")
    const fromDate = searchParams.get("fromDate")
    const toDate = searchParams.get("toDate")

    // If sessionId is provided, get artifacts for that specific session
    if (sessionId) {
      const artifacts = await prequalSessionService.getSessionArtifacts(sessionId)
      return NextResponse.json({ success: true, data: artifacts })
    }

    // Otherwise, export artifacts with filters
    const data = await prequalSessionService.exportConsentArtifacts({
      userId: userId || undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    })

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    return handleRouteError(error, "Internal server error")
  }
}
