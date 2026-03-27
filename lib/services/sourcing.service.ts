import { prisma } from "@/lib/db"
import * as crypto from "node:crypto"

// ---------------------------------------------------------------------------
// Prompt 5 Canonical Mapping
// ---------------------------------------------------------------------------
// The Prompt 5 approved sourcing backend defines canonical Supabase objects.
// The current physical implementation uses Prisma models that map 1:1 to
// these canonical objects. This mapping is authoritative for all new work.
//
//   Prompt 5 Canonical Name        → Prisma Model (physical table)
//   ─────────────────────────────── → ──────────────────────────────
//   sourcing_cases                  → VehicleRequestCase
//   sourcing_dealer_outreach        → SourcingOutreachLog
//   sourced_offers                  → SourcedOffer
//   sourced_dealer_invitations      → DealerInvite
//   network_coverage_events         → DealerCoverageGapSignal
//   sourcing_audit_log              → CaseEventLog
//   sourcing_events_outbox          → (reserved — not yet required)
//   log_coverage_from_request()     → SourcingService.checkDealerCoverage()
//
// All sourcing reads/writes MUST go through SourcingService methods.
// Dashboard read-only queries may access the physical tables directly.
// See docs/SOURCING_PROMPT5_ALIGNMENT.md for the full reconciliation.
// ---------------------------------------------------------------------------

/**
 * Canonical Prompt 5 table name → physical Prisma table name mapping.
 * Used by Supabase .from() calls in dashboard services for read-only queries.
 */
export const SOURCING_TABLES = {
  /** sourcing_cases → VehicleRequestCase */
  CASES: "VehicleRequestCase",
  /** sourcing_dealer_outreach → SourcingOutreachLog */
  DEALER_OUTREACH: "SourcingOutreachLog",
  /** sourced_offers → SourcedOffer */
  OFFERS: "SourcedOffer",
  /** sourced_dealer_invitations → DealerInvite */
  DEALER_INVITATIONS: "DealerInvite",
  /** network_coverage_events → DealerCoverageGapSignal */
  COVERAGE_EVENTS: "DealerCoverageGapSignal",
  /** sourcing_audit_log → CaseEventLog */
  AUDIT_LOG: "CaseEventLog",
} as const

// ---------------------------------------------------------------------------
// Domain errors
// ---------------------------------------------------------------------------

/** Thrown when the authenticated user has no BuyerProfile record. */
export class BuyerProfileMissingError extends Error {
  readonly code = "BUYER_PROFILE_MISSING" as const
  constructor() {
    super("Please complete your buyer profile before submitting a vehicle request.")
    this.name = "BuyerProfileMissingError"
  }
}

// ---------------------------------------------------------------------------
// Const enums (avoid Prisma import to sidestep pnpm module-resolution issues)
// ---------------------------------------------------------------------------

export const BuyerCaseStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  SOURCING: "SOURCING",
  OFFERS_AVAILABLE: "OFFERS_AVAILABLE",
  OFFER_SELECTED: "OFFER_SELECTED",
  DEALER_INVITED: "DEALER_INVITED",
  IN_PLATFORM_TRANSACTION: "IN_PLATFORM_TRANSACTION",
  CLOSED_WON: "CLOSED_WON",
  CLOSED_LOST: "CLOSED_LOST",
  CLOSED_CANCELLED: "CLOSED_CANCELLED",
} as const
export type BuyerCaseStatus = (typeof BuyerCaseStatus)[keyof typeof BuyerCaseStatus]

export const AdminSubStatus = {
  NEW: "NEW",
  NEED_DEALERS: "NEED_DEALERS",
  OUTREACH_IN_PROGRESS: "OUTREACH_IN_PROGRESS",
  WAITING_ON_DEALER: "WAITING_ON_DEALER",
  OFFERS_READY: "OFFERS_READY",
  OFFERS_PRESENTED: "OFFERS_PRESENTED",
  PENDING_BUYER_RESPONSE: "PENDING_BUYER_RESPONSE",
  DEALER_INVITE_SENT: "DEALER_INVITE_SENT",
  DEALER_ONBOARDING: "DEALER_ONBOARDING",
  STALE: "STALE",
  ESCALATED: "ESCALATED",
  RESOLVED: "RESOLVED",
} as const
export type AdminSubStatus = (typeof AdminSubStatus)[keyof typeof AdminSubStatus]

export const SourcedOfferStatus = {
  DRAFT: "DRAFT",
  PENDING_PRESENT: "PENDING_PRESENT",
  PRESENTED: "PRESENTED",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  EXPIRED: "EXPIRED",
} as const
export type SourcedOfferStatus = (typeof SourcedOfferStatus)[keyof typeof SourcedOfferStatus]

