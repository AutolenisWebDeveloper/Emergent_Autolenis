import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as CoverageGapService from "@/lib/services/coverage-gap.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { taskId } = await params
    const body = await request.json().catch(() => ({}))
    const result = await CoverageGapService.resolveGapTask(taskId, user.userId, body.resolution)
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Coverage Gap Resolve Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to resolve gap task", correlationId }, { status: 500 })
  }
}
