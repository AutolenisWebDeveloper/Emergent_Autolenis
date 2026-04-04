/**
 * Next Best Step Resolver — deterministic lifecycle state machine.
 *
 * Maps the buyer's current lifecycle state to a single next-best-step CTA
 * and a set of Action Cards displayed in the concierge panel.
 *
 * The 13-system flow:
 *   1. Prequal → 2. Shortlist → 3. Deposit/Auction → 4. Best Price →
 *   5. Financing/Fee → 6. Insurance → 7. Contract Shield → 8. E-Sign →
 *   9. Pickup + 10. Affiliate / 11. Admin / 12. Dealer / 13. Completed
 *
 * Each lifecycle state maps to exactly ONE CTA and zero or more action cards.
 * The resolver never hallucinates — it only uses verified data.
 */

import type { AIRole } from "./context-builder"
import type {
  BuyerLifecycleContext,
  DealerDashContext,
  AffiliateDashContext,
  AdminDashContext,
  ConciergeContext,
} from "./context-loader"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LifecycleStep =
  | "prequal"
  | "shortlist"
  | "deposit"
  | "auction"
  | "best_price"
  | "financing_fee"
  | "insurance"
  | "contract_shield"
  | "esign"
  | "pickup"
  | "completed"

export type ActionCardType =
  | "resume_flow"
  | "upload"
  | "pay"
  | "schedule"
  | "view_fix_list"
  | "start_prequal"
  | "create_request"
  | "track_auction"
  | "review_offers"
  | "submit_bid"
  | "view_commissions"
  | "generate_link"
  | "view_report"

export interface ActionCard {
  type: ActionCardType
  label: string
  description: string
  href: string | null
  priority: number
}

export interface NextStepResult {
  currentStep: LifecycleStep | "onboarding" | "dealer_active" | "affiliate_active" | "admin_active"
  cta: {
    label: string
    description: string
    href: string | null
  }
  actionCards: ActionCard[]
  statusStripSteps: StatusStripStep[]
}

export interface StatusStripStep {
  key: LifecycleStep
  label: string
  status: "completed" | "active" | "upcoming"
}

// ---------------------------------------------------------------------------
// Status strip builder
// ---------------------------------------------------------------------------

const LIFECYCLE_STEPS: { key: LifecycleStep; label: string }[] = [
  { key: "prequal", label: "Prequal" },
  { key: "auction", label: "Auction" },
  { key: "financing_fee", label: "Payments" },
  { key: "insurance", label: "Insurance" },
  { key: "contract_shield", label: "Contract" },
  { key: "esign", label: "E-Sign" },
  { key: "pickup", label: "Pickup" },
]

function buildStatusStrip(currentStep: LifecycleStep): StatusStripStep[] {
  const currentIdx = LIFECYCLE_STEPS.findIndex((s) => s.key === currentStep)

  return LIFECYCLE_STEPS.map((step, idx) => ({
    key: step.key,
    label: step.label,
    status:
      idx < currentIdx
        ? ("completed" as const)
        : idx === currentIdx
          ? ("active" as const)
          : ("upcoming" as const),
  }))
}

// ---------------------------------------------------------------------------
// Deal status groups (for readable conditions)
// ---------------------------------------------------------------------------

const FEE_PENDING_STATUSES: readonly string[] = ["SELECTED", "FEE_PENDING", "FINANCING_PENDING", "FINANCING_APPROVED"]
const INSURANCE_PENDING_STATUSES: readonly string[] = ["FEE_PAID", "INSURANCE_PENDING"]
const CONTRACT_REVIEW_STATUSES: readonly string[] = ["INSURANCE_COMPLETE", "CONTRACT_PENDING", "CONTRACT_REVIEW", "CONTRACT_MANUAL_REVIEW_REQUIRED", "CONTRACT_INTERNAL_FIX_IN_PROGRESS"]
const ESIGN_PENDING_STATUSES: readonly string[] = ["CONTRACT_APPROVED", "CONTRACT_ADMIN_OVERRIDE_APPROVED", "SIGNING_PENDING"]
const PICKUP_STATUSES: readonly string[] = ["SIGNED", "PICKUP_SCHEDULED"]

