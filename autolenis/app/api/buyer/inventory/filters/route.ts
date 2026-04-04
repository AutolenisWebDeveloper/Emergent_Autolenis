import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { InventoryService } from "@/lib/services/inventory.service"

export const dynamic = "force-dynamic"

// GET /api/buyer/inventory/filters - Get available filter options
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const selectedMake = searchParams.get("make")

    const [makes, bodyStyles, models] = await Promise.all([
      InventoryService.getAvailableMakes(),
      InventoryService.getAvailableBodyStyles(),
      selectedMake ? InventoryService.getModelsForMake(selectedMake) : Promise.resolve([]),
    ])

    return NextResponse.json({
      success: true,
      makes,
      bodyStyles,
      models,
    })
  } catch (error) {
    console.error("[v0] Filters error:", error)
    return NextResponse.json({ error: "Failed to fetch filters" }, { status: 500 })
  }
}
