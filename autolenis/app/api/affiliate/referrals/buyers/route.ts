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
      logger.error("[Referred Buyers] DB error:", affiliateError)
      return NextResponse.json({ error: "Failed to fetch affiliate" }, { status: 500 })
    }

    if (!affiliate) {
      return NextResponse.json({ error: "Forbidden: not an affiliate" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "20")))
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const offset = (page - 1) * limit

    // Get referrals for this affiliate (level 1 = direct referrals)
    let referralsQuery = supabase
      .from("Referral")
      .select("id, referredUserId, referredBuyerId, level, dealCompleted, commissionPaid, status, createdAt, ref_code, utm_source, utm_medium, utm_campaign, attributed_at")
      .eq("affiliateId", affiliate.id)
      .eq("level", 1)
      .order("createdAt", { ascending: false })

    const { data: referrals, error: referralsError } = await referralsQuery

    if (referralsError) {
      logger.error("[Referred Buyers] Query error:", referralsError)
      return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 })
    }

    // Filter to only referrals where the referred user has a BuyerProfile
    const buyerReferrals: any[] = []
    for (const referral of referrals || []) {
      if (!referral.referredUserId) continue

      // Check if the referred user has a BuyerProfile
      const { data: buyerProfile } = await supabase
        .from("BuyerProfile")
        .select("id, firstName, lastName, createdAt")
        .eq("userId", referral.referredUserId)
        .maybeSingle()

      if (!buyerProfile) continue

      // Check if the referred user is also an affiliate (if so, skip for buyer list)
      const { data: affiliateProfile } = await supabase
        .from("Affiliate")
        .select("id")
        .eq("userId", referral.referredUserId)
        .maybeSingle()

      // Get user email
      const { data: referredUser } = await supabase
        .from("User")
        .select("email, createdAt")
        .eq("id", referral.referredUserId)
        .maybeSingle()

      const buyerName = `${buyerProfile.firstName || ""} ${buyerProfile.lastName || ""}`.trim() || "Unknown"
      const buyerEmail = referredUser?.email || ""

      // Apply search filter
      if (search) {
        const q = search.toLowerCase()
        if (!buyerName.toLowerCase().includes(q) && !buyerEmail.toLowerCase().includes(q)) {
          continue
        }
      }

      // Derive funnel stage
      let funnelStage = "signup"

      // Check for pre-qualification
      const { count: prequalCount } = await supabase
        .from("PreQualification")
        .select("id", { count: "exact", head: true })
        .eq("buyerId", buyerProfile.id)

      if (prequalCount && prequalCount > 0) funnelStage = "prequalified"

      // Check for auction
      const { count: auctionCount } = await supabase
        .from("Auction")
        .select("id", { count: "exact", head: true })
        .eq("buyerId", buyerProfile.id)

      if (auctionCount && auctionCount > 0) funnelStage = "auction"

      // Check for selected deal
      const { count: dealCount } = await supabase
        .from("SelectedDeal")
        .select("id", { count: "exact", head: true })
        .eq("buyerId", buyerProfile.id)

      if (dealCount && dealCount > 0) funnelStage = "deal"

      if (referral.dealCompleted) funnelStage = "deal"

      // Apply status filter
      if (status && status !== funnelStage) continue

      // Get commissions for this referral
      const { data: commissions } = await supabase
        .from("Commission")
        .select("amount_cents, amountCents, commissionAmount, status")
        .eq("referralId", referral.id)

      const totalCommission = (commissions || []).reduce((sum: number, c: any) => {
        return sum + ((c.amount_cents || c.amountCents || 0) / 100)
      }, 0)

      buyerReferrals.push({
        id: referral.id,
        buyerName,
        buyerEmail,
        signupDate: referredUser?.createdAt || referral.createdAt,
        attributionSource: referral.ref_code ? "code" : "link",
        referralCode: referral.ref_code || null,
        utmSource: referral.utm_source || null,
        utmMedium: referral.utm_medium || null,
        utmCampaign: referral.utm_campaign || null,
        funnelStage,
        lastActivity: referral.attributed_at || referral.createdAt,
        commission: totalCommission,
        isAlsoAffiliate: !!affiliateProfile,
      })
    }

    // Paginate the filtered results
    const total = buyerReferrals.length
    const paginatedBuyers = buyerReferrals.slice(offset, offset + limit)

    return NextResponse.json({
      buyers: paginatedBuyers,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error("[Referred Buyers] Error:", error)
    return NextResponse.json({ error: "Failed to get referred buyers" }, { status: 500 })
  }
}
