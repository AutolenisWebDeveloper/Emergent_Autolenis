import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAffiliateRole } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockDb } from "@/lib/mocks/mockStore"
import { logger } from "@/lib/logger"

const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] || "https://autolenis.com"

const COMMISSION_RATES: Record<number, number> = {
  1: 0.15, // 15% Level 1
  2: 0.03, // 3% Level 2
  3: 0.02, // 2% Level 3
}

export async function GET(_req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isAffiliateRole(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (isTestWorkspace(user)) {
      return NextResponse.json(getMockAffiliateDashboard())
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Find affiliate by userId
    const { data: affiliate, error: affiliateError } = await supabase
      .from("Affiliate")
      .select("*")
      .eq("userId", user.userId)
      .maybeSingle()

    if (affiliateError) {
      logger.error("[Affiliate Dashboard] Error finding affiliate:", affiliateError)
      return NextResponse.json(getDefaultDashboardData())
    }

    // If no affiliate exists, create one
    let currentAffiliate = affiliate
    if (!currentAffiliate) {
      const refCode = generateReferralCode()
      const landingSlug = generateLandingSlug(user.firstName || "user", user.lastName || user.userId.substring(0, 4))

      const { data: newAffiliate, error: createError } = await supabase
        .from("Affiliate")
        .insert({
          userId: user.userId,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          refCode,
          referralCode: refCode,
          ref_code: refCode,
          landing_slug: landingSlug,
          landingSlug: landingSlug,
          totalEarnings: 0,
          pendingEarnings: 0,
          status: "ACTIVE",
          available_balance_cents: 0,
          lifetime_earnings_cents: 0,
          lifetime_paid_cents: 0,
        })
        .select()
        .single()

      if (createError) {
        logger.error("[Affiliate Dashboard] Error creating affiliate:", createError)
        return NextResponse.json(getDefaultDashboardData())
      }
      currentAffiliate = newAffiliate
    }

    // Fetch dashboard stats in parallel
    const [
      clicksResult,
      referralsResult,
      completedDealsResult,
      pendingCommissionsResult,
      earnedCommissionsResult,
      paidCommissionsResult,
      recentCommissionsResult,
      clicksChartResult,
    ] = await Promise.all([
      supabase.from("Click").select("id", { count: "exact", head: true }).eq("affiliateId", currentAffiliate.id),
      supabase
        .from("Referral")
        .select("id", { count: "exact", head: true })
        .eq("affiliateId", currentAffiliate.id)
        .eq("level", 1),
      supabase
        .from("Referral")
        .select("id", { count: "exact", head: true })
        .eq("affiliateId", currentAffiliate.id)
        .eq("dealCompleted", true),
      supabase
        .from("Commission")
        .select("amount_cents,amountCents")
        .eq("affiliateId", currentAffiliate.id)
        .eq("status", "PENDING"),
      supabase
        .from("Commission")
        .select("amount_cents,amountCents")
        .eq("affiliateId", currentAffiliate.id)
        .eq("status", "EARNED"),
      supabase
        .from("Commission")
        .select("amount_cents,amountCents")
        .eq("affiliateId", currentAffiliate.id)
        .eq("status", "PAID"),
      supabase
        .from("Commission")
        .select("*")
        .eq("affiliateId", currentAffiliate.id)
        .order("createdAt", { ascending: false })
        .limit(10),
      supabase
        .from("Click")
        .select("createdAt")
        .eq("affiliateId", currentAffiliate.id)
        .gte("createdAt", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("createdAt", { ascending: true }),
    ])

    const totalClicks = clicksResult.count || 0
    const totalReferrals = referralsResult.count || 0
    const completedDeals = completedDealsResult.count || 0

    // Calculate commission sums
    const sumCommissions = (data: any[] | null) => {
      if (!data) return { sum: 0, count: 0 }
      const sum = data.reduce((acc, c) => acc + (c.amount_cents || c.amountCents || 0), 0)
      return { sum, count: data.length }
    }

    const pending = sumCommissions(pendingCommissionsResult.data)
    const earned = sumCommissions(earnedCommissionsResult.data)
    const paid = sumCommissions(paidCommissionsResult.data)

    // Build clicksChart: aggregate clicks into 30-day buckets
    const clicksChart = buildClicksChart(clicksChartResult.data || [])

    // Get referrals by level
    const { data: referralsByLevelData } = await supabase
      .from("Referral")
      .select("level")
      .eq("affiliateId", currentAffiliate.id)

    const referralsByLevel = {
      level1: referralsByLevelData?.filter((r) => r.level === 1).length || 0,
      level2: referralsByLevelData?.filter((r) => r.level === 2).length || 0,
      level3: referralsByLevelData?.filter((r) => r.level === 3).length || 0,
    }

    const links = {
      referralLink: `${APP_URL}/?ref=${currentAffiliate.refCode || currentAffiliate.referralCode}`,
      landingPage: `${APP_URL}/r/${currentAffiliate.landingSlug || currentAffiliate.landing_slug}`,
      refCode: currentAffiliate.refCode || currentAffiliate.referralCode,
    }

    const pendingDollars = pending.sum / 100
    const paidDollars = paid.sum / 100

    return NextResponse.json({
      affiliate: {
        id: currentAffiliate.id,
        firstName: currentAffiliate.firstName,
        lastName: currentAffiliate.lastName,
        status: currentAffiliate.status,
        ...links,
      },
      stats: {
        totalClicks,
        totalReferrals,
        completedDeals,
        conversionRate: totalClicks > 0 ? ((totalReferrals / totalClicks) * 100).toFixed(2) : "0.00",
        dealConversionRate: totalReferrals > 0 ? ((completedDeals / totalReferrals) * 100).toFixed(2) : "0.00",
        pendingCommissions: pendingDollars,
        pendingCommissionCount: pending.count,
        paidCommissions: paidDollars,
        totalPaidOut: paidDollars,
      },
      earnings: {
        pendingCents: pending.sum,
        pendingCount: pending.count,
        earnedCents: earned.sum,
        earnedCount: earned.count,
        paidCents: paid.sum,
        paidCount: paid.count,
        availableBalanceCents: currentAffiliate.available_balance_cents || 0,
        lifetimeEarningsCents: currentAffiliate.lifetime_earnings_cents || 0,
        lifetimePaidCents: currentAffiliate.lifetime_paid_cents || 0,
      },
      referralsByLevel,
      clicksChart,
      referralLevels: Object.entries(COMMISSION_RATES).map(([level, rate]) => ({
        level: Number(level),
        count: referralsByLevel[`level${level}` as keyof typeof referralsByLevel] || 0,
        commissionRate: `${(rate * 100).toFixed(0)}%`,
      })),
      recentCommissions: (recentCommissionsResult.data || []).map((c: any) => ({
        id: c.id,
        amountCents: c.amount_cents || c.amountCents,
        level: c.level,
        status: c.status,
        createdAt: c.createdAt,
      })),
    })
  } catch (error: any) {
    logger.error("[Affiliate Dashboard] Error:", error)
    return NextResponse.json({ error: "Failed to get dashboard" }, { status: 500 })
  }
}

/** Aggregate raw click rows into a 30-day { date, clicks } time-series. */
function buildClicksChart(clicks: Array<{ createdAt: string }>): Array<{ date: string; clicks: number }> {
  const buckets: Record<string, number> = {}
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    buckets[d.toISOString().split("T")[0]] = 0
  }
  for (const c of clicks) {
    const day = new Date(c.createdAt).toISOString().split("T")[0]
    if (day in buckets) buckets[day]++
  }
  return Object.entries(buckets).map(([date, count]) => ({ date, clicks: count }))
}

function getDefaultDashboardData() {
  return {
    affiliate: {
      id: "",
      firstName: "",
      lastName: "",
      status: "PENDING",
      referralLink: "",
      landingPage: "",
      refCode: "",
    },
    stats: {
      totalClicks: 0,
      totalReferrals: 0,
      completedDeals: 0,
      conversionRate: "0.00",
      dealConversionRate: "0.00",
      pendingCommissions: 0,
      pendingCommissionCount: 0,
      paidCommissions: 0,
      totalPaidOut: 0,
    },
    earnings: {
      pendingCents: 0,
      pendingCount: 0,
      earnedCents: 0,
      earnedCount: 0,
      paidCents: 0,
      paidCount: 0,
      availableBalanceCents: 0,
      lifetimeEarningsCents: 0,
      lifetimePaidCents: 0,
    },
    referralsByLevel: {
      level1: 0,
      level2: 0,
      level3: 0,
    },
    clicksChart: [],
    referralLevels: Object.entries(COMMISSION_RATES).map(([level, rate]) => ({
      level: Number(level),
      count: 0,
      commissionRate: `${(rate * 100).toFixed(0)}%`,
    })),
    recentCommissions: [],
  }
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function generateLandingSlug(firstName: string, lastName: string): string {
  const base = `${firstName}-${lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, "")
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

function getMockAffiliateDashboard() {
  const affiliate = mockDb.affiliateProfiles[0]
  const baseUrl = APP_URL
  const refCode = affiliate?.referralCode || "ALM8Q235I7"
  const payouts = mockDb.payouts.filter((p: any) => p.affiliateId === affiliate?.id)
  const paidPayouts = payouts.filter((p: any) => p.status === "COMPLETED")
  const pendingPayouts = payouts.filter((p: any) => p.status === "PENDING")

  return {
    affiliate: {
      id: affiliate?.id || "affiliate_gold_001",
      firstName: affiliate?.name?.split(" ")[0] || "Atlas",
      lastName: affiliate?.name?.split(" ").slice(1).join(" ") || "Auto Advisors",
      status: affiliate?.status || "ACTIVE",
      referralLink: `${baseUrl}/?ref=${refCode}`,
      landingPage: `${baseUrl}/r/atlas-auto`,
      refCode,
    },
    stats: {
      totalClicks: 47,
      totalReferrals: 1,
      completedDeals: mockDb.deals.filter((d: any) => d.status === "COMPLETED").length,
      conversionRate: "2.13",
      dealConversionRate: "100.00",
      pendingCommissions: pendingPayouts.reduce((s: number, p: any) => s + p.amountCents, 0) / 100,
      pendingCommissionCount: pendingPayouts.length,
      paidCommissions: paidPayouts.reduce((s: number, p: any) => s + p.amountCents, 0) / 100,
      totalPaidOut: paidPayouts.reduce((s: number, p: any) => s + p.amountCents, 0) / 100,
    },
    earnings: {
      pendingCents: pendingPayouts.reduce((s: number, p: any) => s + p.amountCents, 0),
      pendingCount: pendingPayouts.length,
      earnedCents: affiliate?.totalEarnings || 75_000,
      earnedCount: payouts.length,
      paidCents: paidPayouts.reduce((s: number, p: any) => s + p.amountCents, 0),
      paidCount: paidPayouts.length,
      availableBalanceCents: pendingPayouts.reduce((s: number, p: any) => s + p.amountCents, 0),
      lifetimeEarningsCents: affiliate?.totalEarnings || 75_000,
      lifetimePaidCents: paidPayouts.reduce((s: number, p: any) => s + p.amountCents, 0),
    },
    referralsByLevel: { level1: 1, level2: 0, level3: 0 },
    recentCommissions: [
      {
        id: "comm_gold_001",
        amount: 75_000,
        status: "PENDING",
        dealId: "deal_gold_001",
        buyerName: "Jordan Ellis",
        createdAt: "2026-01-10T16:00:00Z",
      },
    ],
    clicksChart: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2026, 0, i + 1).toISOString().split("T")[0],
      clicks: Math.max(0, Math.round(3 + Math.sin(i / 3) * 2)),
    })),
    referralLevels: Object.entries(COMMISSION_RATES).map(([level, rate]) => ({
      level: Number(level),
      count: level === "1" ? 1 : 0,
      commissionRate: `${(rate * 100).toFixed(0)}%`,
    })),
  }
}
