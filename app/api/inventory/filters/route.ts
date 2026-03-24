import { NextResponse } from "next/server"
import { InventoryService } from "@/lib/services/inventory.service"

export async function GET() {
  try {
    const [makes, bodyStyles] = await Promise.all([
      InventoryService.getAvailableMakes(),
      InventoryService.getAvailableBodyStyles(),
    ])

    return NextResponse.json({
      success: true,
      data: { makes, bodyStyles },
    })
  } catch (error: any) {
    console.error("[Inventory Filters]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}