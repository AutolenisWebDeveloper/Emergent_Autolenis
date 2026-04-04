import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search")
    const status = searchParams.get("status")
    const funded = searchParams.get("funded")
    const state = searchParams.get("state")
    const partner = searchParams.get("partner")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const supabase = await createClient()
    let query = supabase.from("RefinanceLead").select("*, fundedLoan:FundedLoan(*)", { count: "exact" })

    // Apply filters
    if (search) {
      query = query.or(`email.ilike.%${search}%,firstName.ilike.%${search}%,lastName.ilike.%${search}%,state.ilike.%${search}%`)
    }

    if (status) {
      query = query.eq("qualificationStatus", status)
    }

    if (funded === "true") {
      query = query.eq("openroadFunded", true)
    } else if (funded === "false") {
      query = query.eq("openroadFunded", false)
    }

    if (state) {
      query = query.eq("state", state)
    }

    if (partner) {
      query = query.eq("partner", partner)
    }

    if (startDate) {
      query = query.gte("createdAt", startDate)
    }

    if (endDate) {
      query = query.lte("createdAt", endDate)
    }

    const {
      data: leads,
      error,
      count,
    } = await query.order("createdAt", { ascending: false }).range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error("Admin refinance leads error:", error)
      return NextResponse.json({ error: "Failed to fetch refinance leads" }, { status: 500 })
    }

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Admin refinance leads error:", error)
    return NextResponse.json({ error: "Failed to fetch refinance leads" }, { status: 500 })
  }
}
