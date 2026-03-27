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

    const { data: affiliate, error: affiliateError } = await supabase
      .from("Affiliate")
      .select("id")
      .eq("userId", user.id)
      .maybeSingle()

    if (affiliateError) {
      logger.error("[Affiliate Referrals] DB error:", affiliateError)
      return NextResponse.json({ error: "Failed to fetch affiliate" }, { status: 500 })
    }

    if (!affiliate) {
      return NextResponse.json({
        referrals: [],
        pagination: { total: 0, page: 1, totalPages: 0 },
      })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1") || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "20") || 20))
    const offset = (page - 1) * limit

    const { data: referrals, error: referralsError } = await supabase
      .from("Referral")
      .select(`
        id,
        level,
        dealCompleted,
        commissionPaid,
        createdAt,
        attribution_source,
        referredUserId,
        status
      `)
      .eq("affiliateId", affiliate.id)
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1)

    if (referralsError) {
      logger.error("[Affiliate Referrals] Referrals query error:", referralsError)
      return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 })
    }

    // Get total count
    const { count } = await supabase
      .from("Referral")
      .select("*", { count: "exact", head: true })
      .eq("affiliateId", affiliate.id)

    // Get user details and commissions for each referral
    const referralsWithUsers = await Promise.all(
      (referrals || []).map(async (referral) => {
        let name = "Unknown"
        let email = ""
        let signedUpAt = referral.createdAt

        if (referral.referredUserId) {
          const { data: referredUser } = await supabase
            .from("User")
            .select("id, first_name, last_name, email, createdAt")
            .eq("id", referral.referredUserId)
            .maybeSingle()

          if (referredUser) {
            name = `${referredUser.first_name || ""} ${referredUser.last_name || ""}`.trim() || "Unknown"
            email = referredUser.email || ""
            signedUpAt = referredUser.createdAt || referral.createdAt
          }
        }

        // Sum commissions for this referral
        const { data: commissions } = await supabase
          .from("Commission")
          .select("amount_cents,amountCents")
          .eq("referralId", referral.id)

        const commission = (commissions || []).reduce((sum: number, c: any) => {
          return sum + ((c.amount_cents || c.amountCents || 0) / 100)
        }, 0)

        // Derive display status
        let displayStatus = referral.status || "pending"
        if (referral.dealCompleted) {
          displayStatus = "DEAL_COMPLETE"
        } else if (referral.commissionPaid) {
          displayStatus = "DEAL_COMPLETE"
        } else if (displayStatus === "pending") {
          displayStatus = "SIGNED_UP"
        }

        return {
          id: referral.id,
          name,
          email,
          signedUpAt,
          level: referral.level,
          status: displayStatus,
          commission,
          attributionSource: referral.attribution_source || null,
        }
      }),
    )

    return NextResponse.json({
      referrals: referralsWithUsers,
      pagination: {
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: unknown) {
    logger.error("[Affiliate Referrals] Error:", error)
    return NextResponse.json({ error: "Failed to get referrals" }, { status: 500 })
  }
}
