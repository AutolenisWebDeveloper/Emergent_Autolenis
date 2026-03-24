import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as DealerSourceService from "@/lib/services/dealer-source.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceId: string; runId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { runId } = await params
    const run = await DealerSourceService.getSourceRunById(runId)
    if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(run)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Source Run Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to get run", correlationId }, { status: 500 })
  }
}
