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
    const state = (sp.get("state") || "").trim()
    const hasVin = parseBoolean(sp.get("hasVin"))
    const hasPrice = parseBoolean(sp.get("hasPrice"))
    const limit = Math.min(Number(sp.get("limit") || 50), 200)
    const offset = Math.max(Number(sp.get("offset") || 0), 0)

    const supabase = getSupabase()

    // Query the canonical inventory view with full admin fields
    let query = supabase
      .from("inventory_listings_canonical")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq("status", status)
    if (source) query = query.eq("source", source)
    if (state) query = query.eq("state", state.toUpperCase())
    if (make) query = query.ilike("make", make)
    if (model) query = query.ilike("model", model)

    if (hasVin === true) query = query.not("vin", "is", null)
    if (hasVin === false) query = query.is("vin", null)

    if (hasPrice === true) query = query.gt("price", 0)
    if (hasPrice === false) query = query.or("price.is.null,price.eq.0")

    if (q) {
      const sanitized = q.replace(/[%_\\,().]/g, "\\$&")
      query = query.or(
        [
          `vin.ilike.%${sanitized}%`,
          `make.ilike.%${sanitized}%`,
          `model.ilike.%${sanitized}%`,
          `trim.ilike.%${sanitized}%`,
          `stock_number.ilike.%${sanitized}%`,
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

    return NextResponse.json({
      items: data || [],
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

