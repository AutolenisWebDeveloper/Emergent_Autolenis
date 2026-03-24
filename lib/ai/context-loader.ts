/**
 * Context Loader — server-side lifecycle context fetcher for Lenis Concierge.
 *
 * Fetches the authenticated user's current state across the full
 * 13-system AutoLenis lifecycle (prequal → pickup + affiliate/admin/dealer).
 *
 * This context is injected into the concierge prompt so the AI can
 * deterministically identify the user's current step and produce
 * a single next-best-step CTA.
 *
 * Data access follows RBAC: each role only sees its own data.
 * No cross-tenant data leakage.
 */

import type { AIRole } from "./context-builder"

// ---------------------------------------------------------------------------
// Types — shape of the loaded context
// ---------------------------------------------------------------------------

export interface PrequalContext {
  exists: boolean
  creditTier: string | null
  softPullCompleted: boolean
  consentGiven: boolean
}

export interface ShortlistContext {
  count: number
}

export interface AuctionContext {
  id: string
  status: string
  offerCount: number
  endsAt: string | null
}

export interface DealContext {
  id: string
  status: string
  vehicleSummary: string | null
}

export interface PaymentContext {
  depositStatus: string | null
  serviceFeeStatus: string | null
}

export interface InsuranceContext {
  status: string | null
}

export interface ContractShieldContext {
  status: string | null
  issuesFound: boolean
}

export interface ESignContext {
  status: string | null
}

export interface PickupContext {
  status: string | null
  scheduledDate: string | null
}

export interface BuyerLifecycleContext {
  prequal: PrequalContext
  shortlist: ShortlistContext
  auction: AuctionContext | null
  deal: DealContext | null
  payments: PaymentContext
  insurance: InsuranceContext
  contractShield: ContractShieldContext
  esign: ESignContext
  pickup: PickupContext
}

export interface DealerDashContext {
  activeAuctions: number
  pendingBids: number
  pendingPickups: number
  pendingContractFixes: number
}

export interface AffiliateDashContext {
  totalClicks: number
  totalSignups: number
  pendingCommissions: number
  totalPaid: number
}

export interface AdminDashContext {
  activeDeals: number
  pendingAuctions: number
  pendingPayouts: number
}

export interface ConciergeContext {
  userId: string
  role: AIRole
  workspaceId: string | null
  workspaceMode: "LIVE" | "TEST"
  buyer: BuyerLifecycleContext | null
  dealer: DealerDashContext | null
  affiliate: AffiliateDashContext | null
  admin: AdminDashContext | null
}

// ---------------------------------------------------------------------------
// Default / empty contexts
// ---------------------------------------------------------------------------

const EMPTY_PREQUAL: PrequalContext = {
  exists: false,
  creditTier: null,
  softPullCompleted: false,
  consentGiven: false,
}

const EMPTY_BUYER: BuyerLifecycleContext = {
  prequal: EMPTY_PREQUAL,
  shortlist: { count: 0 },
  auction: null,
  deal: null,
  payments: { depositStatus: null, serviceFeeStatus: null },
  insurance: { status: null },
  contractShield: { status: null, issuesFound: false },
  esign: { status: null },
  pickup: { status: null, scheduledDate: null },
}

// ---------------------------------------------------------------------------
// Loader implementation
// ---------------------------------------------------------------------------

/**
 * Load concierge context for a given user.
 *
 * Uses Prisma to fetch across the lifecycle models.
 * Each role gets only the data they are allowed to see.
 *
 * @param userId      - Authenticated user ID
 * @param role        - AI role derived from session
 * @param workspaceId - Workspace ID for tenant scoping
 */
export async function loadConciergeContext(
  userId: string,
  role: AIRole,
  workspaceId: string | null,
): Promise<ConciergeContext> {
  const base: ConciergeContext = {
    userId,
    role,
    workspaceId,
    workspaceMode: "LIVE",
    buyer: null,
    dealer: null,
    affiliate: null,
    admin: null,
  }

  // Resolve workspace mode
  if (workspaceId) {
    try {
      const { prisma } = await import("@/lib/prisma")
      if (prisma) {
        const ws = await prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { mode: true },
        })
        if (ws?.mode) {
          base.workspaceMode = ws.mode as "LIVE" | "TEST"
        }
      }
    } catch {
      // DB unavailable — default to LIVE
    }
  }

  switch (role) {
    case "buyer":
      base.buyer = await loadBuyerContext(userId, workspaceId)
      break
    case "dealer":
      base.dealer = await loadDealerContext(userId, workspaceId)
      break
    case "affiliate":
      base.affiliate = await loadAffiliateContext(userId, workspaceId)
      break
    case "admin":
      base.admin = await loadAdminContext(workspaceId)
      break
    default:
      // Public — no user-specific context
      break
  }

  return base
}

