import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerService } from "@/lib/services/dealer.service"
import { InventoryService } from "@/lib/services/inventory.service"

// POST /api/dealer/inventory/import - Bulk CSV import
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const body = await req.json()
    const { rows } = body

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 })
    }

    if (rows.length > 1000) {
      return NextResponse.json({ error: "Maximum 1000 rows per import" }, { status: 400 })
    }

    // Parse and normalize rows
    const parsedRows = rows.map((row: any) => ({
      vin: row.vin || row.VIN,
      stockNumber: row.stockNumber || row.stock_number || row.StockNumber,
      year: Number.parseInt(row.year || row.Year, 10),
      make: row.make || row.Make,
      model: row.model || row.Model,
      trim: row.trim || row.Trim,
      price: Number.parseFloat(row.price || row.Price || 0),
      mileage: Number.parseInt(row.mileage || row.Mileage || row.miles || 0, 10),
      isNew: ["new", "true", "1", "yes"].includes(
        String(row.new_used || row.isNew || row.condition || "used").toLowerCase(),
      ),
      exteriorColor: row.exteriorColor || row.exterior_color || row.color,
      interiorColor: row.interiorColor || row.interior_color,
      bodyStyle: row.bodyStyle || row.body_style || row.body,
      location: row.location || row.Location,
    }))

    const results = await InventoryService.bulkImport(dealer.id, parsedRows)

    return NextResponse.json({
      success: true,
      created: results.created,
      updated: results.updated,
      failed: results.failed,
      errors: results.errors,
    })
  } catch (error) {
    console.error("[v0] Import error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
