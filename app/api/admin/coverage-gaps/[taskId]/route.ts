import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as CoverageGapService from "@/lib/services/coverage-gap.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { taskId } = await params
    const task = await CoverageGapService.getGapTaskById(taskId)
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(task)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Coverage Gap Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to get gap task", correlationId }, { status: 500 })
  }
}
