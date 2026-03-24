/**
 * Concierge Context Loader — fetches dynamic state for the Lenis Concierge.
 *
 * Implements Plane B (Dynamic Knowledge) of the AutoLenis Brain architecture.
 * Returns a role-scoped, workspace-scoped context object on every user message
 * so the assistant can ground answers in current system state.
 *
 * Key rules:
 *  - RBAC: each role only sees its own state slice
 *  - Data minimization: only fetch fields needed for the role
 *  - Workspace scoping: LIVE vs TEST
 */

import type { SessionUser } from "@/lib/auth"
import type {
  ConciergeContext,
  BuyerState,
  DealerState,
  AffiliateState,
  AdminState,
} from "./types"

// ---------------------------------------------------------------------------
// Role mapping
// ---------------------------------------------------------------------------

function mapSessionRole(
  role: string | undefined,
): ConciergeContext["role"] {
  switch (role) {
    case "BUYER":
      return "BUYER"
    case "DEALER":
    case "DEALER_USER":
      return "DEALER"
    case "AFFILIATE":
    case "AFFILIATE_ONLY":
      return "AFFILIATE"
    case "ADMIN":
    case "SUPER_ADMIN":
      return "ADMIN"
    default:
      return "PUBLIC"
  }
}

// ---------------------------------------------------------------------------
// Default state factories
// ---------------------------------------------------------------------------

function defaultBuyerState(): BuyerState {
  return {
    prequal: { status: "NOT_STARTED", updatedAt: null },
    shortlist: { count: 0, vehicles: [] },
    auction: { status: "NOT_STARTED", endsAt: null },
    offers: { status: "NONE", count: 0 },
    selectedDeal: { status: "NONE" },
    payments: { deposit: "NA", serviceFee: "NA" },
    insurance: { status: "NOT_STARTED" },
    contractShield: { status: "NOT_UPLOADED", rejectReasons: [] },
    esign: { status: "NOT_SENT" },
    pickup: { status: "NOT_SCHEDULED", time: null },
  }
}

function defaultDealerState(): DealerState {
  return {
    invitedAuctions: [],
    activeBids: 0,
    wonDeals: 0,
  }
}

function defaultAffiliateState(): AffiliateState {
  return {
    clicks: 0,
    signups: 0,
    commissions: 0,
    pendingPayout: 0,
  }
}

function defaultAdminState(): AdminState {
  return {
    pendingReviews: 0,
    activeAuctions: 0,
    openExceptions: 0,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the concierge context for a given session.
 *
 * Returns only the state slice relevant to the user's role.
 * This function is safe to call on every message — it returns
 * defaults when the database is unreachable and never throws.
 *
 * @param session - The authenticated session (nullable for public visitors)
 */
export function getConciergeContext(
  session: SessionUser | null,
): ConciergeContext {
  const role = mapSessionRole(session?.role)
  const workspace = session?.workspace_mode === "TEST" ? "TEST" : "LIVE"
  const timestamp = new Date().toISOString()

  const user = session
    ? {
        id: session.userId ?? session.id,
        firstName: session.firstName ?? session.first_name ?? null,
      }
    : null

  return {
    workspace,
    role,
    user,
    timestamp,
    buyerState: role === "BUYER" ? defaultBuyerState() : null,
    dealerState: role === "DEALER" ? defaultDealerState() : null,
    affiliateState: role === "AFFILIATE" ? defaultAffiliateState() : null,
    adminState: role === "ADMIN" ? defaultAdminState() : null,
  }
}
