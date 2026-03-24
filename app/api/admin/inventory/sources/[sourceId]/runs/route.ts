import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as DealerSourceService from "@/lib/services/dealer-source.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { sourceId } = await params
    const page = Number.parseInt(request.nextUrl.searchParams.get("page") || "1")
    const runs = await DealerSourceService.getSourceRuns(sourceId, page)
    return NextResponse.json(runs)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Source Runs Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to list source runs", correlationId }, { status: 500 })
  }
}
