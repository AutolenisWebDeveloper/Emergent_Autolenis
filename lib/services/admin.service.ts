import { supabase } from "@/lib/db"
import { SOURCING_TABLES } from "@/lib/services/sourcing.service"
import {
  AuctionStatus,
  DealStatus,
  PaymentStatus,
  PayoutStatus,
  BuyerCaseStatus,
  ACTIVE_CASE_STATUSES,
} from "@/lib/constants/statuses"

/**
 * Conditionally append .eq("workspaceId", wsId) when a workspaceId is provided.
 * Routes enforce fail-closed (403 when workspace_id missing); services provide
 * defense-in-depth by filtering when a workspaceId is supplied.
 */
function wsEq(query: any, workspaceId?: string) {
  return workspaceId ? query.eq("workspaceId", workspaceId) : query
}

export class AdminService {
  async getDashboardStats(workspaceId?: string) {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Run all queries in parallel
    const [
      buyersResult,
      activeBuyersResult,
      dealersResult,
      activeDealersResult,
      activeAuctionsResult,
      auctionsLast30Result,
      completedDealsResult,
      dealsLast30Result,
      revenueResult,
      revenueLast30Result,
      pendingDepositsResult,
      affiliatePayoutsResult,
      affiliatePayoutsLast30Result,
      sourcingPendingResult,
      sourcingActiveResult,
    ] = await Promise.all([
      wsEq(supabase.from("User").select("id", { count: "exact", head: true }).eq("role", "BUYER"), workspaceId),
      wsEq(supabase
        .from("User")
        .select("id", { count: "exact", head: true })
        .eq("role", "BUYER")
        .gte("updatedAt", thirtyDaysAgo.toISOString()), workspaceId),
      wsEq(supabase.from("Dealer").select("id", { count: "exact", head: true }), workspaceId),
      wsEq(supabase.from("Dealer").select("id", { count: "exact", head: true }).eq("active", true), workspaceId),
      wsEq(supabase.from("Auction").select("id", { count: "exact", head: true }).eq("status", AuctionStatus.ACTIVE), workspaceId),
      wsEq(supabase
        .from("Auction")
        .select("id", { count: "exact", head: true })
        .gte("createdAt", thirtyDaysAgo.toISOString()), workspaceId),
      wsEq(supabase.from("SelectedDeal").select("id", { count: "exact", head: true }).eq("status", DealStatus.COMPLETED), workspaceId),
      wsEq(supabase
        .from("SelectedDeal")
        .select("id", { count: "exact", head: true })
        .eq("status", DealStatus.COMPLETED)
        .gte("createdAt", thirtyDaysAgo.toISOString()), workspaceId),
      wsEq(supabase.from("ServiceFeePayment").select("amount").eq("status", PaymentStatus.SUCCEEDED), workspaceId),
      wsEq(supabase
        .from("ServiceFeePayment")
        .select("amount")
        .eq("status", PaymentStatus.SUCCEEDED)
        .gte("createdAt", thirtyDaysAgo.toISOString()), workspaceId),
      wsEq(supabase.from("DepositPayment").select("id", { count: "exact", head: true }).eq("status", PaymentStatus.PENDING), workspaceId),
      wsEq(supabase.from("Payout").select("amount").eq("status", PayoutStatus.COMPLETED), workspaceId),
      wsEq(supabase
        .from("Payout")
        .select("amount")
        .eq("status", PayoutStatus.COMPLETED)
        .gte("paidAt", thirtyDaysAgo.toISOString()), workspaceId),
      wsEq(supabase
        .from(SOURCING_TABLES.CASES)
        .select("id", { count: "exact", head: true })
        .in("status", [BuyerCaseStatus.SUBMITTED]), workspaceId),
      wsEq(supabase
        .from(SOURCING_TABLES.CASES)
        .select("id", { count: "exact", head: true })
        .in("status", [...ACTIVE_CASE_STATUSES]), workspaceId),
    ])

    // Calculate revenue sums
    const totalRevenue =
      revenueResult.data?.reduce((sum: number, r: any) => sum + (r.amount || 0), 0) || 0
    const revenueLast30Days =
      revenueLast30Result.data?.reduce((sum: number, r: any) => sum + (r.amount || 0), 0) || 0
    const totalAffiliatePayouts =
      affiliatePayoutsResult.data?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
    const affiliatePayoutsLast30Days =
      affiliatePayoutsLast30Result.data?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0

    return {
      totalBuyers: buyersResult.count || 0,
      activeBuyers: activeBuyersResult.count || 0,
      totalDealers: dealersResult.count || 0,
      activeDealers: activeDealersResult.count || 0,
      activeAuctions: activeAuctionsResult.count || 0,
      auctionsLast30Days: auctionsLast30Result.count || 0,
      completedDeals: completedDealsResult.count || 0,
      dealsLast30Days: dealsLast30Result.count || 0,
      totalRevenue,
      revenueLast30Days,
      pendingDeposits: pendingDepositsResult.count || 0,
      totalAffiliatePayouts,
      affiliatePayoutsLast30Days,
      sourcingPending: sourcingPendingResult.count || 0,
      sourcingActive: sourcingActiveResult.count || 0,
    }
  }

