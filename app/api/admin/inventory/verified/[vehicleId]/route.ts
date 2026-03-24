import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as InventorySearchService from "@/lib/services/inventory-search.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { vehicleId } = await params
    const vehicle = await InventorySearchService.getVerifiedVehicleById(vehicleId)
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(vehicle)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Verified Vehicle Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to get verified vehicle", correlationId }, { status: 500 })
  }
}