// ---------------------------------------------------------------------------
// Buyer resolver
// ---------------------------------------------------------------------------

function resolveBuyerNextStep(buyer: BuyerLifecycleContext): NextStepResult {
  // 1. No prequal → start prequal
  if (!buyer.prequal.exists) {
    return {
      currentStep: "prequal",
      cta: {
        label: "Start Pre-Qualification",
        description: "Get an estimate of what you can afford. Takes ~2 minutes.",
        href: "/buyer/prequal",
      },
      actionCards: [
        {
          type: "start_prequal",
          label: "Start Pre-Qualification",
          description: "Soft credit check — no impact to your score",
          href: "/buyer/prequal",
          priority: 1,
        },
      ],
      statusStripSteps: buildStatusStrip("prequal"),
    }
  }

  // 2. Prequal done but no shortlist/request → create request
  if (buyer.shortlist.count === 0 && !buyer.auction && !buyer.deal) {
    return {
      currentStep: "shortlist",
      cta: {
        label: "Create Vehicle Request",
        description: "Tell us what you're looking for and we'll make dealers compete.",
        href: "/buyer/requests/new",
      },
      actionCards: [
        {
          type: "create_request",
          label: "Create Vehicle Request",
          description: "Specify vehicle, budget, and preferences",
          href: "/buyer/requests/new",
          priority: 1,
        },
      ],
      statusStripSteps: buildStatusStrip("shortlist"),
    }
  }

  // 3. Auction pending deposit
  if (buyer.auction?.status === "PENDING_DEPOSIT") {
    return {
      currentStep: "deposit",
      cta: {
        label: "Pay Refundable Deposit",
        description: "Secure your auction slot with a refundable deposit.",
        href: "/buyer/payments",
      },
      actionCards: [
        {
          type: "pay",
          label: "Pay Deposit",
          description: "Refundable deposit to start your dealer auction",
          href: "/buyer/payments",
          priority: 1,
        },
      ],
      statusStripSteps: buildStatusStrip("deposit"),
    }
  }

  // 4. Auction active → track
  if (buyer.auction?.status === "ACTIVE") {
    return {
      currentStep: "auction",
      cta: {
        label: "Track Your Auction",
        description: `${buyer.auction.offerCount} offer(s) received. Dealers are competing for your business.`,
        href: "/buyer/auction",
      },
      actionCards: [
        {
          type: "track_auction",
          label: "View Auction Progress",
          description: `${buyer.auction.offerCount} dealer offer(s) so far`,
          href: "/buyer/auction",
          priority: 1,
        },
      ],
      statusStripSteps: buildStatusStrip("auction"),
    }
  }

  // 5. Auction closed / best price → review offers
  if (buyer.auction?.status === "CLOSED" || buyer.auction?.status === "COMPLETED") {
    if (!buyer.deal) {
      return {
        currentStep: "best_price",
        cta: {
          label: "Review Dealer Offers",
          description: "Your auction is complete. Review and select the best offer.",
          href: "/buyer/auction",
        },
        actionCards: [
          {
            type: "review_offers",
            label: "Review Offers",
            description: `${buyer.auction.offerCount} offer(s) to compare`,
            href: "/buyer/auction",
            priority: 1,
          },
        ],
        statusStripSteps: buildStatusStrip("best_price"),
      }
    }
  }

  // 6. Deal selected, fee pending
  if (buyer.deal) {
    const ds = buyer.deal.status

    if (FEE_PENDING_STATUSES.includes(ds)) {
      return {
        currentStep: "financing_fee",
        cta: {
          label: "Complete Payment",
          description: "Pay the concierge service fee to proceed with your deal.",
          href: "/buyer/payments",
        },
        actionCards: [
          {
            type: "pay",
            label: "Pay Service Fee",
            description: buyer.deal.vehicleSummary
              ? `For your ${buyer.deal.vehicleSummary}`
              : "Concierge service fee",
            href: "/buyer/payments",
            priority: 1,
          },
        ],
        statusStripSteps: buildStatusStrip("financing_fee"),
      }
    }

    if (INSURANCE_PENDING_STATUSES.includes(ds)) {
      return {
        currentStep: "insurance",
        cta: {
          label: "Set Up Insurance",
          description: "Add insurance coverage before contract review.",
          href: "/buyer/insurance",
        },
        actionCards: [
          {
            type: "resume_flow",
            label: "Set Up Insurance",
            description: "Get quotes or upload existing policy",
            href: "/buyer/insurance",
            priority: 1,
          },
          {
            type: "upload",
            label: "Upload Insurance Proof",
            description: "Already have coverage? Upload your proof.",
            href: "/buyer/documents",
            priority: 2,
          },
        ],
        statusStripSteps: buildStatusStrip("insurance"),
      }
    }

    if (CONTRACT_REVIEW_STATUSES.includes(ds)) {
      const cards: ActionCard[] = [
        {
          type: "resume_flow",
          label: "Review Contract",
          description: "Contract Shield is analyzing your deal documents.",
          href: "/buyer/contracts",
          priority: 1,
        },
      ]
      if (buyer.contractShield.issuesFound) {
        cards.push({
          type: "view_fix_list",
          label: "View Fix List",
          description: "Issues detected — review recommended fixes.",
          href: "/buyer/contracts",
          priority: 1,
        })
      }

      return {
        currentStep: "contract_shield",
        cta: {
          label: buyer.contractShield.issuesFound ? "Review Contract Issues" : "Review Contract",
          description: buyer.contractShield.issuesFound
            ? "Contract Shield found issues that need attention."
            : "Your contract is being reviewed by Contract Shield.",
          href: "/buyer/contracts",
        },
        actionCards: cards,
        statusStripSteps: buildStatusStrip("contract_shield"),
      }
    }

    if (ESIGN_PENDING_STATUSES.includes(ds)) {
      return {
        currentStep: "esign",
        cta: {
          label: "Sign Your Contract",
          description: "Your contract is approved. Complete your e-signature.",
          href: "/buyer/contracts",
        },
        actionCards: [
          {
            type: "resume_flow",
            label: "Open E-Sign",
            description: "Sign your contract electronically",
            href: "/buyer/contracts",
            priority: 1,
          },
        ],
        statusStripSteps: buildStatusStrip("esign"),
      }
    }

    if (PICKUP_STATUSES.includes(ds)) {
      return {
        currentStep: "pickup",
        cta: {
          label: buyer.pickup.scheduledDate ? "View Pickup Details" : "Schedule Pickup",
          description: buyer.pickup.scheduledDate
            ? `Pickup scheduled for ${new Date(buyer.pickup.scheduledDate).toLocaleDateString()}`
            : "Your deal is signed. Schedule your vehicle pickup.",
          href: "/buyer/deal",
        },
        actionCards: [
          {
            type: "schedule",
            label: buyer.pickup.scheduledDate ? "View Pickup" : "Schedule Pickup",
            description: "Coordinate your vehicle pickup",
            href: "/buyer/deal",
            priority: 1,
          },
        ],
        statusStripSteps: buildStatusStrip("pickup"),
      }
    }

    if (ds === "COMPLETED") {
      return {
        currentStep: "completed",
        cta: {
          label: "View Deal Summary",
          description: "Congratulations! Your deal is complete.",
          href: "/buyer/deal",
        },
        actionCards: [],
        statusStripSteps: buildStatusStrip("completed"),
      }
    }
  }

  // Fallback — shortlist exists but no auction yet
  return {
    currentStep: "shortlist",
    cta: {
      label: "Check Request Status",
      description: "Your vehicle request is being processed.",
      href: "/buyer/requests",
    },
    actionCards: [
      {
        type: "resume_flow",
        label: "View Requests",
        description: "Check the status of your vehicle requests",
        href: "/buyer/requests",
        priority: 1,
      },
    ],
    statusStripSteps: buildStatusStrip("shortlist"),
  }
}

