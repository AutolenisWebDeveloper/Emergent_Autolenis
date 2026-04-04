/**
 * CTA Resolver – computes the single best next-step CTA for a buyer.
 *
 * The CTA is derived from live buyer context, NOT hardcoded per intent.
 * Each response includes exactly one primary CTA that moves the buyer
 * forward in the funnel:
 *   prequal → shortlist → offers/auction → select deal →
 *   contract shield → e-sign → pickup → complete
 */

import type { BuyerContext, ResolvedCTA, FAQCardData } from "./types"
import type { IntentMatchResult } from "./types"

// ---------------------------------------------------------------------------
// Default (empty) buyer context – used when context is unavailable
// ---------------------------------------------------------------------------

export const DEFAULT_BUYER_CONTEXT: BuyerContext = {
  prequal: { status: "NOT_STARTED" },
  shortlist: { count: 0 },
  auction: { status: "NOT_STARTED" },
  offers: { status: "NOT_STARTED" },
  selectedDeal: { status: "NONE" },
  contractShield: { status: "NOT_STARTED" },
  esign: { status: "NOT_STARTED" },
  pickup: { status: "NOT_STARTED" },
}

// ---------------------------------------------------------------------------
// CTA resolution logic (state machine)
// ---------------------------------------------------------------------------

/**
 * Resolve the single primary CTA based on live buyer context.
 *
 * Decision tree (evaluated top to bottom — first match wins):
 *  1. Prequal not approved → Start/Finish Prequal
 *  2. Shortlist empty → Build Your Shortlist
 *  3. No active auction and offers not ready → Request Offers
 *  4. Offers ready but no deal selected → Compare Offers
 *  5. Contract Shield needs action → Upload / Review Contract
 *  6. E-sign not complete → Open E-Sign
 *  7. Pickup not scheduled → Schedule Pickup
 *  8. All done → View Next Step / Share Referral
 */
export function resolvePrimaryCTA(
  _intentId: string,
  context: BuyerContext,
): ResolvedCTA {
  // 1. Prequal
  if (context.prequal.status !== "APPROVED") {
    const isInProgress = context.prequal.status === "IN_PROGRESS"
    return {
      label: isInProgress ? "Finish Pre-Qualification" : "Start Pre-Qualification",
      actionType: isInProgress ? "resumePreQual" : "startPreQual",
      payload: {},
      isEnabled: true,
      disabledReason: null,
    }
  }

  // 2. Shortlist
  if (context.shortlist.count === 0) {
    return {
      label: "Build Your Shortlist",
      actionType: "buildShortlist",
      payload: {},
      isEnabled: true,
      disabledReason: null,
    }
  }

  // 3. Offers / Auction
  if (context.offers.status !== "READY" && context.auction.status !== "ACTIVE") {
    const isAuctionStarted = context.auction.status === "IN_PROGRESS"
    return {
      label: isAuctionStarted ? "View Auction Status" : "Request Offers",
      actionType: isAuctionStarted ? "viewAuction" : "requestOffers",
      payload: {},
      isEnabled: true,
      disabledReason: null,
    }
  }

  // 4. Compare / Select deal
  if (context.offers.status === "READY" && context.selectedDeal.status === "NONE") {
    return {
      label: "Compare Offers",
      actionType: "compareOffers",
      payload: {},
      isEnabled: true,
      disabledReason: null,
    }
  }

  // 5. Contract Shield
  const csNeedsAction = ["NOT_UPLOADED", "REJECT", "MANUAL_REVIEW"].includes(
    context.contractShield.status,
  )
  if (csNeedsAction) {
    const isReject = context.contractShield.status === "REJECT"
    const isManual = context.contractShield.status === "MANUAL_REVIEW"
    return {
      label: isReject
        ? "Review Contract Issues"
        : isManual
          ? "Check Manual Review Status"
          : "Upload Contract",
      actionType: isReject
        ? "reviewContractIssues"
        : isManual
          ? "checkManualReview"
          : "uploadContract",
      payload: {},
      isEnabled: true,
      disabledReason: null,
    }
  }

  // 6. E-sign
  if (context.esign.status !== "SIGNED") {
    return {
      label: "Open E-Sign",
      actionType: "openESign",
      payload: {},
      isEnabled: true,
      disabledReason: null,
    }
  }

  // 7. Pickup
  if (context.pickup.status !== "SCHEDULED" && context.pickup.status !== "COMPLETED") {
    return {
      label: "Schedule Pickup",
      actionType: "schedulePickup",
      payload: {},
      isEnabled: true,
      disabledReason: null,
    }
  }

  // 8. Complete — suggest referral
  return {
    label: "Share Your Referral Link",
    actionType: "shareReferral",
    payload: {},
    isEnabled: true,
    disabledReason: null,
  }
}

// ---------------------------------------------------------------------------
// FAQ Card builder
// ---------------------------------------------------------------------------

/**
 * Build the complete FAQ card data from a matched intent and buyer context.
 */
export function buildFAQCard(
  match: IntentMatchResult,
  context: BuyerContext,
): FAQCardData {
  const cta = resolvePrimaryCTA(match.intentId, context)
  return {
    intentId: match.intentId,
    category: match.category,
    title: match.intent.title,
    answerMarkdown: match.intent.answer_markdown,
    cta,
    disclosure: match.intent.disclosure,
    confidence: match.confidence,
  }
}
