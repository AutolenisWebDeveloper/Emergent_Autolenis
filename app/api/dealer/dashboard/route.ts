import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"

export const dynamic = "force-dynamic"

function getDefaultDashboardData() {
  return {
    success: true,
    activeAuctions: 0,
    awaitingBids: 0,
    pendingOffers: 0,
    completedDeals: 0,
    totalSales: 0,
    inventory: 0,
    pendingContracts: 0,
    upcomingPickups: 0,
    recentActivity: [],
    monthlyStats: {
      thisMonthDeals: 0,
      lastMonthDeals: 0,
      dealsChange: 0,
      revenue: 0,
    },
  }
}

export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])

    if (isTestWorkspace(user)) {
      return NextResponse.json(mockSelectors.dealerDashboard())
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const userId = user.userId
    if (!userId) {
      return NextResponse.json({ error: "Invalid user session" }, { status: 401 })
    }

    const { data: dealerUser, error: dealerUserError } = await supabase
      .from("DealerUser")
      .select("dealerId")
      .eq("userId", userId)
      .maybeSingle()

    if (dealerUserError) {
      console.error("[Dealer Dashboard] DealerUser error:", dealerUserError)
      return NextResponse.json(getDefaultDashboardData())
    }

    if (!dealerUser?.dealerId) {
      const { data: directDealer } = await supabase.from("Dealer").select("id").eq("userId", userId).maybeSingle()
      if (!directDealer) return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
      const stats = await getDealerDashboardStats(directDealer.id)
      return NextResponse.json({ success: true, ...stats })
    }

    const stats = await getDealerDashboardStats(dealerUser.dealerId)
    return NextResponse.json({ success: true, ...stats })
  } catch (error: any) {
    console.error("[Dealer Dashboard] Error:", error)
    const status = error?.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 500
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : "Failed to get dashboard" }, { status })
  }
}