// ---------------------------------------------------------------------------
// Dealer resolver
// ---------------------------------------------------------------------------

function resolveDealerNextStep(dealer: DealerDashContext): NextStepResult {
  if (dealer.activeAuctions > 0) {
    return {
      currentStep: "dealer_active",
      cta: {
        label: "Review Active Auctions",
        description: `${dealer.activeAuctions} auction(s) awaiting your bid.`,
        href: "/dealer/auctions",
      },
      actionCards: [
        {
          type: "submit_bid",
          label: "Submit Bids",
          description: `${dealer.activeAuctions} active auction(s)`,
          href: "/dealer/auctions",
          priority: 1,
        },
      ],
      statusStripSteps: [],
    }
  }

  return {
    currentStep: "dealer_active",
    cta: {
      label: "View Dashboard",
      description: "No active auctions. Check your dealer dashboard.",
      href: "/dealer/dashboard",
    },
    actionCards: [],
    statusStripSteps: [],
  }
}

// ---------------------------------------------------------------------------
// Affiliate resolver
// ---------------------------------------------------------------------------

function resolveAffiliateNextStep(affiliate: AffiliateDashContext): NextStepResult {
  const cards: ActionCard[] = [
    {
      type: "generate_link",
      label: "Generate Referral Link",
      description: "Share your link to earn commissions",
      href: "/affiliate/portal",
      priority: 1,
    },
    {
      type: "view_commissions",
      label: "View Commissions",
      description: `$${affiliate.pendingCommissions} pending`,
      href: "/affiliate/commissions",
      priority: 2,
    },
  ]

  return {
    currentStep: "affiliate_active",
    cta: {
      label: affiliate.pendingCommissions > 0 ? "View Pending Commissions" : "Grow Your Network",
      description: affiliate.pendingCommissions > 0
        ? `$${affiliate.pendingCommissions} in pending commissions.`
        : `${affiliate.totalSignups} signup(s) from ${affiliate.totalClicks} click(s).`,
      href: affiliate.pendingCommissions > 0 ? "/affiliate/commissions" : "/affiliate/portal",
    },
    actionCards: cards,
    statusStripSteps: [],
  }
}

