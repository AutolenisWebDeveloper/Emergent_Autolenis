import { type NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/db"
import { rateLimit, rateLimits } from "@/lib/middleware/rate-limit"

export async function GET(req: NextRequest) {
  try {
    // Rate limit: 100 requests per minute per IP to prevent scraping
    const rateLimitResponse = await rateLimit(req, rateLimits.api)
    if (rateLimitResponse) return rateLimitResponse

    const { searchParams } = new URL(req.url)

    const q = (searchParams.get("q") || "").trim()
    const zip = (searchParams.get("zip") || "").trim()
    const make = (searchParams.get("make") || "").trim()
    const model = (searchParams.get("model") || "").trim()
    const minPrice = Number(searchParams.get("minPrice") || 0)
    const maxPrice = Number(searchParams.get("maxPrice") || 0)
    const bodyStyle = (searchParams.get("bodyStyle") || "").trim()
    const minYear = Number(searchParams.get("minYear") || 0)
    const maxYear = Number(searchParams.get("maxYear") || 0)
    const limit = Math.min(Number(searchParams.get("limit") || 24), 100)
    const offset = Math.max(Number(searchParams.get("offset") || 0), 0)
    const sortBy = searchParams.get("sortBy") || "newest"

    const supabase = getSupabase()

    // Query InventoryItem directly (the canonical inventory source)
    // Join with Dealer for display info
    let query = supabase
      .from("InventoryItem")
      .select(`
        id,
        priceCents,
        mileage,
        year,
        make,
        model,
        trim,
        vin,
        bodyStyle,
        exteriorColor,
        interiorColor,
        transmission,
        fuelType,
        isNew,
        photosJson,
        stockNumber,
        source,
        status,
        locationCity,
        locationState,
        createdAt,
        updatedAt,
        dealerId,
        Dealer!InventoryItem_dealerId_fkey (
          id,
          businessName,
          phone,
          address,
          city,
          state,
          zip
        )
      `, { count: "exact" })
      .eq("status", "AVAILABLE")

    // Apply filters
    if (make) query = query.ilike("make", `%${make}%`)
    if (model) query = query.ilike("model", `%${model}%`)
    if (bodyStyle) query = query.ilike("bodyStyle", `%${bodyStyle}%`)

    if (minPrice > 0) query = query.gte("priceCents", Math.round(minPrice * 100))
    if (maxPrice > 0) query = query.lte("priceCents", Math.round(maxPrice * 100))

    if (minYear > 0) query = query.gte("year", minYear)
    if (maxYear > 0) query = query.lte("year", maxYear)

    if (q) {
      query = query.or(
        [
          `vin.ilike.%${q}%`,
          `make.ilike.%${q}%`,
          `model.ilike.%${q}%`,
          `trim.ilike.%${q}%`,
        ].join(","),
      )
    }

    // Sorting
    switch (sortBy) {
      case "price_asc":
        query = query.order("priceCents", { ascending: true })
        break
      case "price_desc":
        query = query.order("priceCents", { ascending: false })
        break
      case "year_desc":
        query = query.order("year", { ascending: false })
        break
      case "mileage_asc":
        query = query.order("mileage", { ascending: true })
        break
      case "newest":
      default:
        query = query.order("createdAt", { ascending: false })
        break
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error("[InventorySearch] Supabase query error:", error)
      return NextResponse.json({ error: "Failed to search inventory" }, { status: 500 })
    }

    // Map to frontend-expected shape
    const items = (data || []).map((item: any) => ({
      id: item.id,
      price: item.priceCents ? item.priceCents / 100 : null,
      priceCents: item.priceCents,
      mileage: item.mileage,
      year: item.year,
      make: item.make,
      model: item.model,
      trim: item.trim,
      vin: item.vin,
      bodyStyle: item.bodyStyle,
      exteriorColor: item.exteriorColor,
      interiorColor: item.interiorColor,
      transmission: item.transmission,
      fuelType: item.fuelType,
      isNew: item.isNew,
      images: item.photosJson || [],
      stockNumber: item.stockNumber,
      source: item.source,
      listing_url: null,
      dealer_name: item.Dealer?.businessName ?? null,
      dealer_phone: item.Dealer?.phone ?? null,
      dealer_address: item.Dealer?.address ?? null,
      dealer_website: null,
      city: item.Dealer?.city ?? item.locationCity ?? null,
      state: item.Dealer?.state ?? item.locationState ?? null,
      zip: item.Dealer?.zip ?? null,
      last_seen_at: item.updatedAt ?? item.createdAt ?? null,
    }))

    return NextResponse.json({
      items,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error("[InventorySearch] Error:", error)
    return NextResponse.json({ error: "Failed to search inventory" }, { status: 500 })
  }
}
