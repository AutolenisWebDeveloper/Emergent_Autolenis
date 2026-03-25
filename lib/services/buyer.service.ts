import { supabase, isDatabaseConfigured } from "@/lib/db"
import { SOURCING_TABLES } from "@/lib/services/sourcing.service"
import {
  AuctionStatus,
  DealStatus,
  PickupStatus,
  BuyerCaseStatus,
  CLOSED_CASE_STATUSES,
} from "@/lib/constants/statuses"

export const buyerService = {
  async getDashboardData(userId: string) {
    // Return default data if database is not configured
    if (!isDatabaseConfigured()) {
      console.warn("[BuyerService] Database not configured, returning default data")
      return getDefaultDashboardData()
    }

    if (!userId) {
      console.warn("[BuyerService] No userId provided, returning default data")
      return getDefaultDashboardData()
    }

    try {
      const profileResult = await supabase
        .from("BuyerProfile")
        .select(`
          id, 
          userId, 
          firstName, 
          lastName, 
          phone, 
          createdAt, 
          updatedAt,
          package_tier,
          package_selected_at,
          package_selection_source,
          package_upgraded_at,
          package_version,
          user:User(email)
        `)
        .eq("userId", userId)
        .maybeSingle()

      const profile = profileResult.data

      // If no profile found, return default data
      if (!profile) {
        console.warn("[BuyerService] No buyer profile found for user:", userId)
        return getDefaultDashboardData()
      }

      // Flatten the email from the user relation
      const flattenedProfile = {
        ...profile,
        email: (profile.user as any)?.email || null,
        user: undefined, // Remove the nested user object
      }

      const buyerId = flattenedProfile.id

      const [preQualResult, shortlistsResult, auctionsResult, dealsResult, pickupsResult, affiliateResult, vehicleRequestsResult, packageBillingResult] =
        await Promise.all([
          supabase
            .from("PreQualification")
            .select("id, buyerId, maxMonthlyPaymentCents, maxOtdAmountCents, expiresAt, status, createdAt, updatedAt")
            .eq("buyerId", buyerId)
            .order("createdAt", { ascending: false })
            .limit(1)
            .maybeSingle(),

          supabase
            .from("Shortlist")
            .select(`
              id,
              buyerId,
              name,
              createdAt,
              items:ShortlistItem(
                id,
                isPrimary,
                notes,
                inventoryItem:InventoryItem(
                  id,
                  priceCents,
                  status,
                  year, make, model, trim, mileage, bodyStyle, vin, photosJson,
                  dealer:Dealer(id, businessName, city, state)
                )
              )
            `)
            .eq("buyerId", buyerId),

          supabase
            .from("Auction")
            .select(`
              id,
              buyerId,
              status,
              endsAt,
              createdAt,
              updatedAt,
              offers:AuctionOffer(id, cashOtd, status, createdAt)
            `)
            .eq("buyerId", buyerId)
            .order("createdAt", { ascending: false }),

          supabase
            .from("SelectedDeal")
            .select("id, buyerId, status, total_otd_amount_cents, insurance_readiness_status, delivery_block_flag, createdAt, updatedAt")
            .eq("buyerId", buyerId)
            .order("createdAt", { ascending: false }),

          supabase
            .from("PickupAppointment")
            .select(`
              id,
              buyerId,
              scheduledDate,
              status,
              dealer:Dealer(id, businessName, city, state)
            `)
            .eq("buyerId", buyerId)
            .order("scheduledDate", { ascending: false }),

          supabase
            .from("Affiliate")
            .select(`
              id,
              userId,
              referralCode,
              totalEarnings,
              pendingEarnings,
              status,
              referrals:Referral(id, status),
              commissions:Commission(id, amount, status)
            `)
            .eq("userId", userId)
            .maybeSingle(),

          supabase
            .from(SOURCING_TABLES.CASES)
            .select("id, status, marketZip, createdAt")
            .eq("buyerId", buyerId)
            .order("createdAt", { ascending: false })
            .limit(5),

          // Package billing state from canonical buyer_package_billing table
          supabase
            .from("buyer_package_billing")
            .select("*")
            .eq("buyer_id", buyerId)
            .maybeSingle(),
        ])

      const preQual = preQualResult.data
      const shortlists = shortlistsResult.data || []
      const auctions = auctionsResult.data || []
      const deals = dealsResult.data || []
      const pickups = pickupsResult.data || []
      const referralStats = affiliateResult.data
      const vehicleRequests = vehicleRequestsResult.data || []
      const packageBilling = packageBillingResult?.data || null

      // Calculate sourcing stats
      const activeSourcingCases = vehicleRequests.filter(
        (r: any) => !(CLOSED_CASE_STATUSES as readonly string[]).includes(r.status),
      ).length
      const offersAvailable = vehicleRequests.filter(
        (r: any) => r.status === BuyerCaseStatus.OFFERS_AVAILABLE,
      ).length

      // Calculate stats
      const totalShortlistItems = shortlists.reduce((acc: number, s: any) => acc + (s.items?.length || 0), 0)
      const activeAuctions = auctions.filter((a: any) => a.status === AuctionStatus.ACTIVE || a.status === AuctionStatus.PENDING_DEPOSIT).length
      const totalOffers = auctions.reduce((acc: number, a: any) => acc + (a.offers?.length || 0), 0)
      const pendingDeals = deals.filter((d: any) => d.status !== DealStatus.COMPLETED && d.status !== DealStatus.CANCELLED).length
      const completedDeals = deals.filter((d: any) => d.status === DealStatus.COMPLETED).length
      const upcomingPickups = pickups.filter((p: any) => p.status === PickupStatus.SCHEDULED).length

      // Get recent activity
      const recentActivity = await getRecentActivity(userId, buyerId)

      // Determine insurance readiness status from the most recent active deal
      const activeDeal = deals.find(
        (d: any) => d.status !== "COMPLETED" && d.status !== "CANCELLED",
      ) as { insurance_readiness_status?: string } | undefined
      const insuranceStatus = activeDeal?.insurance_readiness_status || "NOT_STARTED"

      return {
        profile: flattenedProfile,
        preQual: preQual
          ? {
              ...preQual,
              isExpired: preQual.expiresAt ? new Date(preQual.expiresAt) < new Date() : false,
              daysUntilExpiry: preQual.expiresAt
                ? Math.ceil((new Date(preQual.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null,
            }
          : null,
        insuranceStatus,
        stats: {
          shortlistCount: totalShortlistItems,
          activeAuctions,
          totalOffers,
          pendingDeals,
          completedDeals,
          upcomingPickups,
          // totalSavings intentionally omitted — no auditable source-of-truth
          // data exists for buyer savings. Re-add only when backed by actual
          // deal-level price-vs-market deltas (P4 KPI integrity).
          totalSavings: null,
          referralEarnings: referralStats?.totalEarnings || 0,
          pendingReferrals: referralStats?.pendingEarnings || 0,
          activeSourcingCases,
          offersAvailable,
        },
        shortlists,
        auctions: auctions.slice(0, 5),
        deals: deals.slice(0, 5),
        pickups: pickups.slice(0, 3),
        recentActivity,
        referralStats,
        billing: packageBilling,
      }
    } catch (error) {
      console.error("[BuyerService] Error fetching dashboard data:", error)
      return getDefaultDashboardData()
    }
  },

  async getPreQualification(userId: string) {
    if (!isDatabaseConfigured() || !userId) return null

    const { data: profile } = await supabase.from("BuyerProfile").select("id").eq("userId", userId).maybeSingle()

    if (!profile) return null

    const { data } = await supabase
      .from("PreQualification")
      .select("id, buyerId, maxMonthlyPaymentCents, maxOtdAmountCents, expiresAt, status, createdAt")
      .eq("buyerId", profile.id)
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle()

    return data
  },

  async getActiveAuctions(userId: string) {
    if (!isDatabaseConfigured() || !userId) return []

    const { data: profile } = await supabase.from("BuyerProfile").select("id").eq("userId", userId).maybeSingle()

    if (!profile) return []

    const { data } = await supabase
      .from("Auction")
      .select(`
        id,
        buyerId,
        status,
        endsAt,
        createdAt,
        offers:AuctionOffer(id, cashOtd, status, dealerId, createdAt),
        shortlist:Shortlist(
          id,
          name,
          items:ShortlistItem(
            id,
            isPrimary,
            inventoryItem:InventoryItem(
              id,
              priceCents,
              year, make, model, trim, mileage, vin, photosJson
            )
          )
        )
      `)
      .eq("buyerId", profile.id)
      .in("status", ["ACTIVE", "PENDING_DEPOSIT"])
      .order("endsAt", { ascending: true })

    return data || []
  },

  async getCurrentDeal(userId: string) {
    if (!isDatabaseConfigured() || !userId) return null

    const { data: profile } = await supabase.from("BuyerProfile").select("id").eq("userId", userId).maybeSingle()

    if (!profile) return null

    const { data } = await supabase
      .from("SelectedDeal")
      .select("id, buyerId, status, total_otd_amount_cents, createdAt, updatedAt")
      .eq("buyerId", profile.id)
      .neq("status", "CANCELLED")
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle()

    return data
  },
}

export class BuyerService {
  static getDashboardData = buyerService.getDashboardData
  static getPreQualification = buyerService.getPreQualification
  static getActiveAuctions = buyerService.getActiveAuctions
  static getCurrentDeal = buyerService.getCurrentDeal
}

export default buyerService

function getDefaultDashboardData() {
  return {
    profile: null,
    preQual: null,
    stats: {
      shortlistCount: 0,
      activeAuctions: 0,
      totalOffers: 0,
      pendingDeals: 0,
      completedDeals: 0,
      upcomingPickups: 0,
      totalSavings: null,
      referralEarnings: 0,
      pendingReferrals: 0,
    },
    shortlists: [],
    auctions: [],
    deals: [],
    pickups: [],
    recentActivity: [],
    referralStats: null,
  }
}

async function getRecentActivity(_userId: string, buyerId: string) {
  const activities: Array<{
    type: string
    title: string
    description: string
    timestamp: string
    icon: string
  }> = []

  if (!isDatabaseConfigured() || !buyerId) return activities

  try {
    const { data: recentAuctions } = await supabase
      .from("Auction")
      .select("id, status, updatedAt")
      .eq("buyerId", buyerId)
      .order("updatedAt", { ascending: false })
      .limit(3)

    if (recentAuctions) {
      recentAuctions.forEach((auction: any) => {
        activities.push({
          type: "auction",
          title: auction.status === "ACTIVE" ? "Auction Started" : `Auction ${auction.status}`,
          description: `Auction #${auction.id.slice(-6)}`,
          timestamp: auction.updatedAt,
          icon: "gavel",
        })
      })
    }

    const { data: buyerAuctions } = await supabase.from("Auction").select("id").eq("buyerId", buyerId)

    if (buyerAuctions && buyerAuctions.length > 0) {
      const auctionIds = buyerAuctions.map((a: any) => a.id)

      const { data: recentOffers } = await supabase
        .from("AuctionOffer")
        .select("id, cashOtd, createdAt, auctionId")
        .in("auctionId", auctionIds)
        .order("createdAt", { ascending: false })
        .limit(5)

      if (recentOffers) {
        recentOffers.forEach((offer: any) => {
          activities.push({
            type: "offer",
            title: "New Offer Received",
            description: `Offer for $${offer.cashOtd?.toLocaleString() || "N/A"}`,
            timestamp: offer.createdAt,
            icon: "dollar",
          })
        })
      }
    }

    const { data: recentDeals } = await supabase
      .from("SelectedDeal")
      .select("id, status, updatedAt")
      .eq("buyerId", buyerId)
      .order("updatedAt", { ascending: false })
      .limit(3)

    if (recentDeals) {
      recentDeals.forEach((deal: any) => {
        if (deal.status !== "SELECTED") {
          activities.push({
            type: "deal",
            title: `Deal ${deal.status.replace(/_/g, " ").toLowerCase()}`,
            description: `Deal #${deal.id.slice(-6)}`,
            timestamp: deal.updatedAt,
            icon: "credit-card",
          })
        }
      })
    }
  } catch (error) {
    console.error("[BuyerService] Error fetching recent activity:", error)
  }

  // Sort by timestamp and return top 10
  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10)
}