async function getDealerDashboardStats(dealerId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  try {
    // 1) Determine invite scope (AuctionParticipant IDs + auctionIds)
    const invitesResult = await supabase
      .from("AuctionParticipant")
      .select("id, auctionId")
      .eq("dealerId", dealerId)

    const participantIds = (invitesResult.data || []).map((p: any) => p.id)
    const invitedAuctionIds = (invitesResult.data || []).map((p: any) => p.auctionId)

    // 2) Count OPEN invited auctions
    const openAuctionsResult =
      invitedAuctionIds.length > 0
        ? await supabase.from("Auction").select("id").in("id", invitedAuctionIds).eq("status", "OPEN")
        : { data: [] as any[] }

    const openAuctionIds = (openAuctionsResult.data || []).map((a: any) => a.id)
    const activeAuctions = openAuctionIds.length

    // 3) Offers must be counted by participantId IN (AuctionParticipant.id)
    const pendingOffersResult =
      participantIds.length > 0
        ? await supabase.from("AuctionOffer").select("id", { count: "exact", head: true }).in("participantId", participantIds)
        : ({ count: 0 } as any)

    // 4) Contracts pending: ContractShieldScan statuses (ContractDocument has no status)
    const pendingContractsResult = await supabase
      .from("ContractShieldScan")
      .select("id", { count: "exact", head: true })
      .eq("dealerId", dealerId)
      .in("status", ["UPLOADED", "SCANNING", "ISSUES_FOUND"])

    const [
      completedDealsResult,
      totalSalesResult,
      inventoryResult,
      upcomingPickupsResult,
      recentDealsResult,
      thisMonthDealsResult,
      lastMonthDealsResult,
      thisMonthRevenueResult,
    ] = await Promise.all([
      supabase
        .from("SelectedDeal")
        .select("id", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("status", "COMPLETED"),

      supabase.from("SelectedDeal").select("id", { count: "exact", head: true }).eq("dealerId", dealerId),

      supabase.from("InventoryItem").select("id", { count: "exact", head: true }).eq("dealerId", dealerId),

      supabase
        .from("PickupAppointment")
        .select("id", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("status", "SCHEDULED")
        .gte("scheduledDate", now.toISOString()),

      supabase
        .from("SelectedDeal")
        .select("id, status, cashOtd, createdAt, buyerId, inventoryItemId")
        .eq("dealerId", dealerId)
        .order("createdAt", { ascending: false })
        .limit(10),

      supabase
        .from("SelectedDeal")
        .select("id", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("status", "COMPLETED")
        .gte("createdAt", startOfMonth.toISOString()),

      supabase
        .from("SelectedDeal")
        .select("id", { count: "exact", head: true })
        .eq("dealerId", dealerId)
        .eq("status", "COMPLETED")
        .gte("createdAt", lastMonth.toISOString())
        .lte("createdAt", endOfLastMonth.toISOString()),

      supabase
        .from("SelectedDeal")
        .select("cashOtd")
        .eq("dealerId", dealerId)
        .eq("status", "COMPLETED")
        .gte("createdAt", startOfMonth.toISOString()),
    ])

    // awaitingBids = open invites where the dealer has not submitted an offer
    let awaitingBids = 0
    if (openAuctionIds.length > 0 && participantIds.length > 0) {
      const openParticipantIds = (invitesResult.data || [])
        .filter((p: any) => openAuctionIds.includes(p.auctionId))
        .map((p: any) => p.id)

      if (openParticipantIds.length > 0) {
        const { data: openOffers } = await supabase
          .from("AuctionOffer")
          .select("participantId")
          .in("participantId", openParticipantIds)

        const offered = new Set((openOffers || []).map((o: any) => o.participantId))
        awaitingBids = openParticipantIds.filter((id: string) => !offered.has(id)).length
      }
    }

    // recent activity hydration
    let recentActivity: any[] = []
    if (recentDealsResult.data && recentDealsResult.data.length > 0) {
      const deals = recentDealsResult.data
      const buyerIds = [...new Set(deals.map((d: any) => d.buyerId).filter(Boolean))]
      const inventoryIds = [...new Set(deals.map((d: any) => d.inventoryItemId).filter(Boolean))]

      const [buyersResult, invResult] = await Promise.all([
        buyerIds.length > 0 ? supabase.from("BuyerProfile").select("id, firstName, lastName").in("id", buyerIds) : { data: [] },
        inventoryIds.length > 0 ? supabase.from("InventoryItem").select("id, priceCents, vin, year, make, model, trim").in("id", inventoryIds) : { data: [] },
      ])

      const buyersMap = (buyersResult.data || []).reduce((acc: any, b: any) => ({ ...acc, [b.id]: { firstName: b.firstName, lastName: b.lastName } }), {})
      const invMap = (invResult.data || []).reduce((acc: any, i: any) => ({ ...acc, [i.id]: { id: i.id, priceCents: i.priceCents, vehicle: { year: i.year, make: i.make, model: i.model, trim: i.trim, vin: i.vin } } }), {})

      recentActivity = deals.map((deal: any) => ({
        id: deal.id,
        status: deal.status,
        cashOtd: deal.cashOtd,
        createdAt: deal.createdAt,
        buyer: buyersMap[deal.buyerId] || null,
        inventoryItem: deal.inventoryItemId ? invMap[deal.inventoryItemId] || null : null,
      }))
    }

    const pendingOffers = pendingOffersResult.count || 0
    const completedDeals = completedDealsResult.count || 0
    const totalSales = totalSalesResult.count || 0
    const inventory = inventoryResult.count || 0
    const pendingContracts = pendingContractsResult.count || 0
    const upcomingPickups = upcomingPickupsResult.count || 0

    const thisMonthDeals = thisMonthDealsResult.count || 0
    const lastMonthDeals = lastMonthDealsResult.count || 0
    const revenue = (thisMonthRevenueResult.data || []).reduce((sum: number, deal: any) => sum + (deal.cashOtd || 0), 0)
    const dealsChange = lastMonthDeals > 0 ? ((thisMonthDeals - lastMonthDeals) / lastMonthDeals) * 100 : 0

    return {
      activeAuctions,
      awaitingBids,
      pendingOffers,
      completedDeals,
      totalSales,
      inventory,
      pendingContracts,
      upcomingPickups,
      recentActivity,
      monthlyStats: {
        thisMonthDeals,
        lastMonthDeals,
        dealsChange,
        revenue,
      },
    }
  } catch (error) {
    console.error("[Dealer Dashboard] Stats error:", error)
    return {
      activeAuctions: 0,
      awaitingBids: 0,
      pendingOffers: 0,
      completedDeals: 0,
      totalSales: 0,
      inventory: 0,
      pendingContracts: 0,
      upcomingPickups: 0,
      recentActivity: [],
      monthlyStats: {
        thisMonthDeals: 0,
        lastMonthDeals: 0,
        dealsChange: 0,
        revenue: 0,
      },
    }
  }
}
