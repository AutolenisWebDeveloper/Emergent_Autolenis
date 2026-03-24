import { supabase } from "@/lib/db"

export async function getAllBuyers(filters?: {
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

export async function getBuyerDetail(userId: string, workspaceId?: string) {
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

export async function getAllDealers(filters?: {
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

export async function getAllAuctions(filters?: { status?: string; page?: number; limit?: number; workspaceId?: string }) {
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

export async function getAllDeals(filters?: {
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

export async function getAllPayments(filters?: {
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

export async function getAllAffiliates(filters?: { search?: string; page?: number; limit?: number; workspaceId?: string }) {
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

export async function getComplianceEvents(filters?: {
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

export async function getContractShieldScans(filters?: { status?: string; page?: number; limit?: number; workspaceId?: string }) {
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

export async function getInsuranceData(filters?: { type?: string; page?: number; limit?: number; workspaceId?: string }) {
  const page = filters?.page || 1
  const limit = filters?.limit || 50
  const offset = (page - 1) * limit

  let quotesQuery = supabase
    .from("InsuranceQuote")
    .select("id, buyerId, carrier, productName, monthlyPremium, monthlyPremiumCents, expiresAt, createdAt")
    .order("createdAt", { ascending: false })
    .limit(25)

  let policiesQuery = supabase
    .from("InsurancePolicy")
    .select(
      "id, type, carrier, policyNumber, status, effectiveDate, expirationDate, monthlyPremium, documentUrl, createdAt",
      { count: "exact" }
    )
    .order("createdAt", { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters?.workspaceId) {
    quotesQuery = quotesQuery.eq("workspaceId", filters.workspaceId)
    policiesQuery = policiesQuery.eq("workspaceId", filters.workspaceId)
  }

  const [quotesResult, policiesResult] = await Promise.all([
    quotesQuery,
    policiesQuery,
  ])

  return {
    quotes: (quotesResult.data || []).map((q) => ({
      id: q.id,
      buyerName: "Unknown",
      carrier: q.carrier || "Unknown",
      productName: q.productName || "",
      monthlyPremium: q.monthlyPremium || (q.monthlyPremiumCents ? q.monthlyPremiumCents / 100 : 0),
      vehicle: "Unknown",
      expiresAt: q.expiresAt,
      createdAt: q.createdAt,
    })),
    policies: (policiesResult.data || []).map((p) => ({
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
