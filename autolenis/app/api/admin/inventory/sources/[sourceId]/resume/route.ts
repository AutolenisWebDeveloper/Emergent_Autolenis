import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as DealerSourceService from "@/lib/services/dealer-source.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { sourceId } = await params
    const result = await DealerSourceService.resumeSource(sourceId)
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Source Resume Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to resume source", correlationId }, { status: 500 })
  }
}