// ---------------------------------------------------------------------------
// Admin resolver
// ---------------------------------------------------------------------------

function resolveAdminNextStep(admin: AdminDashContext): NextStepResult {
  const cards: ActionCard[] = []

  if (admin.pendingPayouts > 0) {
    cards.push({
      type: "view_report",
      label: "Pending Payouts",
      description: `${admin.pendingPayouts} payout(s) awaiting processing`,
      href: "/admin/payments",
      priority: 1,
    })
  }

  if (admin.pendingAuctions > 0) {
    cards.push({
      type: "view_report",
      label: "Active Auctions",
      description: `${admin.pendingAuctions} auction(s) in progress`,
      href: "/admin/auctions",
      priority: 2,
    })
  }

  return {
    currentStep: "admin_active",
    cta: {
      label: "View Operations Dashboard",
      description: `${admin.activeDeals} active deal(s), ${admin.pendingAuctions} auction(s), ${admin.pendingPayouts} pending payout(s).`,
      href: "/admin/dashboard",
    },
    actionCards: cards,
    statusStripSteps: [],
  }
}

// ---------------------------------------------------------------------------
// Public resolver
// ---------------------------------------------------------------------------

export function resolveNextStep(ctx: ConciergeContext): NextStepResult {
  if (ctx.buyer) return resolveBuyerNextStep(ctx.buyer)
  if (ctx.dealer) return resolveDealerNextStep(ctx.dealer)
  if (ctx.affiliate) return resolveAffiliateNextStep(ctx.affiliate)
  if (ctx.admin) return resolveAdminNextStep(ctx.admin)

  // Public / unauthenticated
  return {
    currentStep: "onboarding",
    cta: {
      label: "Get Started",
      description: "Create an account to start your car buying journey.",
      href: "/auth/signup",
    },
    actionCards: [
      {
        type: "start_prequal",
        label: "Check What You Can Afford",
        description: "Quick pre-qualification, no credit impact",
        href: "/auth/signup",
        priority: 1,
      },
      {
        type: "create_request",
        label: "Start a Vehicle Request",
        description: "Tell us what you want and we'll find it",
        href: "/auth/signup",
        priority: 2,
      },
    ],
    statusStripSteps: [],
  }
}