  async getFunnelData(workspaceId?: string) {
    const [
      signupsResult,
      preQualsResult,
      shortlistsResult,
      auctionsResult,
      dealsSelectedResult,
      feesPaidResult,
      completedResult,
    ] = await Promise.all([
      wsEq(supabase.from("User").select("id", { count: "exact", head: true }).eq("role", "BUYER"), workspaceId),
      wsEq(supabase.from("PreQualification").select("id", { count: "exact", head: true }), workspaceId),
      wsEq(supabase.from("Shortlist").select("id", { count: "exact", head: true }), workspaceId),
      wsEq(supabase.from("Auction").select("id", { count: "exact", head: true }), workspaceId),
      wsEq(supabase.from("SelectedDeal").select("id", { count: "exact", head: true }), workspaceId),
      wsEq(supabase.from("ServiceFeePayment").select("id", { count: "exact", head: true }).eq("status", PaymentStatus.SUCCEEDED), workspaceId),
      wsEq(supabase.from("SelectedDeal").select("id", { count: "exact", head: true }).eq("status", DealStatus.COMPLETED), workspaceId),
    ])

    return {
      signups: signupsResult.count || 0,
      preQuals: preQualsResult.count || 0,
      shortlists: shortlistsResult.count || 0,
      auctions: auctionsResult.count || 0,
      dealsSelected: dealsSelectedResult.count || 0,
      feesPaid: feesPaidResult.count || 0,
      completed: completedResult.count || 0,
    }
  }

  async getTopDealers(limit = 10, workspaceId?: string) {
    let dealerQuery = supabase
      .from("Dealer")
      .select("id, name, businessName, integrityScore")
      .order("integrityScore", { ascending: false })
      .limit(limit)

    if (workspaceId) dealerQuery = dealerQuery.eq("workspaceId", workspaceId)

    const { data: dealers, error } = await dealerQuery

    if (error || !dealers) {
      console.error("[AdminService] Error fetching top dealers:", error)
      return []
    }

    // Get offer and deal counts for each dealer
    const dealerIds = dealers.map((d) => d.id)
    
    const [offersResult, dealsResult] = await Promise.all([
      supabase.from("AuctionOffer").select("dealerId").in("dealerId", dealerIds),
      supabase.from("SelectedDeal").select("dealerId").in("dealerId", dealerIds),
    ])

    const offerCounts: Record<string, number> = {}
    const dealCounts: Record<string, number> = {}

    offersResult.data?.forEach((o) => {
      offerCounts[o.dealerId] = (offerCounts[o.dealerId] || 0) + 1
    })
    dealsResult.data?.forEach((d) => {
      dealCounts[d.dealerId] = (dealCounts[d.dealerId] || 0) + 1
    })

    return dealers.map((dealer) => ({
      id: dealer.id,
      name: dealer.name || dealer.businessName || "Unknown",
      integrityScore: dealer.integrityScore || 0,
      totalOffers: offerCounts[dealer.id || ""] || 0,
      wonDeals: dealCounts[dealer.id || ""] || 0,
      winRate:
        offerCounts[dealer.id || ""] > 0
          ? (((dealCounts[dealer.id || ""] || 0) / offerCounts[dealer.id || ""]) * 100).toFixed(1)
          : "0",
    }))
  }

  async getTopAffiliates(limit = 10, workspaceId?: string) {
    let affQuery = supabase
      .from("Affiliate")
      .select(`
        id, 
        firstName, 
        lastName, 
        userId,
        totalEarnings, 
        pendingEarnings,
        user:User(email)
      `)
      .order("totalEarnings", { ascending: false })
      .limit(limit)

    if (workspaceId) affQuery = affQuery.eq("workspaceId", workspaceId)

    const { data: affiliates, error } = await affQuery

    if (error || !affiliates) {
      console.error("[AdminService] Error fetching top affiliates:", error)
      return []
    }

    // Get referral and click counts
    const affiliateIds = affiliates.map((a) => a.id)

    const [referralsResult, clicksResult] = await Promise.all([
      supabase.from("Referral").select("affiliateId").in("affiliateId", affiliateIds),
      supabase.from("Click").select("affiliateId").in("affiliateId", affiliateIds),
    ])

    const referralCounts: Record<string, number> = {}
    const clickCounts: Record<string, number> = {}

    referralsResult.data?.forEach((r) => {
      referralCounts[r.affiliateId] = (referralCounts[r.affiliateId] || 0) + 1
    })
    clicksResult.data?.forEach((c) => {
      clickCounts[c.affiliateId] = (clickCounts[c.affiliateId] || 0) + 1
    })

    return affiliates.map((a) => {
      const user = a.user as unknown as { email: string } | null
      return {
        id: a.id,
        name: `${a.firstName || ""} ${a.lastName || ""}`.trim() || user?.email || "Unknown",
        email: user?.email || "",
        totalClicks: clickCounts[a.id] || 0,
        totalReferrals: referralCounts[a.id] || 0,
        totalEarnings: a.totalEarnings || 0,
        pendingEarnings: a.pendingEarnings || 0,
      }
    })
  }

