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

  const supabase = getSupabase()

  let query = supabase
    .from("inventory_listings_canonical")
    .select(`
      id,
      price,
      mileage,
      year,
      make,
      model,
      trim,
      vin,
      listing_url,
      source,
      dealer_name,
      dealer_phone,
      dealer_address,
      dealer_website,
      city,
      state,
      zip,
      last_seen_at
    `, { count: "exact" })
    .eq("status", "BUYER_VISIBLE")
    .order("last_seen_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (zip) query = query.eq("zip", zip)
  if (make) query = query.ilike("make", make)
  if (model) query = query.ilike("model", model)
  if (minPrice > 0) query = query.gte("price", minPrice)
  if (maxPrice > 0) query = query.lte("price", maxPrice)

  if (q) {
    query = query.or(
      [
        `vin.ilike.%${q}%`,
        `make.ilike.%${q}%`,
        `model.ilike.%${q}%`,
        `trim.ilike.%${q}%`,
        `dealer_name.ilike.%${q}%`,
      ].join(","),
    )
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json(
      { error: "Failed to search inventory", details: error.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    items: data || [],
    total: count || 0,
    limit,
    offset,
  })
  } catch (error) {
    console.error("[InventorySearch] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
