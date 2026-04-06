import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { getSupabase } from "@/lib/db"

export const dynamic = "force-dynamic"

function parseBoolean(value: string | null) {
  if (value === "true") return true
  if (value === "false") return false
  return undefined
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()

    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sp = req.nextUrl.searchParams

    const q = (sp.get("q") || "").trim()
    const make = (sp.get("make") || "").trim()
    const model = (sp.get("model") || "").trim()
    const status = (sp.get("status") || "").trim()
    const source = (sp.get("source") || "").trim()
    const hasVin = parseBoolean(sp.get("hasVin"))
    const hasPrice = parseBoolean(sp.get("hasPrice"))
    const limit = Math.min(Number(sp.get("limit") || 50), 200)
    const offset = Math.max(Number(sp.get("offset") || 0), 0)

    const supabase = getSupabase()

    // Query InventoryItem directly with Dealer join
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
        transmission,
        fuelType,
        isNew,
        photosJson,
        stockNumber,
        source,
        status,
        workspaceId,
        locationCity,
        locationState,
        createdAt,
        updatedAt,
        lastSyncedAt,
        dealerId,
        Dealer!InventoryItem_dealerId_fkey (
          id,
          businessName,
          phone,
          city,
          state,
          zip
        )
      `, { count: "exact" })
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq("status", status)
    if (source) query = query.eq("source", source)
    if (make) query = query.ilike("make", `%${make}%`)
    if (model) query = query.ilike("model", `%${model}%`)

    if (hasVin === true) query = query.not("vin", "is", null)
    if (hasVin === false) query = query.is("vin", null)

    if (hasPrice === true) query = query.gt("priceCents", 0)
    if (hasPrice === false) query = query.or("priceCents.is.null,priceCents.eq.0")

    if (q) {
      const sanitized = q.replace(/[%_\\,().]/g, "\\$&")
      query = query.or(
        [
          `vin.ilike.%${sanitized}%`,
          `make.ilike.%${sanitized}%`,
          `model.ilike.%${sanitized}%`,
          `trim.ilike.%${sanitized}%`,
          `stockNumber.ilike.%${sanitized}%`,
        ].join(","),
      )
    }

    const { data, error, count } = await query

    if (error) {
      const correlationId = crypto.randomUUID()
      console.error("[Admin Inventory Search Error]", { correlationId, error: error.message })
      return NextResponse.json(
        { error: { code: "SEARCH_FAILED", message: "Failed to search inventory" }, correlationId },
        { status: 500 },
      )
    }

    // Map to admin-friendly shape
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
      stockNumber: item.stockNumber,
      source: item.source,
      status: item.status,
      isNew: item.isNew,
      workspaceId: item.workspaceId,
      dealer_name: item.Dealer?.businessName ?? null,
      dealer_city: item.Dealer?.city ?? null,
      dealer_state: item.Dealer?.state ?? null,
      dealer_zip: item.Dealer?.zip ?? null,
      city: item.Dealer?.city ?? item.locationCity ?? null,
      state: item.Dealer?.state ?? item.locationState ?? null,
      zip: item.Dealer?.zip ?? null,
      last_seen_at: item.updatedAt ?? item.createdAt ?? null,
      createdAt: item.createdAt,
      lastSyncedAt: item.lastSyncedAt,
    }))

    return NextResponse.json({
      items,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error("[Admin Inventory Search Error]", { correlationId, error: String(error) })
    return NextResponse.json(
      { error: { code: "SEARCH_FAILED", message: "Failed to search inventory" }, correlationId },
      { status: 500 },
    )
  }
}
