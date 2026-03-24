import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAffiliateRole } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockDb } from "@/lib/mocks/mockStore"
import { logger } from "@/lib/logger"

type CommissionRow = {
  id: string
  affiliateId: string
  referralId?: string | null
  level?: number | null
  status?: string | null
  createdAt?: string | null
  paidAt?: string | null
  amount_cents?: number | null
  amountCents?: number | null
  commissionAmount?: number | null // dollars
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!isAffiliateRole(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1") || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") || "20") || 20))
    const status = searchParams.get("status") || undefined
    const offset = (page - 1) * limit

    if (isTestWorkspace(user)) {
      const affiliate = mockDb.affiliateProfiles.find((p: any) => p.userId === user.userId)
      const affiliateId = affiliate?.id
      const raw = (mockDb.payouts || []).filter((p: any) => p.affiliateId === affiliateId)
      const commissions = raw
        .slice(offset, offset + limit)
        .map((p: any) => ({
          id: p.id,
          referralName: "Referred Buyer",
          level: 1,
          status: p.status === "COMPLETED" ? "PAID" : "PENDING",
          earnedAt: p.requestedAt,
          paidAt: p.paidAt || null,
          amount: (p.amountCents || 0) / 100,
        }))

      const stats = raw.reduce(
        (acc: any, p: any) => {
          const dollars = (p.amountCents || 0) / 100
          const s = p.status === "COMPLETED" ? "paid" : "pending"
          acc[s] += dollars
          return acc
        },
        { pending: 0, approved: 0, paid: 0 },
      )

      const total = raw.length
      return NextResponse.json({
        commissions,
        stats,
        pagination: { page, totalPages: Math.ceil(total / limit), total, limit },
      })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const { data: affiliate, error: affiliateError } = await supabase
      .from("Affiliate")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    if (affiliateError) {
      logger.error("[Affiliate Commissions] Error fetching affiliate:", affiliateError)
      return NextResponse.json({ error: "Failed to fetch affiliate" }, { status: 500 })
    }
    if (!affiliate) {
      return NextResponse.json({
        commissions: [],
        stats: { pending: 0, approved: 0, paid: 0 },
        pagination: { page, totalPages: 0, total: 0, limit },
      })
    }

    let query = supabase
      .from("Commission")
      .select(
        "id,affiliateId,referralId,referral_id,level,status,createdAt,paidAt,paid_at,amount_cents,amountCents,commissionAmount",
        { count: "exact" },
      )
      .eq("affiliateId", affiliate.id)
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq("status", status)

    const { data: commissionRows, error: commissionsError, count } = await query
    if (commissionsError) {
      logger.error("[Affiliate Commissions] Error fetching commissions:", commissionsError)
      return NextResponse.json({ error: "Failed to fetch commissions" }, { status: 500 })
    }

    const commissionsData = (commissionRows || []) as any[]
    const normalized: CommissionRow[] = commissionsData.map((c) => ({
      id: c.id,
      affiliateId: c.affiliateId,
      referralId: c.referralId || c.referral_id || null,
      level: c.level,
      status: c.status,
      createdAt: c.createdAt || null,
      paidAt: c.paidAt || c.paid_at || null,
      amount_cents: c.amount_cents ?? null,
      amountCents: c.amountCents ?? null,
      commissionAmount: typeof c.commissionAmount === "number" ? c.commissionAmount : null,
    }))

    // Resolve referral names (best-effort).
    const referralIds = Array.from(new Set(normalized.map((c) => c.referralId).filter(Boolean))) as string[]
    const referralNameById: Record<string, string> = {}

    if (referralIds.length > 0) {
      const { data: referrals } = await supabase
        .from("Referral")
        .select("id,referredUserId,referred_user_id,referredBuyerId,referred_buyer_id")
        .in("id", referralIds)

      const userIds = Array.from(
        new Set((referrals || []).map((r: any) => r.referredUserId || r.referred_user_id).filter(Boolean)),
      ) as string[]
      const buyerIds = Array.from(
        new Set((referrals || []).map((r: any) => r.referredBuyerId || r.referred_buyer_id).filter(Boolean)),
      ) as string[]

      const [usersRes, buyersRes] = await Promise.all([
        userIds.length
          ? supabase.from("User").select("id,first_name,last_name,email").in("id", userIds)
          : Promise.resolve({ data: [] as any[] }),
        buyerIds.length
          ? supabase.from("BuyerProfile").select("id,firstName,lastName,email").in("id", buyerIds)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const userMap = new Map((usersRes.data || []).map((u: any) => [u.id, u]))
      const buyerMap = new Map((buyersRes.data || []).map((b: any) => [b.id, b]))

      for (const r of referrals || []) {
        const referredUserId = r.referredUserId || r.referred_user_id
        const referredBuyerId = r.referredBuyerId || r.referred_buyer_id

        const u = referredUserId ? userMap.get(referredUserId) : null
        const b = referredBuyerId ? buyerMap.get(referredBuyerId) : null

        const first = u?.first_name || b?.firstName || "Referred"
        const lastInitial = (u?.last_name || b?.lastName || "").slice(0, 1)
        const label = lastInitial ? `${first} ${lastInitial}.` : first

        referralNameById[r.id] = label
      }
    }

    const amountDollars = (c: CommissionRow) => {
      const cents = c.amount_cents || c.amountCents
      if (typeof cents === "number") return cents / 100
      if (typeof c.commissionAmount === "number") return c.commissionAmount
      return 0
    }

    const commissions = normalized.map((c) => ({
      id: c.id,
      referralName: (c.referralId && referralNameById[c.referralId]) || "Referred Buyer",
      level: c.level || 1,
      status: c.status || "PENDING",
      earnedAt: c.createdAt,
      paidAt: c.paidAt,
      amount: amountDollars(c),
    }))

    // Stats: pending/approved/paid (dollars) — across ALL commissions, not just the current page.
    const { data: allCommissions } = await supabase
      .from("Commission")
      .select("amount_cents,amountCents,commissionAmount,status")
      .eq("affiliateId", affiliate.id)

    const stats = { pending: 0, approved: 0, paid: 0 }
    if (allCommissions) {
      for (const c of allCommissions) {
        const cents = (c as any).amount_cents || (c as any).amountCents
        const a = typeof cents === "number" ? cents / 100 : typeof (c as any).commissionAmount === "number" ? (c as any).commissionAmount : 0
        if (c.status === "PAID") stats.paid += a
        else if (c.status === "APPROVED") stats.approved += a
        else stats.pending += a
      }
    }

    const total = count || 0
    return NextResponse.json({
      commissions,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    logger.error("[Affiliate Commissions] Error:", error)
    return NextResponse.json({ error: "Failed to get commissions" }, { status: 500 })
  }
}
