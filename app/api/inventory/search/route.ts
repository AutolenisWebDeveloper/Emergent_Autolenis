import { type NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/db"
import { prisma, isPrismaAvailable } from "@/lib/db"
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

  // Try canonical listings first (Supabase view/table)
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

  // If canonical table returned results, use them
  if (!error && data && data.length > 0) {
    return NextResponse.json({
      items: data,
      total: count || 0,
      limit,
      offset,
    })
  }

  // Fallback: query InventoryItem table via Prisma when canonical table is empty or errored
  if (isPrismaAvailable()) {
    const where: Record<string, unknown> = { status: "AVAILABLE" }
    if (make) where.make = { contains: make, mode: "insensitive" }
    if (model) where.model = { contains: model, mode: "insensitive" }
    if (minPrice > 0) where.priceCents = { gte: Math.round(minPrice * 100) }
    if (maxPrice > 0) {
      where.priceCents = {
        ...(where.priceCents as Record<string, unknown> || {}),
        lte: Math.round(maxPrice * 100),
      }
    }
    if (q) {
      where.OR = [
        { vin: { contains: q, mode: "insensitive" } },
        { make: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          dealer: {
            select: {
              businessName: true,
              phone: true,
              address: true,
              city: true,
              state: true,
              zip: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.inventoryItem.count({ where }),
    ])

    // Map to the same shape the frontend expects
    const mappedItems = items.map((item: typeof items[number]) => ({
      id: item.id,
      price: item.priceCents ? item.priceCents / 100 : null,
      mileage: item.mileage,
      year: item.year,
      make: item.make,
      model: item.model,
      trim: item.trim,
      vin: item.vin,
      listing_url: null,
      source: item.source,
      dealer_name: item.dealer?.businessName ?? null,
      dealer_phone: item.dealer?.phone ?? null,
      dealer_address: item.dealer?.address ?? null,
      dealer_website: null,
      city: item.dealer?.city ?? item.locationCity ?? null,
      state: item.dealer?.state ?? item.locationState ?? null,
      zip: item.dealer?.zip ?? null,
      last_seen_at: item.updatedAt?.toISOString() ?? item.createdAt?.toISOString() ?? null,
    }))

    return NextResponse.json({
      items: mappedItems,
      total,
      limit,
      offset,
    })
  }

  // If neither source worked, return empty
  return NextResponse.json({
    items: [],
    total: 0,
    limit,
    offset,
  })
  } catch (error) {
    console.error("[InventorySearch] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