// ---------------------------------------------------------------------------
// Role-specific loaders
// ---------------------------------------------------------------------------

async function loadBuyerContext(
  userId: string,
  workspaceId: string | null,
): Promise<BuyerLifecycleContext> {
  try {
    const { prisma } = await import("@/lib/prisma")
    if (!prisma) return { ...EMPTY_BUYER }

    const where = workspaceId
      ? { userId, workspaceId }
      : { userId }

    // Prequal
    const prequal = await prisma.preQualification.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        creditTier: true,
        softPullCompleted: true,
        consentGiven: true,
      },
    })

    // Shortlist
    const shortlistCount = await prisma.vehicleRequestCase.count({
      where,
    })

    // Most recent auction
    const auction = await prisma.auction.findFirst({
      where: workspaceId
        ? { deal: { buyer: { userId } }, workspaceId }
        : { deal: { buyer: { userId } } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        endsAt: true,
        _count: { select: { offers: true } },
      },
    })

    // Most recent deal
    const deal = await prisma.selectedDeal.findFirst({
      where: { buyer: { userId } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        vehicleYear: true,
        vehicleMake: true,
        vehicleModel: true,
        depositPayment: { select: { status: true } },
        serviceFeePayment: { select: { status: true } },
        insurancePolicy: { select: { status: true } },
        scan: { select: { status: true, junkFeesDetected: true } },
        eSignEnvelope: { select: { status: true } },
        pickup: { select: { status: true, scheduledDate: true } },
      },
    })

    const vehicleSummary = deal
      ? [deal.vehicleYear, deal.vehicleMake, deal.vehicleModel]
          .filter(Boolean)
          .join(" ") || null
      : null

    return {
      prequal: prequal
        ? {
            exists: true,
            creditTier: prequal.creditTier,
            softPullCompleted: prequal.softPullCompleted,
            consentGiven: prequal.consentGiven,
          }
        : EMPTY_PREQUAL,
      shortlist: { count: shortlistCount },
      auction: auction
        ? {
            id: auction.id,
            status: auction.status,
            offerCount: auction._count.offers,
            endsAt: auction.endsAt?.toISOString() ?? null,
          }
        : null,
      deal: deal
        ? {
            id: deal.id,
            status: deal.status,
            vehicleSummary,
          }
        : null,
      payments: {
        depositStatus: deal?.depositPayment?.status ?? null,
        serviceFeeStatus: deal?.serviceFeePayment?.status ?? null,
      },
      insurance: {
        status: deal?.insurancePolicy?.status ?? null,
      },
      contractShield: {
        status: deal?.scan?.status ?? null,
        issuesFound: deal?.scan?.junkFeesDetected ?? false,
      },
      esign: {
        status: deal?.eSignEnvelope?.status ?? null,
      },
      pickup: {
        status: deal?.pickup?.status ?? null,
        scheduledDate: deal?.pickup?.scheduledDate?.toISOString() ?? null,
      },
    }
  } catch {
    return { ...EMPTY_BUYER }
  }
}

async function loadDealerContext(
  userId: string,
  workspaceId: string | null,
): Promise<DealerDashContext> {
  try {
    const { prisma } = await import("@/lib/prisma")
    if (!prisma) return { activeAuctions: 0, pendingBids: 0, pendingPickups: 0, pendingContractFixes: 0 }

    const dealer = await prisma.dealer.findFirst({
      where: workspaceId
        ? { users: { some: { userId } }, workspaceId }
        : { users: { some: { userId } } },
      select: { id: true },
    })

    if (!dealer) return { activeAuctions: 0, pendingBids: 0, pendingPickups: 0, pendingContractFixes: 0 }

    const [activeAuctions, pendingPickups] = await Promise.all([
      prisma.auctionParticipant.count({
        where: { dealerId: dealer.id, auction: { status: "ACTIVE" } },
      }),
      prisma.pickupAppointment.count({
        where: { dealerId: dealer.id, status: "SCHEDULED" },
      }),
    ])

    return {
      activeAuctions,
      pendingBids: activeAuctions,
      pendingPickups,
      pendingContractFixes: 0,
    }
  } catch {
    return { activeAuctions: 0, pendingBids: 0, pendingPickups: 0, pendingContractFixes: 0 }
  }
}

