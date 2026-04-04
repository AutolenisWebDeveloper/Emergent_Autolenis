import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as InventorySearchService from "@/lib/services/inventory-search.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ vehicleType: string; vehicleId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { vehicleType, vehicleId } = await params
    if (vehicleType !== "market" && vehicleType !== "verified")
      return NextResponse.json({ error: "vehicleType must be 'market' or 'verified'" }, { status: 400 })

    const vehicle = vehicleType === "market"
      ? await InventorySearchService.getMarketVehicleById(vehicleId)
      : await InventorySearchService.getVerifiedVehicleById(vehicleId)

    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ priceHistory: vehicle.priceHistory ?? [] })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Price History Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to get price history", correlationId }, { status: 500 })
  }
}
