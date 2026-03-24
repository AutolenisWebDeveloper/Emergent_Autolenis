import { NextResponse, type NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { requireDatabase } from "@/lib/require-database"
import { isTestWorkspace } from "@/lib/app-mode"
import { messagingService } from "@/lib/services/messaging.service"

export const dynamic = "force-dynamic"

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

/**
 * GET /api/admin/messages-monitoring — admin view of messaging threads + stats
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(["ADMIN", "SUPER_ADMIN"])

    if (isTestWorkspace(user)) {
      return NextResponse.json({
        success: true,
        data: { threads: [], stats: { totalThreads: 0, activeThreads: 0, flaggedMessages: 0, approvalDistribution: {} }, total: 0, page: 1, perPage: 25, totalPages: 0 },
      })
    }
    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get("page") || "1", 10)
    const perPage = parseInt(url.searchParams.get("limit") || "25", 10)
    const approvalType = url.searchParams.get("approvalType") || undefined
    const flaggedParam = url.searchParams.get("flagged")
    const identityReleasedParam = url.searchParams.get("identityReleased")

    const flagged = flaggedParam === "true" ? true : flaggedParam === "false" ? false : undefined
    const identityReleased = identityReleasedParam === "true" ? true : identityReleasedParam === "false" ? false : undefined

    const [result, stats] = await Promise.all([
      messagingService.listThreadsForAdmin({
        page,
        perPage,
        approvalType,
        flagged,
        identityReleased,
      }),
      messagingService.getAdminStats(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        stats,
      },
    })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ error: statusCode === 403 ? "Forbidden" : "Unauthorized" }, { status: statusCode })
    }
    return jsonError("Failed to load monitoring data", 500)
  }
}
