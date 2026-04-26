import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

export const dynamic = "force-dynamic"

/**
 * GET /api/dealer/scorecard
 * Returns dealer performance metrics:
 * - win rate (offers accepted / total offers submitted)
 * - auction response rate (auctions responded to / auctions invited)
 * - junk fee ratio (offers with junk fees flagged / total scans)
 * - deal completion rate (COMPLETED deals / total deals)
 * - 90-day trend per metric
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Resolve dealer id
    let dealerId: string | null = null

    const { data: dealerRow } = await supabase
      .from("Dealer")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    if (dealerRow?.id) {
      dealerId = dealerRow.id
    } else {
      const { data: duRow } = await supabase
        .from("DealerUser")
        .select("dealerId")
        .eq("userId", user.userId)
        .maybeSingle()
      dealerId = duRow?.dealerId ?? null
    }

    if (!dealerId) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const iso90 = ninetyDaysAgo.toISOString()

    // --- Win rate: accepted selected deals vs total auction offers submitted
    const { count: totalOffers } = await supabase
      .from("AuctionOffer")
      .select("id", { count: "exact", head: true })
      .eq("participantId", dealerId) // participantId ties back to AuctionParticipant.id

    const { count: wonDeals } = await supabase
      .from("SelectedDeal")
      .select("id", { count: "exact", head: true })
      .eq("dealerId", dealerId)
      .neq("status", "CANCELLED")

    // --- Auction response rate: invitations vs offers actually submitted
    const { count: totalInvitations } = await supabase
      .from("AuctionParticipant")
      .select("id", { count: "exact", head: true })
      .eq("dealerId", dealerId)

    // --- Junk fee ratio from ContractShieldScan
    const { count: totalScans } = await supabase
      .from("ContractShieldScan")
      .select("id", { count: "exact", head: true })
      .eq("dealerId", dealerId)

    const { count: junkFlaggedScans } = await supabase
      .from("ContractShieldScan")
      .select("id", { count: "exact", head: true })
      .eq("dealerId", dealerId)
      .eq("junkFeesDetected", true)

    // --- Deal completion rate
    const { count: completedDeals } = await supabase
      .from("SelectedDeal")
      .select("id", { count: "exact", head: true })
      .eq("dealerId", dealerId)
      .eq("status", "COMPLETED")

    // --- 90-day trend (same metrics limited to last 90 days)
    const { count: offers90d } = await supabase
      .from("AuctionOffer")
      .select("id", { count: "exact", head: true })
      .eq("participantId", dealerId)
      .gte("createdAt", iso90)

    const { count: won90d } = await supabase
      .from("SelectedDeal")
      .select("id", { count: "exact", head: true })
      .eq("dealerId", dealerId)
      .neq("status", "CANCELLED")
      .gte("createdAt", iso90)

    const safeDiv = (num: number, den: number) =>
      den === 0 ? 0 : Math.round((num / den) * 100)

    const t = totalOffers ?? 0
    const w = wonDeals ?? 0
    const inv = totalInvitations ?? 0
    const scans = totalScans ?? 0
    const junk = junkFlaggedScans ?? 0
    const total = (wonDeals ?? 0) + (t ?? 0)
    const completed = completedDeals ?? 0
    const t90 = offers90d ?? 0
    const w90 = won90d ?? 0

    return NextResponse.json({
      success: true,
      data: {
        winRate: safeDiv(w, t),
        auctionResponseRate: safeDiv(t, inv),
        junkFeeRatio: safeDiv(junk, scans),
        dealCompletionRate: safeDiv(completed, w),
        trend90d: {
          winRate: safeDiv(w90, t90),
          offersSubmitted: t90,
          dealsWon: w90,
        },
        raw: {
          totalOffers: t,
          wonDeals: w,
          totalInvitations: inv,
          totalScans: scans,
          junkFlaggedScans: junk,
          completedDeals: completed,
        },
      },
    })
  } catch (error: unknown) {
    const errWithCode = error as { statusCode?: number }
    const status =
      errWithCode.statusCode && Number.isInteger(errWithCode.statusCode)
        ? errWithCode.statusCode
        : 500
    console.error("[Dealer Scorecard] Error:", error)
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Failed to load scorecard" },
      { status },
    )
  }
}
