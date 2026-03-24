import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"
import { randomUUID } from "crypto"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || undefined
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const status = searchParams.get("status") || undefined

    if (isTestWorkspace(user)) {
      return NextResponse.json(mockSelectors.adminAffiliates({ search, status: status || "all", page, limit }))
    }

    const skip = (page - 1) * limit
    const supabase = await createClient()

    // Query from User table to ensure ALL affiliate-role users appear,
    // even those without an Affiliate profile row.
    let query = supabase.from("User").select(
      `
      id, email, first_name, last_name, role, createdAt, workspaceId,
      affiliateProfile:Affiliate(
        id, referralCode,
        firstName, lastName,
        totalEarnings, pendingEarnings,
        createdAt,
        referrals:Referral(count),
        commissions:Commission(count),
        clicks:Click(count)
      )
    `,
      { count: "exact" },
    )
    .eq("role", "AFFILIATE")

    if (user.workspace_id) {
      query = query.eq("workspaceId", user.workspace_id)
    }

    // Search across User email, first_name, last_name
    if (search) {
      query = query.or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`,
      )
    }

    const {
      data: users,
      error,
      count,
    } = await query.order("createdAt", { ascending: false }).range(skip, skip + limit - 1)

    if (error) {
      const correlationId = randomUUID()
      logger.error("[Admin Affiliates Error]", error, { correlationId })
      return NextResponse.json({ error: "Failed to load affiliates", correlationId }, { status: 500 })
    }

    // Calculate stats from Affiliate table (workspace-scoped)
    let statsQuery = supabase.from("Affiliate").select("totalEarnings, pendingEarnings")
    if (user.workspace_id) {
      statsQuery = statsQuery.eq("workspaceId", user.workspace_id)
    }
    const { data: allAffiliates } = await statsQuery

    // Count total users with AFFILIATE role for accurate stats
    let totalCountQuery = supabase
      .from("User")
      .select("id", { count: "exact", head: true })
      .eq("role", "AFFILIATE")
    if (user.workspace_id) {
      totalCountQuery = totalCountQuery.eq("workspaceId", user.workspace_id)
    }
    const { count: totalAffiliateUsers } = await totalCountQuery
    
    const stats = {
      totalAffiliates: totalAffiliateUsers || allAffiliates?.length || 0,
      activeAffiliates: allAffiliates?.length || 0,
      totalReferrals: (users || []).reduce((sum: number, u: any) => {
        const aff = Array.isArray(u.affiliateProfile) ? u.affiliateProfile[0] : u.affiliateProfile
        return sum + (aff?.referrals?.[0]?.count || 0)
      }, 0),
      totalEarnings: allAffiliates?.reduce((sum: number, a: any) => sum + (a.totalEarnings || 0), 0) || 0,
      pendingPayouts: allAffiliates?.reduce((sum: number, a: any) => sum + (a.pendingEarnings || 0), 0) || 0,
      paidPayouts: allAffiliates?.reduce((sum: number, a: any) => sum + Math.max(0, (a.totalEarnings || 0) - (a.pendingEarnings || 0)), 0) || 0,
    }

    return NextResponse.json({
      affiliates: (users || []).map((u: any) => {
        const aff = Array.isArray(u.affiliateProfile) ? u.affiliateProfile[0] : u.affiliateProfile
        const hasProfile = !!aff
        return {
          id: aff?.id || u.id,
          userId: u.id,
          status: hasProfile ? "ACTIVE" : "PENDING",
          referralCode: aff?.referralCode || "",
          totalReferrals: aff?.referrals?.[0]?.count || 0,
          totalEarnings: aff?.totalEarnings || 0,
          pendingEarnings: aff?.pendingEarnings || 0,
          paidEarnings: Math.max(0, (aff?.totalEarnings || 0) - (aff?.pendingEarnings || 0)),
          createdAt: u.createdAt,
          profileComplete: hasProfile,
          user: {
            email: u.email,
            firstName: aff?.firstName || u.first_name || "",
            lastName: aff?.lastName || u.last_name || "",
          },
          bankDetails: null,
        }
      }),
      stats,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    })
  } catch (error) {
    const correlationId = randomUUID()
    logger.error("[Admin Affiliates Error]", error, { correlationId })
    return NextResponse.json({ error: "Failed to load affiliates", correlationId }, { status: 500 })
  }
}
