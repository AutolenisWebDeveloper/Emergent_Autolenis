import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as InventoryVerificationService from "@/lib/services/inventory-verification.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ dealerId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { dealerId } = await params
    const result = await InventoryVerificationService.promoteDealerInventory(dealerId, user.userId)
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Promote Dealer Inventory Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to promote dealer inventory", correlationId }, { status: 500 })
  }
}