async function loadAffiliateContext(
  userId: string,
  workspaceId: string | null,
): Promise<AffiliateDashContext> {
  try {
    const { prisma } = await import("@/lib/prisma")
    if (!prisma) return { totalClicks: 0, totalSignups: 0, pendingCommissions: 0, totalPaid: 0 }

    const affiliate = await prisma.affiliate.findFirst({
      where: workspaceId
        ? { userId, workspaceId }
        : { userId },
      select: { id: true },
    })

    if (!affiliate) return { totalClicks: 0, totalSignups: 0, pendingCommissions: 0, totalPaid: 0 }

    const [clickAgg, signupCount, commissionAgg, paidAgg] = await Promise.all([
      prisma.click.count({ where: { affiliateId: affiliate.id } }),
      prisma.referral.count({ where: { affiliateId: affiliate.id } }),
      prisma.commission.aggregate({
        where: { affiliateId: affiliate.id, status: "PENDING" },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        where: { affiliateId: affiliate.id, status: "PAID" },
        _sum: { amount: true },
      }),
    ])

    return {
      totalClicks: clickAgg,
      totalSignups: signupCount,
      pendingCommissions: commissionAgg._sum.amount ?? 0,
      totalPaid: paidAgg._sum.amount ?? 0,
    }
  } catch {
    return { totalClicks: 0, totalSignups: 0, pendingCommissions: 0, totalPaid: 0 }
  }
}

async function loadAdminContext(
  workspaceId: string | null,
): Promise<AdminDashContext> {
  try {
    const { prisma } = await import("@/lib/prisma")
    if (!prisma) return { activeDeals: 0, pendingAuctions: 0, pendingPayouts: 0 }

    const wsFilter = workspaceId ? { workspaceId } : {}

    const [activeDeals, pendingAuctions, pendingPayouts] = await Promise.all([
      prisma.selectedDeal.count({
        where: {
          ...wsFilter,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      }),
      prisma.auction.count({
        where: { ...wsFilter, status: "ACTIVE" },
      }),
      prisma.payout.count({
        where: { ...wsFilter, status: "PENDING" },
      }),
    ])

    return { activeDeals, pendingAuctions, pendingPayouts }
  } catch {
    return { activeDeals: 0, pendingAuctions: 0, pendingPayouts: 0 }
  }
}

// ---------------------------------------------------------------------------
// Context serializer (for system prompt injection)
// ---------------------------------------------------------------------------

/**
 * Serialize the concierge context into a compact string
 * suitable for injection into the AI system prompt.
 *
 * Omits null/empty values to keep the prompt short.
 */
export function serializeConciergeContext(ctx: ConciergeContext): string {
  const lines: string[] = [
    `ROLE: ${ctx.role}`,
    `WORKSPACE: ${ctx.workspaceMode}`,
  ]

  if (ctx.buyer) {
    const b = ctx.buyer
    lines.push("--- BUYER LIFECYCLE ---")
    if (b.prequal.exists) {
      lines.push(`Prequal: tier=${b.prequal.creditTier ?? "pending"}, softPull=${b.prequal.softPullCompleted}`)
    } else {
      lines.push("Prequal: not started")
    }
    lines.push(`Shortlist: ${b.shortlist.count} vehicle(s)`)
    if (b.auction) {
      lines.push(`Auction: status=${b.auction.status}, offers=${b.auction.offerCount}`)
    }
    if (b.deal) {
      lines.push(`Deal: status=${b.deal.status}${b.deal.vehicleSummary ? `, vehicle=${b.deal.vehicleSummary}` : ""}`)
    }
    if (b.payments.depositStatus) lines.push(`Deposit: ${b.payments.depositStatus}`)
    if (b.payments.serviceFeeStatus) lines.push(`Service Fee: ${b.payments.serviceFeeStatus}`)
    if (b.insurance.status) lines.push(`Insurance: ${b.insurance.status}`)
    if (b.contractShield.status) {
      lines.push(`Contract Shield: ${b.contractShield.status}${b.contractShield.issuesFound ? " (issues found)" : ""}`)
    }
    if (b.esign.status) lines.push(`E-Sign: ${b.esign.status}`)
    if (b.pickup.status) lines.push(`Pickup: ${b.pickup.status}${b.pickup.scheduledDate ? ` on ${b.pickup.scheduledDate}` : ""}`)
  }

  if (ctx.dealer) {
    const d = ctx.dealer
    lines.push("--- DEALER DASHBOARD ---")
    lines.push(`Active Auctions: ${d.activeAuctions}`)
    lines.push(`Pending Bids: ${d.pendingBids}`)
    lines.push(`Pending Pickups: ${d.pendingPickups}`)
  }

  if (ctx.affiliate) {
    const a = ctx.affiliate
    lines.push("--- AFFILIATE DASHBOARD ---")
    lines.push(`Clicks: ${a.totalClicks} | Signups: ${a.totalSignups}`)
    lines.push(`Pending Commissions: $${a.pendingCommissions} | Total Paid: $${a.totalPaid}`)
  }

  if (ctx.admin) {
    const ad = ctx.admin
    lines.push("--- ADMIN OPS ---")
    lines.push(`Active Deals: ${ad.activeDeals} | Pending Auctions: ${ad.pendingAuctions} | Pending Payouts: ${ad.pendingPayouts}`)
  }

  return lines.join("\n")
}
