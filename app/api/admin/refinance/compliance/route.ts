import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    const supabase = await createClient()

    const {
      data: leads,
      error: leadsError,
      count: total,
    } = await supabase
      .from("RefinanceLead")
      .select("id, firstName, lastName, email, phone, state, partner, fundedAt, marketingRestriction", {
        count: "exact",
      })
      .eq("openroadFunded", true)
      .eq("marketingRestriction", "NO_CREDIT_SOLICITATION")
      .order("fundedAt", { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (leadsError) {
      console.error("[v0] Admin compliance list error:", leadsError)
      return NextResponse.json({ error: "Failed to fetch compliance list" }, { status: 500 })
    }

    return NextResponse.json({
      leads: leads || [],
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    })
  } catch (error) {
    console.error("[v0] Admin compliance list error:", error)
    return NextResponse.json({ error: "Failed to fetch compliance list" }, { status: 500 })
  }
}
