import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as InventorySearchService from "@/lib/services/inventory-search.service"
import { prisma } from "@/lib/prisma"
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
    const vehicle = await InventorySearchService.getMarketVehicleById(vehicleId)
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(vehicle)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Market Vehicle Get Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to get market vehicle", correlationId }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { vehicleId } = await params
    const body = await request.json()
    const result = await prisma.inventoryMarketVehicle.update({
      where: { id: vehicleId },
      data: { status: body.status },
    })
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Market Vehicle Update Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to update market vehicle", correlationId }, { status: 500 })
  }
}
