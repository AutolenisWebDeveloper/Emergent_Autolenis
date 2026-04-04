import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as DealerSourceService from "@/lib/services/dealer-source.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { sourceId } = await params
    const source = await DealerSourceService.getSourceById(sourceId)
    if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(source)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Source Get Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to get source", correlationId }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { sourceId } = await params
    const body = await request.json()
    const result = await DealerSourceService.updateSource(sourceId, body)
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Source Update Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to update source", correlationId }, { status: 500 })
  }
}
