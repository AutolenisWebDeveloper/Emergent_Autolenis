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
    const limit = Math.min(Number(searchParams.get("limit") || 24), 100)
    const offset = Math.max(Number(searchParams.get("offset") || 0), 0)
    const sortBy = searchParams.get("sortBy") || "newest"

    const supabase = getSupabase()

    // Query the canonical inventory view (buyer-facing)
    let query = supabase
      .from("inventory_listings_canonical")
      .select(
        `
        id,
        price,
        mileage,
        year,
        make,
        model,
        trim,
        vin,
        body_style,
        exterior_color,
        transmission,
        fuel_type,
        is_new,
        photos,
        stock_number,
        source,
        status,
        listing_url,
        dealer_name,
        dealer_phone,
        dealer_address,
        city,
        state,
        zip,
        last_seen_at,
        created_at
      `,
        { count: "exact" },
      )
      .eq("status", "BUYER_VISIBLE")

    // Apply filters
    if (zip) query = query.eq("zip", zip)
    if (make) query = query.ilike("make", make)
    if (model) query = query.ilike("model", model)
    if (minPrice > 0) query = query.gte("price", minPrice)
    if (maxPrice > 0) query = query.lte("price", maxPrice)

    if (q) {
      query = query.or(
        [`make.ilike.%${q}%`, `model.ilike.%${q}%`, `vin.ilike.%${q}%`].join(","),
      )
    }

    // Sorting
    switch (sortBy) {
      case "price_asc":
        query = query.order("price", { ascending: true })
        break
      case "price_desc":
        query = query.order("price", { ascending: false })
        break
      case "year_desc":
        query = query.order("year", { ascending: false })
        break
      case "mileage_asc":
        query = query.order("mileage", { ascending: true })
        break
      case "newest":
      default:
        query = query.order("created_at", { ascending: false })
        break
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error("[InventorySearch] Supabase query error:", error)
      return NextResponse.json({ error: "Failed to search inventory" }, { status: 500 })
    }

    const items = data || []

    return NextResponse.json({
      success: true,
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
