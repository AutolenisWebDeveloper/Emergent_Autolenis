import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { isUserAffiliate } from "@/lib/authz/roles"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isUserAffiliate(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const supabase = await createClient()

    // Verify the user is an affiliate
    const { data: affiliate, error: affiliateError } = await supabase
      .from("Affiliate")
      .select("id, workspaceId")
      .eq("userId", user.id)
      .maybeSingle()

    if (affiliateError) {
      logger.error("[Referred Affiliates] DB error:", affiliateError)
      return NextResponse.json({ error: "Failed to fetch affiliate" }, { status: 500 })
    }

    if (!affiliate) {
      return NextResponse.json({ error: "Forbidden: not an affiliate" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "20")))
    const search = searchParams.get("search") || ""
    const offset = (page - 1) * limit

    // Get level 1 referrals for this affiliate
    const { data: referrals, error: referralsError } = await supabase
      .from("Referral")
      .select("id, referredUserId, level, createdAt, ref_code, utm_source, status")
      .eq("affiliateId", affiliate.id)
      .eq("level", 1)
      .order("createdAt", { ascending: false })

    if (referralsError) {
      logger.error("[Referred Affiliates] Query error:", referralsError)
      return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 })
    }

    // Filter to only referrals where the referred user is an affiliate
    const affiliateReferrals: any[] = []
    for (const referral of referrals || []) {
      if (!referral.referredUserId) continue

      // Check if the referred user has an Affiliate record
      const { data: referredAffiliate } = await supabase
        .from("Affiliate")
        .select("id, firstName, lastName, referralCode, status, createdAt")
        .eq("userId", referral.referredUserId)
        .maybeSingle()

      if (!referredAffiliate) continue

      // Get user email
      const { data: referredUser } = await supabase
        .from("User")
        .select("email, createdAt")
        .eq("id", referral.referredUserId)
        .maybeSingle()

      const affName = `${referredAffiliate.firstName || ""} ${referredAffiliate.lastName || ""}`.trim() || "Unknown"
      const affEmail = referredUser?.email || ""

      // Apply search filter
      if (search) {
        const q = search.toLowerCase()
        if (!affName.toLowerCase().includes(q) && !affEmail.toLowerCase().includes(q)) {
          continue
        }
      }

      affiliateReferrals.push({
        id: referral.id,
        affiliateName: affName,
        affiliateEmail: affEmail,
        signupDate: referredUser?.createdAt || referral.createdAt,
        attributionSource: referral.ref_code ? "code" : "link",
        referralCode: referredAffiliate.referralCode || null,
        status: referredAffiliate.status || "ACTIVE",
      })
    }

    // Paginate the filtered results
    const total = affiliateReferrals.length
    const paginatedAffiliates = affiliateReferrals.slice(offset, offset + limit)

    return NextResponse.json({
      affiliates: paginatedAffiliates,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error("[Referred Affiliates] Error:", error)
    return NextResponse.json({ error: "Failed to get referred affiliates" }, { status: 500 })
  }
}
