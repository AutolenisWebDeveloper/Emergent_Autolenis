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
    const body = await request.json()
    const result = await CoverageGapService.inviteForGap(taskId, body.dealerId, user.userId)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Coverage Gap Invite Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to create gap invite", correlationId }, { status: 500 })
  }
}
