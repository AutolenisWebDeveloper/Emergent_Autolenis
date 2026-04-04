import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { InventoryStatus } from "@/lib/constants/statuses"

export const dynamic = "force-dynamic"

// Get inventory
export async function GET(_req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const { data: dealer, error: dealerError } = await supabase
      .from("Dealer")
      .select("id, businessName, verified")
      .eq("userId", user.userId)
      .maybeSingle()

    if (dealerError) {
      console.error("[v0] Dealer lookup error:", dealerError)
      return NextResponse.json({ error: "Failed to fetch dealer" }, { status: 500 })
    }

    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const { data: inventory, error: inventoryError } = await supabase
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
        transmission,
        fuelType,
        photosJson,
        isNew,
        createdAt,
        updatedAt
      `)
      .eq("dealerId", dealer.id)
      .order("createdAt", { ascending: false })

    if (inventoryError) {
      console.error("[v0] Inventory fetch error:", inventoryError)
      return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 })
    }

    return NextResponse.json({ success: true, inventory: inventory || [] })
  } catch (error) {
    console.error("[v0] Inventory error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Add vehicle to inventory
export async function POST(_req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbCheck = requireDatabase()
    if (dbCheck) return dbCheck

    const { data: dealer, error: dealerError } = await supabase
      .from("Dealer")
      .select("id, businessName")
      .eq("userId", user.userId)
      .maybeSingle()

    if (dealerError || !dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const body = await _req.json()
    const {
      vin,
      year,
      make,
      model,
      trim,
      bodyStyle,
      mileage,
      exteriorColor,
      interiorColor,
      transmission,
      fuelType,
      images,
      price,
      stockNumber,
      isNew,
    } = body

    if (!vin || !year || !make || !model || !bodyStyle || !mileage || !price) {
      return NextResponse.json(
        {
          error: "Missing required fields: vin, year, make, model, bodyStyle, mileage, price",
        },
        { status: 400 },
      )
    }

    // Resolve dealer's workspaceId
    const { data: dealerFull } = await supabase
      .from("Dealer")
      .select("workspaceId")
      .eq("id", dealer.id)
      .maybeSingle()

    const workspaceId = dealerFull?.workspaceId || dealer.id

    const priceCents = Math.round(Number(price) * 100)

    const { data: inventoryItem, error: inventoryError } = await supabase
      .from("InventoryItem")
      .insert({
        dealerId: dealer.id,
        workspaceId,
        priceCents,
        vin,
        stockNumber: stockNumber || `STK-${Date.now()}`,
        year: Number(year),
        make,
        model,
        trim: trim || null,
        bodyStyle,
        mileage: Number(mileage),
        exteriorColor: exteriorColor || null,
        interiorColor: interiorColor || null,
        transmission: transmission || null,
        fuelType: fuelType || null,
        isNew: isNew || false,
        photosJson: images || [],
        status: InventoryStatus.AVAILABLE,
        source: "MANUAL",
      })
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
        transmission,
        fuelType,
        photosJson,
        createdAt
      `)
      .single()

    if (inventoryError || !inventoryItem) {
      console.error("[v0] Inventory creation error:", inventoryError)
      return NextResponse.json({ error: "Failed to add inventory item" }, { status: 500 })
    }

    return NextResponse.json({ success: true, inventoryItem })
  } catch (error) {
    console.error("[v0] Add inventory error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