export const DealerInviteStatus = {
  SENT: "SENT",
  CLAIMED: "CLAIMED",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED",
} as const
export type DealerInviteStatus = (typeof DealerInviteStatus)[keyof typeof DealerInviteStatus]

export const OfferSourceType = {
  ADMIN_ENTERED: "ADMIN_ENTERED",
  DEALER_SUBMITTED: "DEALER_SUBMITTED",
} as const
export type OfferSourceType = (typeof OfferSourceType)[keyof typeof OfferSourceType]

// ---------------------------------------------------------------------------
// Valid status transitions
// ---------------------------------------------------------------------------

const VALID_CASE_TRANSITIONS: Partial<Record<BuyerCaseStatus, BuyerCaseStatus[]>> = {
  DRAFT: ["SUBMITTED", "CLOSED_CANCELLED"],
  SUBMITTED: ["SOURCING", "CLOSED_CANCELLED"],
  SOURCING: ["OFFERS_AVAILABLE", "CLOSED_CANCELLED", "CLOSED_LOST"],
  OFFERS_AVAILABLE: ["OFFER_SELECTED", "SOURCING", "CLOSED_CANCELLED"],
  OFFER_SELECTED: ["DEALER_INVITED", "OFFERS_AVAILABLE"],
  DEALER_INVITED: ["IN_PLATFORM_TRANSACTION", "OFFERS_AVAILABLE"],
  IN_PLATFORM_TRANSACTION: ["CLOSED_WON", "CLOSED_LOST"],
  CLOSED_WON: [],
  CLOSED_LOST: [],
  CLOSED_CANCELLED: [],
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DealerCoverageResult {
  hasCoverage: boolean
  signal?: { id: string; reasonCode: string }
}

export interface CreateCaseItemInput {
  vehicleType: string
  condition: string
  yearMin: number
  yearMax: number
  make: string
  model?: string
  openToSimilar?: boolean
  trim?: string
  budgetType: string
  budgetTargetCents: number
  maxTotalOtdBudgetCents?: number | null
  maxMonthlyPaymentCents?: number | null
  desiredDownPaymentCents?: number | null
  mileageMax?: number
  mustHaveFeatures?: string[]
  colors?: string[]
  distancePreference?: string
  maxDistanceMiles?: number
  timeline?: string
  vin?: string
  notes?: string
}

export interface CreateCaseInput {
  marketZip: string
  radiusMiles?: number
  prequalSnapshot?: Record<string, unknown>
  location?: { state?: string; zip?: string; city?: string }
  items: CreateCaseItemInput[]
}

export interface CreateOfferInput {
  dealerId?: string
  sourceDealerName?: string
  sourceDealerEmail?: string
  sourceDealerPhone?: string
  vin?: string
  year?: number
  make?: string
  modelName?: string
  trim?: string
  mileage?: number
  condition?: string
  pricingBreakdown?: Record<string, unknown>
  paymentTerms?: Record<string, unknown>
  expiresAt?: Date
}

export interface AddOutreachLogInput {
  dealerName: string
  contactMethod: string
  outcome: string
  occurredAt?: Date
  notes?: string
}

export interface AdminCaseFilters {
  status?: BuyerCaseStatus
  adminSubStatus?: AdminSubStatus
  tab?: string
  dateFrom?: string
  dateTo?: string
  make?: string
  budgetMin?: number
  budgetMax?: number
  marketZip?: string
  sortBy?: "newest" | "oldest" | "highest_budget"
}

export interface AddNoteInput {
  content: string
  isInternal?: boolean
}

const MAX_ITEMS_PER_CASE = 3
const INVITE_TOKEN_EXPIRY_HOURS = 72

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SourcingService {
  // ---------------------------
  // Buyer profile resolution
  // ---------------------------

  /**
   * Resolve a BuyerProfile.id from a User.id (session.userId).
   *
   * All buyer-domain models (Shortlist, Auction, VehicleRequestCase) use
   * BuyerProfile.id as their ownership key. Route handlers must call this
   * to convert the authenticated User.id into the canonical buyer identity.
   *
   * Throws a descriptive error when no profile exists so that the route
   * handler can return a clear 404 instead of a misleading 500.
   */
  async resolveBuyerProfileId(userId: string): Promise<string> {
    const profile = await prisma.buyerProfile.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!profile) {
      throw new BuyerProfileMissingError()
    }
    return profile.id
  }

  // ---------------------------
  // Dealer coverage
  // ---------------------------

  async checkDealerCoverage(
    buyerId: string,
    marketZip: string,
    radiusMiles: number,
    workspaceId?: string,
  ): Promise<DealerCoverageResult> {
    const where: Record<string, unknown> = {
      verified: true,
      active: true,
      zip: marketZip,
    }
    if (workspaceId) where.workspaceId = workspaceId

    const count = await prisma.dealer.count({ where })

    if (count > 0) {
      return { hasCoverage: true }
    }

    const signal = await prisma.dealerCoverageGapSignal.create({
      data: {
        buyerId,
        marketZip,
        radiusMiles,
        reasonCode: "NO_ACTIVE_DEALERS",
        ...(workspaceId ? { workspaceId } : {}),
      },
    })

    return {
      hasCoverage: false,
      signal: { id: signal.id, reasonCode: signal.reasonCode },
    }
  }

  // ---------------------------
  // Case CRUD
  // ---------------------------

  async createCase(buyerId: string, data: CreateCaseInput, workspaceId?: string) {
    if (!data.items || data.items.length === 0) {
      throw new Error("At least one vehicle request item is required")
    }
    if (data.items.length > MAX_ITEMS_PER_CASE) {
      throw new Error(`Maximum ${MAX_ITEMS_PER_CASE} items per case`)
    }

    return prisma.vehicleRequestCase.create({
      data: {
        buyerId,
        marketZip: data.marketZip,
        radiusMiles: data.radiusMiles ?? 50,
        prequalSnapshotJson: data.prequalSnapshot ?? undefined,
        buyerLocationJson: data.location ?? undefined,
        status: BuyerCaseStatus.DRAFT,
        adminSubStatus: AdminSubStatus.NEW,
        ...(workspaceId ? { workspaceId } : {}),
        items: {
          create: data.items.map((item) => {
            // Enforce backend truth: null out irrelevant budget fields
            const bt = item.budgetType
            const maxTotalOtdBudgetCents =
              bt === "TOTAL_PRICE" ? (item.maxTotalOtdBudgetCents ?? null) : null
            const maxMonthlyPaymentCents =
              bt === "MONTHLY_PAYMENT" ? (item.maxMonthlyPaymentCents ?? null) : null
            const desiredDownPaymentCents = item.desiredDownPaymentCents ?? null

            return {
              vehicleType: item.vehicleType,
              condition: item.condition,
              yearMin: item.yearMin,
              yearMax: item.yearMax,
              make: item.make,
              model: item.model,
              openToSimilar: item.openToSimilar ?? false,
              trim: item.trim,
              budgetType: item.budgetType,
              // Legacy column — write 0 as migration placeholder (no longer used for new requests)
              budgetTargetCents: 0,
              maxTotalOtdBudgetCents,
              maxMonthlyPaymentCents,
              desiredDownPaymentCents,
              mileageMax: item.mileageMax,
              mustHaveFeaturesJson: item.mustHaveFeatures ?? undefined,
              colorsJson: item.colors ?? undefined,
              distancePreference: item.distancePreference ?? "EITHER",
              maxDistanceMiles: item.maxDistanceMiles,
              timeline: item.timeline ?? "FIFTEEN_30_DAYS",
              vin: item.vin,
              notes: item.notes,
            }
          }),
        },
      },
      include: { items: true },
    })
  }

  async submitCase(caseId: string, buyerId: string, actorUserId?: string) {
    const existing = await prisma.vehicleRequestCase.findFirst({
      where: { id: caseId, buyerId },
    })
    if (!existing) throw new Error("Case not found")
    this.validateTransition(existing.status as BuyerCaseStatus, BuyerCaseStatus.SUBMITTED)

    const now = new Date()
    const updated = await prisma.vehicleRequestCase.update({
      where: { id: caseId },
      data: { status: BuyerCaseStatus.SUBMITTED, submittedAt: now },
      include: { items: true },
    })

    // actorUserId should be the authenticated User.id for audit traceability.
    // Falls back to buyerId (BuyerProfile.id) for backward compat if not provided.
    await this.logEvent(caseId, actorUserId ?? buyerId, "BUYER", "STATUS_CHANGE", existing.status, BuyerCaseStatus.SUBMITTED)

    return updated
  }

  async cancelCase(caseId: string, buyerId: string, actorUserId?: string) {
    const existing = await prisma.vehicleRequestCase.findFirst({
      where: { id: caseId, buyerId },
    })
    if (!existing) throw new Error("Case not found")

    this.validateTransition(existing.status as BuyerCaseStatus, BuyerCaseStatus.CLOSED_CANCELLED)

    const previousStatus = existing.status
    const updated = await prisma.vehicleRequestCase.update({
      where: { id: caseId },
      data: { status: BuyerCaseStatus.CLOSED_CANCELLED, closedAt: new Date() },
    })

    await this.logEvent(
      caseId,
      actorUserId ?? buyerId,
      "BUYER",
      "STATUS_CHANGE",
      previousStatus,
      BuyerCaseStatus.CLOSED_CANCELLED,
      "Cancelled by buyer",
    )

    return updated
  }

  async getCaseForBuyer(caseId: string, buyerId: string) {
    return prisma.vehicleRequestCase.findFirst({
      where: { id: caseId, buyerId },
      include: {
        items: true,
        offers: {
          where: {
            status: { in: [SourcedOfferStatus.PRESENTED, SourcedOfferStatus.ACCEPTED] },
          },
        },
        events: { orderBy: { createdAt: "desc" } },
      },
    })
  }

  async listCasesForBuyer(buyerId: string, workspaceId?: string) {
    const where: Record<string, unknown> = { buyerId }
    if (workspaceId) where.workspaceId = workspaceId

    return prisma.vehicleRequestCase.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
    })
  }

  /**
   * List sourcing cases visible to a dealer.
   * Maps to Prompt 5 canonical: sourcing_cases (read-only for dealers).
   */
  async listOpenCasesForDealer(workspaceId?: string) {
    return prisma.vehicleRequestCase.findMany({
      where: {
        workspaceId,
        status: { in: [BuyerCaseStatus.SUBMITTED, BuyerCaseStatus.SOURCING, BuyerCaseStatus.OFFERS_AVAILABLE] },
      },
      select: {
        id: true,
        status: true,
        marketZip: true,
        radiusMiles: true,
        createdAt: true,
        submittedAt: true,
        items: {
          select: {
            id: true,
            vehicleType: true,
            condition: true,
            yearMin: true,
            yearMax: true,
            make: true,
            model: true,
            trim: true,
            budgetType: true,
            budgetTargetCents: true,
            mileageMax: true,
            timeline: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  // ---------------------------
  // Admin case views
  // ---------------------------

  async listCasesForAdmin(filters: AdminCaseFilters, workspaceId?: string) {
    const where: Record<string, unknown> = {}
    if (workspaceId) where.workspaceId = workspaceId

    if (filters.tab) {
      switch (filters.tab) {
        case "new":
          where.status = BuyerCaseStatus.SUBMITTED
          break
        case "needs_outreach":
          where.adminSubStatus = AdminSubStatus.NEED_DEALERS
          break
        case "waiting":
          where.adminSubStatus = AdminSubStatus.WAITING_ON_DEALER
          break
        case "offers_ready":
          where.adminSubStatus = AdminSubStatus.OFFERS_READY
          break
        case "stale":
          where.adminSubStatus = AdminSubStatus.STALE
          break
        case "closed":
          where.status = {
            in: [BuyerCaseStatus.CLOSED_WON, BuyerCaseStatus.CLOSED_LOST, BuyerCaseStatus.CLOSED_CANCELLED],
          }
          break
      }
    } else {
      if (filters.status) where.status = filters.status
      if (filters.adminSubStatus) where.adminSubStatus = filters.adminSubStatus
    }

    // Date range filters
    if (filters.dateFrom || filters.dateTo) {
      const createdAt: Record<string, Date> = {}
      if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom)
      if (filters.dateTo) createdAt.lte = new Date(filters.dateTo)
      where.createdAt = createdAt
    }

    // Market ZIP filter
    if (filters.marketZip) where.marketZip = filters.marketZip

    // Item-level filters (make + budget) — build a single `some` predicate
    const itemSomeConditions: Record<string, unknown> = {}

    if (filters.make) {
      itemSomeConditions.make = { contains: filters.make, mode: "insensitive" }
    }

    if (filters.budgetMin !== undefined || filters.budgetMax !== undefined) {
      const budgetWhere: Record<string, unknown> = {}
      if (filters.budgetMin !== undefined) budgetWhere.gte = filters.budgetMin
      if (filters.budgetMax !== undefined) budgetWhere.lte = filters.budgetMax
      itemSomeConditions.budgetTargetCents = budgetWhere
    }

    if (Object.keys(itemSomeConditions).length > 0) {
      where.items = { some: itemSomeConditions }
    }

    // Sorting
    let orderBy: Record<string, string> = { createdAt: "desc" }
    if (filters.sortBy === "oldest") {
      orderBy = { createdAt: "asc" }
    }

    return prisma.vehicleRequestCase.findMany({
      where,
      include: { items: true },
      orderBy,
    })
  }

  async getCaseForAdmin(caseId: string) {
    return prisma.vehicleRequestCase.findUnique({
      where: { id: caseId },
      include: {
        items: true,
        offers: { orderBy: { createdAt: "desc" } },
        outreachLogs: { orderBy: { createdAt: "desc" } },
        events: { orderBy: { createdAt: "desc" } },
        notes: { orderBy: { createdAt: "desc" } },
        invite: true,
      },
    })
  }

  // ---------------------------
  // Admin actions
  // ---------------------------

  async assignCase(caseId: string, adminUserId: string, actorUserId: string) {
    const existing = await prisma.vehicleRequestCase.findUnique({ where: { id: caseId } })
    if (!existing) throw new Error("Case not found")

    const data: Record<string, unknown> = { assignedAdminUserId: adminUserId }
    if (!existing.firstAdminActionAt) {
      data.firstAdminActionAt = new Date()
    }

    const updated = await prisma.vehicleRequestCase.update({
      where: { id: caseId },
      data,
    })

    await this.logEvent(
      caseId,
      actorUserId,
      "ADMIN",
      "CASE_ASSIGNED",
      existing.assignedAdminUserId,
      adminUserId,
    )

    return updated
  }

  async updateCaseStatus(
    caseId: string,
    newStatus: BuyerCaseStatus,
    adminSubStatus: AdminSubStatus | undefined,
    actorUserId: string,
    actorRole: string,
    notes?: string,
  ) {
    const existing = await prisma.vehicleRequestCase.findUnique({ where: { id: caseId } })
    if (!existing) throw new Error("Case not found")

    this.validateTransition(existing.status as BuyerCaseStatus, newStatus)

    const closedStatuses: BuyerCaseStatus[] = [
      BuyerCaseStatus.CLOSED_WON,
      BuyerCaseStatus.CLOSED_LOST,
      BuyerCaseStatus.CLOSED_CANCELLED,
    ]
    const isClosed = closedStatuses.includes(newStatus)

    const data: Record<string, unknown> = { status: newStatus }
    if (adminSubStatus !== undefined) data.adminSubStatus = adminSubStatus
    if (isClosed) data.closedAt = new Date()

    const updated = await prisma.vehicleRequestCase.update({
      where: { id: caseId },
      data,
    })

    await this.logEvent(caseId, actorUserId, actorRole, "STATUS_CHANGE", existing.status, newStatus, notes)

    return updated
  }

  // ---------------------------
  // Outreach
  // ---------------------------

  async addOutreachLog(caseId: string, data: AddOutreachLogInput, adminUserId: string) {
    const existing = await prisma.vehicleRequestCase.findUnique({ where: { id: caseId } })
    if (!existing) throw new Error("Case not found")

    const log = await prisma.sourcingOutreachLog.create({
      data: {
        caseId,
        adminUserId,
        dealerName: data.dealerName,
        contactMethod: data.contactMethod,
        outcome: data.outcome,
        occurredAt: data.occurredAt ?? new Date(),
        notes: data.notes,
      },
    })

    const earlySubStatuses: AdminSubStatus[] = [AdminSubStatus.NEW, AdminSubStatus.NEED_DEALERS]
    if (earlySubStatuses.includes(existing.adminSubStatus as AdminSubStatus)) {
      await prisma.vehicleRequestCase.update({
        where: { id: caseId },
        data: { adminSubStatus: AdminSubStatus.OUTREACH_IN_PROGRESS },
      })
    }

    return log
  }

  // ---------------------------
  // Offers
  // ---------------------------

  async createOffer(
    caseId: string,
    data: CreateOfferInput,
    actorUserId: string,
    sourceType: OfferSourceType,
  ) {
    const existing = await prisma.vehicleRequestCase.findUnique({ where: { id: caseId } })
    if (!existing) throw new Error("Case not found")

    const updateData: Record<string, unknown> = {}
    if (!existing.firstOfferAt) {
      updateData.firstOfferAt = new Date()
    }

    const offer = await prisma.sourcedOffer.create({
      data: {
        caseId,
        buyerId: existing.buyerId,
        sourceType,
        dealerId: data.dealerId,
        sourceDealerName: data.sourceDealerName,
        sourceDealerEmail: data.sourceDealerEmail,
        sourceDealerPhone: data.sourceDealerPhone,
        vin: data.vin,
        year: data.year,
        make: data.make,
        modelName: data.modelName,
        trim: data.trim,
        mileage: data.mileage,
        condition: data.condition,
        pricingBreakdownJson: data.pricingBreakdown ?? undefined,
        paymentTermsJson: data.paymentTerms ?? undefined,
        expiresAt: data.expiresAt,
        status: SourcedOfferStatus.DRAFT,
        ...(existing.workspaceId ? { workspaceId: existing.workspaceId } : {}),
      },
    })

    if (Object.keys(updateData).length > 0) {
      await prisma.vehicleRequestCase.update({ where: { id: caseId }, data: updateData })
    }

    await this.logEvent(caseId, actorUserId, "ADMIN", "OFFER_CREATED", undefined, offer.id)

    return offer
  }

  async presentOffer(offerId: string, actorUserId: string) {
    const offer = await prisma.sourcedOffer.findUnique({
      where: { id: offerId },
      include: { case: true },
    })
    if (!offer) throw new Error("Offer not found")

    const now = new Date()
    const updated = await prisma.sourcedOffer.update({
      where: { id: offerId },
      data: { status: SourcedOfferStatus.PRESENTED, presentedToBuyerAt: now },
    })

    if (offer.case.status === BuyerCaseStatus.SOURCING) {
      await prisma.vehicleRequestCase.update({
        where: { id: offer.caseId },
        data: { status: BuyerCaseStatus.OFFERS_AVAILABLE },
      })
    }

    await this.logEvent(offer.caseId, actorUserId, "ADMIN", "OFFER_PRESENTED", undefined, offerId)

    return updated
  }

  async withdrawOffer(offerId: string, actorUserId: string) {
    const offer = await prisma.sourcedOffer.findUnique({ where: { id: offerId } })
    if (!offer) throw new Error("Offer not found")

    const updated = await prisma.sourcedOffer.update({
      where: { id: offerId },
      data: { status: SourcedOfferStatus.DECLINED },
    })

    await this.logEvent(offer.caseId, actorUserId, "ADMIN", "OFFER_WITHDRAWN", undefined, offerId)

    return updated
  }

  async acceptOffer(caseId: string, offerId: string, buyerId: string, actorUserId?: string) {
    const existing = await prisma.vehicleRequestCase.findFirst({
      where: { id: caseId, buyerId },
      include: { offers: true },
    })
    if (!existing) throw new Error("Case not found")

    const offer = existing.offers.find((o: { id: string }) => o.id === offerId)
    if (!offer) throw new Error("Offer not found for this case")
    if (offer.status !== SourcedOfferStatus.PRESENTED) {
      throw new Error("Only presented offers can be accepted")
    }

    const now = new Date()

    // Accept the selected offer
    await prisma.sourcedOffer.update({
      where: { id: offerId },
      data: { status: SourcedOfferStatus.ACCEPTED, acceptedAt: now },
    })

    // Decline all other presented offers
    const otherPresentedIds = existing.offers
      .filter((o: { id: string; status: string }) => o.id !== offerId && o.status === SourcedOfferStatus.PRESENTED)
      .map((o: { id: string }) => o.id)

    if (otherPresentedIds.length > 0) {
      await prisma.sourcedOffer.updateMany({
        where: { id: { in: otherPresentedIds } },
        data: { status: SourcedOfferStatus.DECLINED },
      })
    }

    // Lock case and transition to OFFER_SELECTED
    const updated = await prisma.vehicleRequestCase.update({
      where: { id: caseId },
      data: {
        status: BuyerCaseStatus.OFFER_SELECTED,
        lockedAt: now,
        buyerResponseAt: now,
      },
    })

    // actorUserId should be the authenticated User.id for audit traceability.
    // Falls back to buyerId (BuyerProfile.id) for backward compat if not provided.
    await this.logEvent(caseId, actorUserId ?? buyerId, "BUYER", "OFFER_ACCEPTED", undefined, offerId)

    return updated
  }

  async getOffersForBuyer(caseId: string, buyerId: string) {
    const existing = await prisma.vehicleRequestCase.findFirst({
      where: { id: caseId, buyerId },
    })
    if (!existing) throw new Error("Case not found")

    return prisma.sourcedOffer.findMany({
      where: {
        caseId,
        buyerId,
        status: { in: [SourcedOfferStatus.PRESENTED, SourcedOfferStatus.ACCEPTED] },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  // ---------------------------
  // Dealer invites
  // ---------------------------

  async createDealerInvite(
    caseId: string,
    offerId: string,
    dealerEmail: string,
    dealerName: string,
    actorUserId: string,
  ) {
    const existing = await prisma.vehicleRequestCase.findUnique({ where: { id: caseId } })
    if (!existing) throw new Error("Case not found")

    const rawToken = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")
    const tokenExpiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

    const invite = await prisma.dealerInvite.create({
      data: {
        caseId,
        offerId,
        tokenHash,
        tokenExpiresAt,
        dealerEmail,
        dealerName,
        status: DealerInviteStatus.SENT,
      },
    })

    await prisma.vehicleRequestCase.update({
      where: { id: caseId },
      data: { status: BuyerCaseStatus.DEALER_INVITED },
    })

    await this.logEvent(caseId, actorUserId, "ADMIN", "INVITE_SENT", undefined, invite.id)

    return { invite, rawToken }
  }

  async validateDealerInvite(rawToken: string) {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")

    const invite = await prisma.dealerInvite.findUnique({ where: { tokenHash } })
    if (!invite) throw new Error("Invalid invite token")
    if (invite.status !== DealerInviteStatus.SENT) throw new Error("Invite has already been used")
    if (invite.tokenExpiresAt < new Date()) throw new Error("Invite token has expired")

    return invite
  }

  async claimDealerInvite(rawToken: string) {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")

    const invite = await prisma.dealerInvite.findUnique({ where: { tokenHash } })
    if (!invite) throw new Error("Invalid invite token")
    if (invite.status !== DealerInviteStatus.SENT) throw new Error("Invite has already been used")
    if (invite.tokenExpiresAt < new Date()) throw new Error("Invite token has expired")

    const updated = await prisma.dealerInvite.update({
      where: { id: invite.id },
      data: { status: DealerInviteStatus.CLAIMED },
    })

    return updated
  }

  async completeDealerInvite(inviteId: string, dealerUserId: string) {
    const invite = await prisma.dealerInvite.findUnique({
      where: { id: inviteId },
      include: { offer: true },
    })
    if (!invite) throw new Error("Invite not found")
    if (invite.status !== DealerInviteStatus.CLAIMED) throw new Error("Invite must be claimed first")

    // Get the accepted offer for pricing data
    const offer = invite.offer
    if (!offer) throw new Error("Associated offer not found")

    // Get the case to find the buyerId and workspace
    const requestCase = await prisma.vehicleRequestCase.findUnique({ where: { id: invite.caseId } })
    if (!requestCase) throw new Error("Case not found")

    // Get the buyer profile to link the SelectedDeal.
    // requestCase.buyerId is already a BuyerProfile.id (canonical ownership model),
    // so look up by id — NOT by userId.
    const buyerProfile = await prisma.buyerProfile.findUnique({ where: { id: requestCase.buyerId } })
    if (!buyerProfile) throw new Error("Buyer profile not found")

    // Get or create the dealer record
    const dealer = await prisma.dealer.findFirst({ where: { userId: dealerUserId } })
    if (!dealer) throw new Error("Dealer profile not found")

    // Extract pricing from the offer
    const pricing = (offer.pricingBreakdownJson as Record<string, number> | null) ?? {}
    const cashOtd = (pricing.cashOtdCents ?? 0) / 100
    const taxAmount = (pricing.taxCents ?? 0) / 100

    // Validate minimum required vehicle fields before creating deal
    const requiredFields: Array<keyof typeof offer> = [
      "vin", "year", "make", "modelName", "pricingBreakdownJson",
    ]
    const missingFields = requiredFields.filter(
      (field) => !offer[field],
    )
    if (missingFields.length > 0) {
      throw new Error(
        `SourcedOffer is missing required fields before SelectedDeal creation: ${missingFields.join(", ")}`,
      )
    }

    // Reserve the InventoryItem if one is linked
    if ((offer as Record<string, unknown>)["inventoryItemId"]) {
      const item = await prisma.inventoryItem.findUnique({
        where: { id: (offer as Record<string, unknown>)["inventoryItemId"] as string },
        select: { id: true, status: true },
      })

      if (item && item.status === "SOLD") {
        throw new Error(
          "InventoryItem is already SOLD — cannot create deal from sourced offer",
        )
      }

      if (item && item.status === "AVAILABLE") {
        await prisma.inventoryItem.update({
          where: { id: item.id },
          data: { status: "HOLD", updatedAt: new Date() },
        })
      }
    }

    // Complete the invite
    const updated = await prisma.dealerInvite.update({
      where: { id: inviteId },
      data: { status: DealerInviteStatus.COMPLETED },
    })

    // Create a SelectedDeal using proper sourcing FK fields (no FK overloading).
    // sourcingCaseId and sourcedOfferId link back to the sourcing entities.
    // auctionId/offerId/inventoryItemId are left null for sourced deals.
    const selectedDeal = await prisma.selectedDeal.create({
      data: {
        buyerId: buyerProfile.id,
        dealerId: dealer.id,
        workspaceId: requestCase.workspaceId ?? undefined,
        status: "SELECTED" as const,
        sourcingCaseId: invite.caseId,
        sourcedOfferId: offer.id,
        cashOtd,
        taxAmount,
        feesBreakdown: pricing,
        // auctionId/offerId/inventoryItemId intentionally omitted for sourced deals
      },
    })

    await prisma.vehicleRequestCase.update({
      where: { id: invite.caseId },
      data: { status: BuyerCaseStatus.IN_PLATFORM_TRANSACTION },
    })

    await this.logEvent(
      invite.caseId,
      dealerUserId,
      "DEALER",
      "DEALER_ONBOARDED",
      undefined,
      `inviteId=${inviteId},selectedDealId=${selectedDeal.id}`,
    )

    return { invite: updated, selectedDealId: selectedDeal.id }
  }

  // ---------------------------
  // Notes
  // ---------------------------

  async addNote(caseId: string, data: AddNoteInput, authorUserId: string, authorRole: string) {
    const existing = await prisma.vehicleRequestCase.findUnique({ where: { id: caseId } })
    if (!existing) throw new Error("Case not found")

    const note = await prisma.caseNote.create({
      data: {
        caseId,
        authorUserId,
        authorRole,
        content: data.content,
        isInternal: data.isInternal ?? true,
      },
    })

    await this.logEvent(caseId, authorUserId, authorRole, "NOTE_ADDED", undefined, note.id)

    return note
  }

  async listNotes(caseId: string) {
    return prisma.caseNote.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
    })
  }

  // ---------------------------
  // Event log
  // ---------------------------

  async logEvent(
    caseId: string,
    actorUserId: string,
    actorRole: string,
    action: string,
    beforeValue?: string,
    afterValue?: string,
    notes?: string,
  ) {
    return prisma.caseEventLog.create({
      data: {
        caseId,
        actorUserId,
        actorRole,
        action,
        beforeValue: beforeValue ?? null,
        afterValue: afterValue ?? null,
        notes: notes ?? null,
      },
    })
  }

  // ---------------------------
  // Buyer contact for notifications
  // ---------------------------

  /**
   * Look up the buyer's email and name from a sourcing case.
   * Maps to Prompt 5 canonical: sourcing_cases → buyer contact resolution.
   * Correctly resolves BuyerProfile.id → User email (buyerId is BuyerProfile.id).
   *
   * @returns Contact info `{ email, buyerName, userId }`, or `null` when
   *          the case is not found or the buyer has no email on file.
   */
  async getCaseBuyerContact(
    caseId: string,
  ): Promise<{ email: string; buyerName: string; userId: string } | null> {
    const caseData = await prisma.vehicleRequestCase.findUnique({
      where: { id: caseId },
      select: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { id: true, email: true } },
          },
        },
      },
    })

    const buyer = caseData?.buyer
    if (!buyer?.user?.email) return null

    const buyerName = [buyer.firstName, buyer.lastName].filter(Boolean).join(" ") || "Customer"
    return { email: buyer.user.email, buyerName, userId: buyer.user.id }
  }

  /**
   * Look up the buyer's email and name from a sourced offer's linked case.
   * Used by the present-offer route to send fire-and-forget notifications.
   *
   * @returns Contact info `{ email, buyerName, userId }`, or `null` when
   *          the offer is not found or the buyer has no email on file.
   */
  async getOfferBuyerContact(
    offerId: string,
  ): Promise<{ email: string; buyerName: string; userId: string } | null> {
    const offer = await prisma.sourcedOffer.findUnique({
      where: { id: offerId },
      select: {
        case: {
          select: {
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                user: { select: { id: true, email: true } },
              },
            },
          },
        },
      },
    })

    const buyer = offer?.case?.buyer
    if (!buyer?.user?.email) return null

    const buyerName = [buyer.firstName, buyer.lastName].filter(Boolean).join(" ") || "Customer"
    return { email: buyer.user.email, buyerName, userId: buyer.user.id }
  }

  // ---------------------------
  // Helpers
  // ---------------------------

  /**
   * Build a human-readable vehicle summary string from offer fields.
   * E.g. "2024 Toyota Camry XSE" or "your requested vehicle" as fallback.
   */
  static buildVehicleSummary(offer: {
    year?: number | null
    make?: string | null
    modelName?: string | null
    trim?: string | null
  }): string {
    return (
      [offer.year, offer.make, offer.modelName, offer.trim]
        .filter(Boolean)
        .join(" ") || "your requested vehicle"
    )
  }

  private validateTransition(current: BuyerCaseStatus, next: BuyerCaseStatus): void {
    const allowed = VALID_CASE_TRANSITIONS[current]
    if (!allowed || !allowed.includes(next)) {
      throw new Error(`Invalid status transition: ${current} → ${next}`)
    }
  }
}

export const sourcingService = new SourcingService()
export default sourcingService
