import { supabase } from "@/lib/db"

/**
 * Conditionally append .eq("workspaceId", wsId) when a workspaceId is provided.
 * Routes enforce fail-closed (403 when workspace_id missing); services provide
 * defense-in-depth by filtering when a workspaceId is supplied.
 */
function wsEq(query: any, workspaceId?: string) {
  return workspaceId ? query.eq("workspaceId", workspaceId) : query
}

export async function getDashboardStats(workspaceId?: string) {
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
  ] = await Promise.all([
    wsEq(supabase.from("User").select("id", { count: "exact", head: true }).eq("role", "BUYER"), workspaceId),
    wsEq(supabase
      .from("User")
      .select("id", { count: "exact", head: true })
      .eq("role", "BUYER")
      .gte("updatedAt", thirtyDaysAgo.toISOString()), workspaceId),
    wsEq(supabase.from("Dealer").select("id", { count: "exact", head: true }), workspaceId),
    wsEq(supabase.from("Dealer").select("id", { count: "exact", head: true }).eq("active", true), workspaceId),
    wsEq(supabase.from("Auction").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"), workspaceId),
    wsEq(supabase
      .from("Auction")
      .select("id", { count: "exact", head: true })
      .gte("createdAt", thirtyDaysAgo.toISOString()), workspaceId),
    wsEq(supabase.from("SelectedDeal").select("id", { count: "exact", head: true }).eq("status", "COMPLETED"), workspaceId),
    wsEq(supabase
      .from("SelectedDeal")
      .select("id", { count: "exact", head: true })
      .eq("status", "COMPLETED")
      .gte("createdAt", thirtyDaysAgo.toISOString()), workspaceId),
    wsEq(supabase.from("ServiceFeePayment").select("amount").eq("status", "COMPLETED"), workspaceId),
    wsEq(supabase
      .from("ServiceFeePayment")
      .select("amount")
      .eq("status", "COMPLETED")
      .gte("createdAt", thirtyDaysAgo.toISOString()), workspaceId),
    wsEq(supabase.from("DepositPayment").select("id", { count: "exact", head: true }).eq("status", "PENDING"), workspaceId),
    wsEq(supabase.from("Payout").select("amount").eq("status", "COMPLETED"), workspaceId),
    wsEq(supabase
      .from("Payout")
      .select("amount")
      .eq("status", "COMPLETED")
      .gte("paidAt", thirtyDaysAgo.toISOString()), workspaceId),
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
  }
}

export async function getFunnelData(workspaceId?: string) {
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
    wsEq(supabase.from("ServiceFeePayment").select("id", { count: "exact", head: true }).eq("status", "COMPLETED"), workspaceId),
    wsEq(supabase.from("SelectedDeal").select("id", { count: "exact", head: true }).eq("status", "COMPLETED"), workspaceId),
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

export async function getTopDealers(limit = 10, workspaceId?: string) {
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

export async function getTopAffiliates(limit = 10, workspaceId?: string) {
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

export async function getDealerPerformance(workspaceId?: string) {
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