  async getAllBuyers(filters?: {
    search?: string
    hasPreQual?: boolean
    hasActiveAuction?: boolean
    hasCompletedDeal?: boolean
    page?: number
    limit?: number
    workspaceId?: string
  }) {
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const offset = (page - 1) * limit

    let query = supabase
      .from("User")
      .select(
        `
        id, 
        email, 
        role, 
        first_name,
        last_name,
        createdAt,
        BuyerProfile(id, firstName, lastName, phone),
        PreQualification(id, status),
        Affiliate(id)
      `,
        { count: "exact" }
      )
      .eq("role", "BUYER")

    if (filters?.workspaceId) {
      query = query.eq("workspaceId", filters.workspaceId)
    }

    if (filters?.search) {
      query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`)
    }

    query = query.order("createdAt", { ascending: false }).range(offset, offset + limit - 1)

    const { data: buyers, count, error } = await query

    if (error) {
      console.error("[AdminService] Error fetching buyers:", error)
      return { buyers: [], total: 0, page, totalPages: 0 }
    }

    return {
      buyers: (buyers || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        firstName: u.BuyerProfile?.[0]?.firstName || u.first_name || "",
        lastName: u.BuyerProfile?.[0]?.lastName || u.last_name || "",
        phone: u.BuyerProfile?.[0]?.phone || "",
        role: u.role,
        profileComplete: !!u.BuyerProfile?.[0],
        isAffiliate: !!u.Affiliate?.[0],
        hasPreQual: !!u.PreQualification?.[0],
        preQualStatus: u.PreQualification?.[0]?.status || null,
        createdAt: u.createdAt,
      })),
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    }
  }

  async getBuyerDetail(userId: string, workspaceId?: string) {
    let query = supabase
      .from("User")
      .select(
        `
        id, 
        email, 
        role, 
        createdAt,
        BuyerProfile(id, firstName, lastName, phone),
        PreQualification(*),
        Affiliate(*)
      `
      )
      .eq("id", userId)

    if (workspaceId) query = query.eq("workspaceId", workspaceId)

    const { data: user, error } = await query.single()

    if (error) {
      console.error("[AdminService] Error fetching buyer detail:", error)
      return null
    }

    return user
  }

  async getAllDealers(filters?: {
    search?: string
    status?: "all" | "active" | "inactive" | "pending"
    page?: number
    limit?: number
    workspaceId?: string
  }) {
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const offset = (page - 1) * limit

    // Query from User table to ensure ALL dealer-role users appear,
    // even those without a Dealer profile row.
    let query = supabase
      .from("User")
      .select(
        `
        id, email, first_name, last_name, role, createdAt, workspaceId,
        dealerProfile:Dealer(
          id, businessName, email, city, state, verified, active, integrityScore, createdAt
        )
      `,
        { count: "exact" }
      )
      .eq("role", "DEALER")
      .order("createdAt", { ascending: false })

    if (filters?.workspaceId) {
      query = query.eq("workspaceId", filters.workspaceId)
    }

    if (filters?.search) {
      query = query.or(
        `email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`
      )
    }

    const { data: users, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error("[AdminService] Error fetching dealers:", error)
      return { dealers: [], total: 0, page, totalPages: 0 }
    }

    // Extract dealer profile IDs for count queries
    const getProfile = (u: any) => Array.isArray(u.dealerProfile) ? u.dealerProfile[0] : u.dealerProfile
    const dealerIds = (users || []).map((u: any) => getProfile(u)?.id).filter(Boolean) as string[]

    const [inventoryResult, offersResult, dealsResult] = dealerIds.length > 0
      ? await Promise.all([
          supabase.from("InventoryItem").select("dealerId").in("dealerId", dealerIds),
          supabase.from("AuctionOffer").select("dealerId").in("dealerId", dealerIds),
          supabase.from("SelectedDeal").select("dealerId").in("dealerId", dealerIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }]

    const inventoryCounts: Record<string, number> = {}
    const offerCounts: Record<string, number> = {}
    const dealCounts: Record<string, number> = {}

    inventoryResult.data?.forEach((i: any) => {
      inventoryCounts[i.dealerId] = (inventoryCounts[i.dealerId] || 0) + 1
    })
    offersResult.data?.forEach((o: any) => {
      offerCounts[o.dealerId] = (offerCounts[o.dealerId] || 0) + 1
    })
    dealsResult.data?.forEach((d: any) => {
      dealCounts[d.dealerId] = (dealCounts[d.dealerId] || 0) + 1
    })

    return {
      dealers: (users || []).map((u: any) => {
        const dp = getProfile(u)
        const hasProfile = !!dp
        const dealerId = dp?.id || ""
        return {
          id: dp?.id || u.id,
          userId: u.id,
          name: dp?.businessName || u.email || "Unknown",
          email: dp?.email || u.email || "",
          city: dp?.city || "",
          state: dp?.state || "",
          verified: dp?.verified || false,
          active: dp?.active || false,
          integrityScore: dp?.integrityScore || 0,
          profileComplete: hasProfile,
          inventoryCount: inventoryCounts[dealerId] || 0,
          offersCount: offerCounts[dealerId] || 0,
          dealsCount: dealCounts[dealerId] || 0,
          winRate:
            offerCounts[dealerId] > 0
              ? (((dealCounts[dealerId] || 0) / offerCounts[dealerId]) * 100).toFixed(1)
              : "0",
          createdAt: u.createdAt,
        }
      }),
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    }
  }

  async getAllAuctions(filters?: { status?: string; page?: number; limit?: number; workspaceId?: string }) {
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const offset = (page - 1) * limit

    let query = supabase
      .from("Auction")
      .select("id, buyerId, status, startsAt, endsAt, closedAt, createdAt", { count: "exact" })
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status)
    }

    if (filters?.workspaceId) {
      query = query.eq("workspaceId", filters.workspaceId)
    }

    const { data: auctions, count, error } = await query

    if (error) {
      console.error("[AdminService] Error fetching auctions:", error)
      return { auctions: [], total: 0, page, totalPages: 0 }
    }

    // Get buyer info and counts
    const buyerIds = [...new Set((auctions || []).map((a) => a.buyerId).filter(Boolean))]
    const auctionIds = (auctions || []).map((a) => a.id)

    const [buyersResult, participantsResult, offersResult] = await Promise.all([
      buyerIds.length > 0
        ? supabase
            .from("BuyerProfile")
            .select("userId, firstName, lastName")
            .in("userId", buyerIds)
        : { data: [] },
      supabase.from("AuctionParticipant").select("auctionId").in("auctionId", auctionIds),
      supabase.from("AuctionOffer").select("auctionId").in("auctionId", auctionIds),
    ])

    const buyerMap: Record<string, { firstName: string; lastName: string }> = {}
    buyersResult.data?.forEach((b) => {
      buyerMap[b.userId] = { firstName: b.firstName || "", lastName: b.lastName || "" }
    })

    const participantCounts: Record<string, number> = {}
    const offerCounts: Record<string, number> = {}

    participantsResult.data?.forEach((p) => {
      participantCounts[p.auctionId] = (participantCounts[p.auctionId] || 0) + 1
    })
    offersResult.data?.forEach((o) => {
      offerCounts[o.auctionId] = (offerCounts[o.auctionId] || 0) + 1
    })

    return {
      auctions: (auctions || []).map((a) => {
        const buyer = buyerMap[a.buyerId] || ({} as any)
        return {
          id: a.id,
          buyerName: `${buyer.firstName || ""} ${buyer.lastName || ""}`.trim() || "Unknown",
          buyerEmail: "",
          status: a.status,
          startsAt: a.startsAt,
          endsAt: a.endsAt,
          closedAt: a.closedAt,
          dealersInvited: participantCounts[a.id] || 0,
          offersReceived: offerCounts[a.id] || 0,
          vehicleCount: 0,
          createdAt: a.createdAt,
        }
      }),
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    }
  }

  async getAllDeals(filters?: {
    search?: string
    status?: string
    startDate?: Date
    endDate?: Date
    page?: number
    limit?: number
    workspaceId?: string
  }) {
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const offset = (page - 1) * limit

    let query = supabase
      .from("SelectedDeal")
      .select("id, buyerId, dealerId, status, cashOtd, totalOtdAmountCents, createdAt, updatedAt", {
        count: "exact",
      })
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status)
    }
    if (filters?.search) {
      query = query.or(`id.ilike.%${filters.search}%,status.ilike.%${filters.search}%`)
    }
    if (filters?.startDate) {
      query = query.gte("createdAt", filters.startDate.toISOString())
    }
    if (filters?.endDate) {
      query = query.lte("createdAt", filters.endDate.toISOString())
    }
    if (filters?.workspaceId) {
      query = query.eq("workspaceId", filters.workspaceId)
    }

    const { data: deals, count, error } = await query

    if (error) {
      console.error("[AdminService] Error fetching deals:", error)
      return { deals: [], total: 0, page, totalPages: 0 }
    }

    // Get related data
    const buyerIds = [...new Set((deals || []).map((d) => d.buyerId).filter(Boolean))]
    const dealerIds = [...new Set((deals || []).map((d) => d.dealerId).filter(Boolean))]

    const [buyersResult, dealersResult] = await Promise.all([
      buyerIds.length > 0
        ? supabase.from("BuyerProfile").select("userId, firstName, lastName").in("userId", buyerIds)
        : { data: [] },
      dealerIds.length > 0
        ? supabase.from("Dealer").select("id, name, businessName").in("id", dealerIds)
        : { data: [] },
    ])

    const buyerMap: Record<string, { firstName: string; lastName: string }> = {}
    const dealerMap: Record<string, { name: string; businessName: string }> = {}

    buyersResult.data?.forEach((b) => {
      buyerMap[b.userId] = { firstName: b.firstName || "", lastName: b.lastName || "" }
    })
    dealersResult.data?.forEach((d) => {
      dealerMap[d.id] = { name: d.name || "", businessName: d.businessName || "" }
    })

    return {
      deals: (deals || []).map((d) => {
        const buyer = buyerMap[d.buyerId] || ({} as any)
        const dealer = dealerMap[d.dealerId] || ({} as any)
        return {
          id: d.id,
          buyerName: `${buyer.firstName || ""} ${buyer.lastName || ""}`.trim() || "Unknown",
          buyerEmail: "",
          dealerName: dealer.name || dealer.businessName || "Unknown",
          vehicle: "Unknown",
          otdAmount: d.cashOtd || d.totalOtdAmountCents ? (d.totalOtdAmountCents || 0) / 100 : 0,
          status: d.status,
          depositStatus: null,
          feeStatus: null,
          esignStatus: null,
          contractShieldStatus: null,
          pickupStatus: null,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        }
      }),
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    }
  }

  async getAllPayments(filters?: {
    type?: "deposit" | "fee" | "all"
    status?: string
    search?: string
    page?: number
    limit?: number
    workspaceId?: string
  }) {
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const offset = (page - 1) * limit

    let deposits: any[] = []
    let fees: any[] = []
    let depositTotal = 0
    let feeTotal = 0

    if (!filters?.type || filters.type === "all" || filters.type === "deposit") {
      let depositQuery = supabase
        .from("DepositPayment")
        .select("id, buyerId, amount, amountCents, status, stripePaymentIntentId, createdAt, refundedAt", {
          count: "exact",
        })
        .order("createdAt", { ascending: false })

      if (filters?.type === "deposit") {
        depositQuery = depositQuery.range(offset, offset + limit - 1)
      } else {
        depositQuery = depositQuery.limit(25)
      }

      if (filters?.status && filters.status !== "all") {
        depositQuery = depositQuery.eq("status", filters.status)
      }

      if (filters?.search) {
        depositQuery = depositQuery.or(`id.ilike.%${filters.search}%,status.ilike.%${filters.search}%`)
      }

      if (filters?.workspaceId) {
        depositQuery = depositQuery.eq("workspaceId", filters.workspaceId)
      }

      const { data, count } = await depositQuery
      deposits = data || []
      depositTotal = count || 0
    }

    if (!filters?.type || filters.type === "all" || filters.type === "fee") {
      let feeQuery = supabase
        .from("ServiceFeePayment")
        .select(
          "id, dealId, amount, baseFeeCents, depositAppliedCents, remainingCents, method, status, stripePaymentIntentId, createdAt, refundedAt",
          { count: "exact" }
        )
        .order("createdAt", { ascending: false })

      if (filters?.type === "fee") {
        feeQuery = feeQuery.range(offset, offset + limit - 1)
      } else {
        feeQuery = feeQuery.limit(25)
      }

      if (filters?.status && filters.status !== "all") {
        feeQuery = feeQuery.eq("status", filters.status)
      }

      if (filters?.search) {
        feeQuery = feeQuery.or(`id.ilike.%${filters.search}%,status.ilike.%${filters.search}%`)
      }

      if (filters?.workspaceId) {
        feeQuery = feeQuery.eq("workspaceId", filters.workspaceId)
      }

      const { data, count } = await feeQuery
      fees = data || []
      feeTotal = count || 0
    }

    return {
      deposits: deposits.map((d) => ({
        id: d.id,
        type: "DEPOSIT",
        buyerName: "Unknown",
        amount: d.amount || (d.amountCents ? d.amountCents / 100 : 99),
        status: d.status,
        provider: "stripe",
        providerRef: d.stripePaymentIntentId || "",
        createdAt: d.createdAt,
        refundedAt: d.refundedAt,
      })),
      fees: fees.map((f) => ({
        id: f.id,
        type: "SERVICE_FEE",
        dealId: f.dealId,
        buyerName: "Unknown",
        baseFee: f.baseFeeCents ? f.baseFeeCents / 100 : f.amount || 0,
        depositApplied: f.depositAppliedCents ? f.depositAppliedCents / 100 : 0,
        remaining: f.remainingCents ? f.remainingCents / 100 : f.amount || 0,
        method: f.method || "card",
        status: f.status,
        provider: "stripe",
        providerRef: f.stripePaymentIntentId || "",
        createdAt: f.createdAt,
        refundedAt: f.refundedAt,
      })),
      depositTotal,
      feeTotal,
      page,
    }
  }

  async getAllAffiliates(filters?: { search?: string; page?: number; limit?: number; workspaceId?: string }) {
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const offset = (page - 1) * limit

    let query = supabase
      .from("Affiliate")
      .select(
        `
        id, 
        userId, 
        firstName, 
        lastName, 
        referralCode,
        totalEarnings, 
        pendingEarnings, 
        createdAt,
        user:User(email)
      `,
        { count: "exact" }
      )
      .order("totalEarnings", { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters?.search) {
      query = query.or(`firstName.ilike.%${filters.search}%,lastName.ilike.%${filters.search}%`)
    }

    if (filters?.workspaceId) {
      query = query.eq("workspaceId", filters.workspaceId)
    }

    const { data: affiliates, count, error } = await query

    if (error) {
      console.error("[AdminService] Error fetching affiliates:", error)
      return { affiliates: [], total: 0, page, totalPages: 0 }
    }

    // Get referral and click counts
    const affiliateIds = (affiliates || []).map((a) => a.id)

    const [referralsResult, clicksResult, payoutsResult] = await Promise.all([
      supabase.from("Referral").select("affiliateId, level").in("affiliateId", affiliateIds),
      supabase.from("Click").select("affiliateId").in("affiliateId", affiliateIds),
      supabase.from("Payout").select("affiliateId, amount").in("affiliateId", affiliateIds),
    ])

    const referralsByLevel: Record<string, Record<number, number>> = {}
    const clickCounts: Record<string, number> = {}
    const payoutTotals: Record<string, number> = {}

    referralsResult.data?.forEach((r: any) => {
      if (!referralsByLevel[r.affiliateId || ""]) referralsByLevel[r.affiliateId || ""] = {}
      referralsByLevel[r.affiliateId || ""][r.level || 0] =
        (referralsByLevel[r.affiliateId || ""][r.level || 0] || 0) + 1
    })
    clicksResult.data?.forEach((c: any) => {
      clickCounts[c.affiliateId || ""] = (clickCounts[c.affiliateId || ""] || 0) + 1
    })
    payoutsResult.data?.forEach((p: any) => {
      payoutTotals[p.affiliateId || ""] = (payoutTotals[p.affiliateId || ""] || 0) + (p.amount || 0)
    })

    return {
      affiliates: (affiliates || []).map((a) => {
        const user = a.user as unknown as { email: string } | null
        const levels = referralsByLevel[a.id] || {}
        return {
          id: a.id,
          name: `${a.firstName || ""} ${a.lastName || ""}`.trim() || user?.email || "Unknown",
          email: user?.email || "",
          refCode: a.referralCode || "",
          totalClicks: clickCounts[a.id] || 0,
          level1Referrals: levels[1] || 0,
          level2Referrals: levels[2] || 0,
          level3Referrals: levels[3] || 0,
          totalEarnings: a.totalEarnings || 0,
          pendingEarnings: a.pendingEarnings || 0,
          totalPayouts: payoutTotals[a.id] || 0,
          createdAt: a.createdAt,
        }
      }),
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    }
  }

  async getComplianceEvents(filters?: {
    type?: string
    severity?: string
    userId?: string
    startDate?: Date
    page?: number
    limit?: number
    workspaceId?: string
  }) {
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const offset = (page - 1) * limit

    let query = supabase
      .from("ComplianceEvent")
      .select("id, type, severity, userId, details, ipAddress, resolved, resolvedAt, resolvedBy, createdAt", {
        count: "exact",
      })
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters?.type && filters.type !== "all") {
      query = query.eq("type", filters.type)
    }
    if (filters?.severity && filters.severity !== "all") {
      query = query.eq("severity", filters.severity)
    }
    if (filters?.userId) {
      query = query.eq("userId", filters.userId)
    }
    if (filters?.startDate) {
      query = query.gte("createdAt", filters.startDate.toISOString())
    }
    if (filters?.workspaceId) {
      query = query.eq("workspaceId", filters.workspaceId)
    }

    const { data: events, count, error } = await query

    if (error) {
      console.error("[AdminService] Error fetching compliance events:", error)
      return { events: [], total: 0, page, totalPages: 0 }
    }

    return {
      events: (events || []).map((e) => ({
        id: e.id,
        type: e.type || "UNKNOWN",
        severity: e.severity || "INFO",
        userId: e.userId,
        userEmail: "",
        details: e.details || {},
        ipAddress: e.ipAddress || "",
        resolved: e.resolved || false,
        resolvedAt: e.resolvedAt,
        resolvedBy: e.resolvedBy,
        createdAt: e.createdAt,
      })),
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    }
  }

  async getContractShieldScans(filters?: { status?: string; page?: number; limit?: number; workspaceId?: string }) {
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const offset = (page - 1) * limit

    let query = supabase
      .from("ContractShieldScan")
      .select(
        "id, selectedDealId, status, overallScore, issuesCount, aprMatch, otdMatch, paymentMatch, junkFeesDetected, scannedAt",
        { count: "exact" }
      )
      .order("scannedAt", { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status)
    }
    if (filters?.workspaceId) {
      query = query.eq("workspaceId", filters.workspaceId)
    }

    const { data: scans, count, error } = await query

    if (error) {
      console.error("[AdminService] Error fetching contract shield scans:", error)
      return { scans: [], total: 0, page, totalPages: 0 }
    }

    return {
      scans: (scans || []).map((s) => ({
        id: s.id,
        dealId: s.selectedDealId,
        buyerName: "Unknown",
        dealerName: "Unknown",
        status: s.status,
        overallScore: s.overallScore || 0,
        issuesCount: s.issuesCount || 0,
        aprMatch: s.aprMatch,
        otdMatch: s.otdMatch,
        paymentMatch: s.paymentMatch,
        junkFeesDetected: s.junkFeesDetected,
        issues: [],
        scannedAt: s.scannedAt,
      })),
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    }
  }

  async getInsuranceData(filters?: { type?: string; page?: number; limit?: number; workspaceId?: string }) {
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const offset = (page - 1) * limit

    const [quotesResult, policiesResult] = await Promise.all([
      wsEq(supabase
        .from("InsuranceQuote")
        .select("id, buyerId, carrier, productName, monthlyPremium, monthlyPremiumCents, expiresAt, createdAt")
        .order("createdAt", { ascending: false })
        .limit(25), filters?.workspaceId),
      wsEq(supabase
        .from("InsurancePolicy")
        .select(
          "id, type, carrier, policyNumber, status, effectiveDate, expirationDate, monthlyPremium, documentUrl, createdAt",
          { count: "exact" }
        )
        .order("createdAt", { ascending: false })
        .range(offset, offset + limit - 1), filters?.workspaceId),
    ])

    return {
      quotes: (quotesResult.data || []).map((q: any) => ({
        id: q.id,
        buyerName: "Unknown",
        carrier: q.carrier || "Unknown",
        productName: q.productName || "",
        monthlyPremium: q.monthlyPremium || (q.monthlyPremiumCents ? q.monthlyPremiumCents / 100 : 0),
        vehicle: "Unknown",
        expiresAt: q.expiresAt,
        createdAt: q.createdAt,
      })),
      policies: (policiesResult.data || []).map((p: any) => ({
        id: p.id,
        buyerName: "Unknown",
        type: p.type,
        carrier: p.carrier || "Unknown",
        policyNumber: p.policyNumber || "",
        status: p.status,
        effectiveDate: p.effectiveDate,
        expirationDate: p.expirationDate,
        monthlyPremium: p.monthlyPremium || 0,
        documentUrl: p.documentUrl || "",
        createdAt: p.createdAt,
      })),
      quotesTotal: quotesResult.data?.length || 0,
      policiesTotal: policiesResult.count || 0,
      page,
      totalPages: Math.ceil((policiesResult.count || 0) / limit),
    }
  }

  async getSystemSettings() {
    const { data: settings } = await supabase.from("AdminSettings").select("key, value, valueJson")

    const settingsMap: Record<string, any> = {}
    settings?.forEach((s) => {
      settingsMap[s.key] = s.valueJson || s.value || null
    })

    return {
      depositAmount: settingsMap['deposit_amount'] || 99,
      // V2: flat $499 Premium fee. Legacy tier settings kept for backward compatibility;
      // live payment routes use PREMIUM_FEE from lib/constants.ts directly.
      feeTierOneCents: settingsMap['fee_tier_one_cents'] || 49900,
      feeTierTwoCents: settingsMap['fee_tier_two_cents'] || 49900, // V2: same as tier one ($499)
      feeThresholdCents: settingsMap['fee_threshold_cents'] || 3500000,
      auctionDurationHours: settingsMap['auction_duration_hours'] || 48,
      depositGracePeriodHours: settingsMap['deposit_grace_period_hours'] || 24,
      feeFinancingEnabled: settingsMap['fee_financing_enabled'] !== false,
      affiliateCommissionL1: settingsMap['affiliate_commission_l1'] || 0.2,
      affiliateCommissionL2: settingsMap['affiliate_commission_l2'] || 0.15,
      affiliateCommissionL3: settingsMap['affiliate_commission_l3'] || 0.1,
      affiliateCommissionL4: settingsMap['affiliate_commission_l4'] || 0.05,
      affiliateCommissionL5: settingsMap['affiliate_commission_l5'] || 0.03,
      affiliateMinPayout: settingsMap['affiliate_min_payout'] || 50,
    }
  }

  async updateSystemSettings(key: string, value: any, adminId: string) {
    const id = `setting_${Date.now()}`

    const { error: upsertError } = await supabase.from("AdminSettings").upsert(
      {
        id,
        key,
        valueJson: value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { onConflict: "key" }
    )

    if (upsertError) {
      console.error("[AdminService] Error updating system settings:", upsertError)
      throw new Error("Failed to update settings")
    }

    await supabase.from("ComplianceEvent").insert({
      id: `ce_${Date.now()}`,
      type: "ADMIN_SETTING_CHANGED",
      userId: adminId,
      severity: "INFO",
      details: { key, newValue: value },
      createdAt: new Date().toISOString(),
    })

    return { success: true }
  }

  async refundDeposit(depositId: string, reason: string, adminId: string, workspaceId?: string) {
    const { data: deposit, error: fetchError } = await supabase
      .from("DepositPayment")
      .select("id, buyerId, status")
      .eq("id", depositId)
      .single()

    if (fetchError || !deposit) throw new Error("Deposit not found")

    // Fail-closed: verify deposit belongs to this workspace
    if (workspaceId) {
      const { data: buyer } = await supabase
        .from("User")
        .select("id")
        .eq("id", deposit.buyerId)
        .eq("workspaceId", workspaceId)
        .single()
      if (!buyer) throw new Error("Deposit not found")
    }

    if (deposit.status !== "HELD") throw new Error("Deposit cannot be refunded")

    const refundId = `re_${Date.now()}`

    const { error: updateError } = await supabase
      .from("DepositPayment")
      .update({
        status: "REFUNDED",
        refundedAt: new Date().toISOString(),
        refundId,
        reason,
      })
      .eq("id", depositId)

    if (updateError) throw new Error("Failed to update deposit")

    await supabase.from("ComplianceEvent").insert({
      id: `ce_${Date.now()}`,
      type: "DEPOSIT_REFUNDED",
      userId: deposit.buyerId,
      severity: "INFO",
      details: { depositId, refundId, reason, adminId },
      createdAt: new Date().toISOString(),
    })

    return { success: true, refundId }
  }

  async suspendDealer(dealerId: string, reason: string, adminId: string, workspaceId?: string) {
    // Verify dealer belongs to this workspace before mutating
    if (workspaceId) {
      const { data: dealer } = await supabase
        .from("Dealer")
        .select("id")
        .eq("id", dealerId)
        .eq("workspaceId", workspaceId)
        .single()
      if (!dealer) throw new Error("Dealer not found")
    }

    const { error: updateError } = await supabase
      .from("Dealer")
      .update({ active: false })
      .eq("id", dealerId)

    if (updateError) throw new Error("Failed to suspend dealer")

    await supabase.from("ComplianceEvent").insert({
      id: `ce_${Date.now()}`,
      type: "DEALER_SUSPENDED",
      userId: adminId,
      severity: "WARNING",
      details: { dealerId, reason },
      createdAt: new Date().toISOString(),
    })

    return { success: true }
  }

  async approveDealer(dealerId: string, adminId: string, workspaceId?: string) {
    // Verify dealer belongs to this workspace before mutating
    if (workspaceId) {
      const { data: dealer } = await supabase
        .from("Dealer")
        .select("id")
        .eq("id", dealerId)
        .eq("workspaceId", workspaceId)
        .single()
      if (!dealer) throw new Error("Dealer not found")
    }

    const { error: updateError } = await supabase
      .from("Dealer")
      .update({ verified: true, active: true })
      .eq("id", dealerId)

    if (updateError) throw new Error("Failed to approve dealer")

    await supabase.from("ComplianceEvent").insert({
      id: `ce_${Date.now()}`,
      type: "DEALER_APPROVED",
      userId: adminId,
      severity: "INFO",
      details: { dealerId },
      createdAt: new Date().toISOString(),
    })

    return { success: true }
  }

  async getDealerPerformance(workspaceId?: string) {
    let perfQuery = supabase
      .from("Dealer")
      .select("id, name, businessName, integrityScore")

    if (workspaceId) perfQuery = perfQuery.eq("workspaceId", workspaceId)

    const { data: dealers, error } = await perfQuery

    if (error || !dealers) {
      console.error("[AdminService] Error fetching dealer performance:", error)
      return []
    }

    const dealerIds = dealers.map((d) => d.id)

    const [offersResult, dealsResult] = await Promise.all([
      supabase.from("AuctionParticipant").select("dealerId").in("dealerId", dealerIds),
      supabase.from("SelectedDeal").select("dealerId").in("dealerId", dealerIds),
    ])

    const offerCounts: Record<string, number> = {}
    const dealCounts: Record<string, number> = {}

    offersResult.data?.forEach((o) => {
      offerCounts[o.dealerId] = (offerCounts[o.dealerId] || 0) + 1
    })
    dealsResult.data?.forEach((d) => {
      dealCounts[d.dealerId] = (dealCounts[d.dealerId] || 0) + 1
    })

    return dealers.map((dealer) => ({
      id: dealer.id,
      name: dealer.name || dealer.businessName || "Unknown",
      integrityScore: dealer.integrityScore || 0,
      totalOffers: offerCounts[dealer.id] || 0,
      wonDeals: dealCounts[dealer.id || ""] || 0,
      winRate:
        offerCounts[dealer.id || ""] > 0
          ? ((dealCounts[dealer.id || ""] || 0) / offerCounts[dealer.id || ""]) * 100
          : 0,
    }))
  }
}

export const adminService = new AdminService()
export default adminService
