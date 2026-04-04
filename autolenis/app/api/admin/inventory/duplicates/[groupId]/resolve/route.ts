import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as InventoryDedupeService from "@/lib/services/inventory-dedupe.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { groupId } = await params
    const body = await request.json()
    const result = await InventoryDedupeService.resolveDuplicateGroup(groupId, body.winnerVehicleId, user.userId)
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Resolve Duplicate Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to resolve duplicate group", correlationId }, { status: 500 })
  }
}
