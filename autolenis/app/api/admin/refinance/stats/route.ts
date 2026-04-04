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
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const supabase = await createClient()
    let baseQuery = supabase.from("RefinanceLead").select("*", { count: "exact", head: true })

    if (startDate) {
      baseQuery = baseQuery.gte("createdAt", startDate)
    }

    if (endDate) {
      baseQuery = baseQuery.lte("createdAt", endDate)
    }

    // Get aggregated stats
    const [totalResult, qualifiedResult, redirectedResult, fundedResult, revenueData] = await Promise.all([
      baseQuery,
      supabase
        .from("RefinanceLead")
        .select("*", { count: "exact", head: true })
        .eq("qualificationStatus", "QUALIFIED")
        .gte("createdAt", startDate || "1970-01-01")
        .lte("createdAt", endDate || "2099-12-31"),
      supabase
        .from("RefinanceLead")
        .select("*", { count: "exact", head: true })
        .not("redirectedToPartnerAt", "is", null)
        .gte("createdAt", startDate || "1970-01-01")
        .lte("createdAt", endDate || "2099-12-31"),
      supabase
        .from("RefinanceLead")
        .select("*", { count: "exact", head: true })
        .eq("openroadFunded", true)
        .gte("createdAt", startDate || "1970-01-01")
        .lte("createdAt", endDate || "2099-12-31"),
      supabase
        .from("RefinanceLead")
        .select("commissionAmount")
        .eq("openroadFunded", true)
        .gte("createdAt", startDate || "1970-01-01")
        .lte("createdAt", endDate || "2099-12-31"),
    ])

    const totalLeads = totalResult.count || 0
    const qualifiedLeads = qualifiedResult.count || 0
    const redirectedLeads = redirectedResult.count || 0
    const fundedLeads = fundedResult.count || 0
    const totalRevenue = (revenueData.data || []).reduce((sum, lead) => sum + (lead.commissionAmount || 0), 0)

    // Calculate funding rate
    const fundingRate = qualifiedLeads > 0 ? ((fundedLeads / qualifiedLeads) * 100).toFixed(1) : "0"

    return NextResponse.json({
      totalLeads,
      qualifiedLeads,
      redirectedLeads,
      fundedLeads,
      fundingRate: Number.parseFloat(fundingRate),
      totalRevenue,
    })
  } catch (error) {
    console.error("Admin refinance stats error:", error)
    return NextResponse.json({ error: "Failed to fetch refinance stats" }, { status: 500 })
  }
}
