import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as DealerDiscoveryService from "@/lib/services/dealer-discovery.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ prospectId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { prospectId } = await params
    const prospect = await DealerDiscoveryService.getProspectById(prospectId)
    if (!prospect)
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(prospect)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Prospect Get Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to get prospect", correlationId }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ prospectId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { prospectId } = await params
    const body = await request.json()
    const result = await DealerDiscoveryService.updateProspectStatus(prospectId, body.status, user.userId)
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Prospect Update Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to update prospect", correlationId }, { status: 500 })
  }
}
