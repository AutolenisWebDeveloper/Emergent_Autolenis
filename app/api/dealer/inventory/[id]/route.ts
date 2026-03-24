import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerService } from "@/lib/services/dealer.service"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

// Get single inventory item
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const { data: dealer, error: dealerError } = await supabase
      .from("Dealer")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    if (dealerError || !dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const { data: inventoryItem, error: itemError } = await supabase
      .from("InventoryItem")
      .select(`
        id,
        priceCents,
        status,
        vin,
        stockNumber,
        year,
        make,
        model,
        trim,
        bodyStyle,
        mileage,
        exteriorColor,
        interiorColor,
        engine,
        transmission,
        drivetrain,
        fuelType,
        photosJson,
        isNew,
        source,
        locationCity,
        locationState,
        createdAt,
        updatedAt
      `)
      .eq("id", id)
      .eq("dealerId", dealer.id)
      .maybeSingle()

    if (itemError) {
      console.error("[v0] Inventory item fetch error:", itemError)
      return NextResponse.json({ error: "Failed to fetch inventory item" }, { status: 500 })
    }

    if (!inventoryItem) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, inventoryItem })
  } catch (error) {
    console.error("[v0] Get inventory item error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Update inventory item
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const body = await _req.json()
    const inventoryItem = await dealerService.updateInventoryItem(id, dealer.id, body)

    return NextResponse.json({ success: true, inventoryItem })
  } catch (error) {
    console.error("[v0] Update inventory error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Delete inventory item
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    await dealerService.deleteInventoryItem(id, dealer.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete inventory error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
