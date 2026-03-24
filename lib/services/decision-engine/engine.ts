/**
 * Unified Decision Engine — Core Resolution Logic
 *
 * Centralizes all platform decision logic into canonical resolution functions.
 * Consumes platform signals and outputs canonical states.
 *
 * Downstream consumers should call these canonical resolvers instead of
 * implementing fragmented decision checks in routes or pages.
 */

import type {
  BuyerReadinessState,
  BuyerMessagingEligibilityState,
  DealerOperationalState,
  DealProgressionState,
  ContractResolutionState,
  ESignReadinessState,
  PickupReadinessState,
  PayoutReleaseState,
  RefundHoldState,
  ComplianceHoldReasonCode,
  DecisionInputs,
  DecisionOutput,
  DecisionSourceEntry,
  BuyerSignals,
  DealerSignals,
  DealSignals,
  AffiliateSignals,
} from "./types"

// ---------------------------------------------------------------------------
// Buyer Readiness Resolution
// ---------------------------------------------------------------------------

export function resolveBuyerReadiness(buyer: BuyerSignals): BuyerReadinessState {
  if (buyer.manualHold || buyer.complianceFlags.length > 0) return "HOLD"
  if (!buyer.profileComplete) return "PROFILE_INCOMPLETE"

  // External preapproval path
  if (buyer.externalPreApproval.exists) {
    if (buyer.externalPreApproval.status === "APPROVED") return "EXTERNAL_PREAPPROVAL_APPROVED"
    if (
      buyer.externalPreApproval.status === "SUBMITTED" ||
      buyer.externalPreApproval.status === "IN_REVIEW"
    )
      return "EXTERNAL_PREAPPROVAL_PENDING"
  }

  // Cash path
  if (buyer.cashBasis) return "CASH_DECLARED"

  // Internal prequal path
  if (buyer.prequal.exists) {
    const status = buyer.prequal.status
    if (status === "ACTIVE" || status === null) {
      if (buyer.prequal.softPullCompleted && buyer.prequal.consentGiven) {
        return "PREQUAL_ACTIVE"
      }
      return "PREQUAL_PENDING"
    }
    if (status === "PENDING") return "PREQUAL_PENDING"
    // Expired/Revoked/Failed prequal means not ready
    return "PREQUAL_REQUIRED"
  }

  return "PREQUAL_REQUIRED"
}

// ---------------------------------------------------------------------------
// Buyer Messaging Eligibility Resolution
// ---------------------------------------------------------------------------

export function resolveBuyerMessagingEligibility(
  buyer: BuyerSignals
): BuyerMessagingEligibilityState {
  if (buyer.manualHold || buyer.complianceFlags.length > 0) return "INELIGIBLE_HOLD"

  // Internal prequal active
  if (
    buyer.prequal.exists &&
    buyer.prequal.source === "INTERNAL" &&
    (buyer.prequal.status === "ACTIVE" || buyer.prequal.status === null)
  ) {
    return "ELIGIBLE"
  }

  // External preapproval approved
  if (buyer.externalPreApproval.exists) {
    if (buyer.externalPreApproval.status === "APPROVED") return "ELIGIBLE"
    if (
      buyer.externalPreApproval.status === "REJECTED" ||
      buyer.externalPreApproval.status === "SUPERSEDED"
    )
      return "INELIGIBLE_REJECTED"
    if (buyer.externalPreApproval.status === "EXPIRED") return "INELIGIBLE_EXPIRED"
  }

  // External manual prequal with cross-validation
  if (
    buyer.prequal.exists &&
    buyer.prequal.source === "EXTERNAL_MANUAL" &&
    (buyer.prequal.status === "ACTIVE" || buyer.prequal.status === null)
  ) {
    if (buyer.externalPreApproval.exists && buyer.externalPreApproval.status === "APPROVED") {
      return "ELIGIBLE"
    }
    return "INELIGIBLE_REJECTED"
  }

  // Cash basis with explicit deal
  if (buyer.cashBasis) return "ELIGIBLE"

  return "INELIGIBLE_NO_APPROVAL"
}

// ---------------------------------------------------------------------------
// Dealer Operational State Resolution
// ---------------------------------------------------------------------------

export function resolveDealerOperationalState(
  dealer: DealerSignals
): DealerOperationalState {
  if (dealer.manualHold || dealer.complianceFlags.length > 0) return "SUSPENDED"
  if (dealer.highRisk) return "HIGH_RISK"
  if (!dealer.verified) return "PENDING_VERIFICATION"
  if (dealer.integrityScore < 50) return "SUSPENDED"
  return "ACTIVE"
}

// ---------------------------------------------------------------------------
// Deal Progression State Resolution
// ---------------------------------------------------------------------------

const DEAL_STATUS_TO_PROGRESSION: Record<string, DealProgressionState> = {
  SELECTED: "SELECTED",
  FINANCING_PENDING: "FINANCING",
  FINANCING_APPROVED: "FINANCING",
  FEE_PENDING: "FEE_STAGE",
  FEE_PAID: "FEE_STAGE",
  INSURANCE_PENDING: "INSURANCE_STAGE",
  INSURANCE_COMPLETE: "INSURANCE_STAGE",
  CONTRACT_PENDING: "CONTRACT_STAGE",
  CONTRACT_REVIEW: "CONTRACT_STAGE",
  CONTRACT_MANUAL_REVIEW_REQUIRED: "CONTRACT_STAGE",
  CONTRACT_INTERNAL_FIX_IN_PROGRESS: "CONTRACT_STAGE",
  CONTRACT_ADMIN_OVERRIDE_APPROVED: "CONTRACT_STAGE",
  CONTRACT_APPROVED: "CONTRACT_STAGE",
  SIGNING_PENDING: "SIGNING_STAGE",
  SIGNED: "SIGNING_STAGE",
  PICKUP_SCHEDULED: "PICKUP_STAGE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
}

export function resolveDealProgressionState(deal: DealSignals): DealProgressionState {
  if (deal.manualHold || deal.complianceFlags.length > 0) return "HOLD"
  return DEAL_STATUS_TO_PROGRESSION[deal.dealStatus] ?? "SELECTED"
}

// ---------------------------------------------------------------------------
// Contract Resolution State
// ---------------------------------------------------------------------------

export function resolveContractResolutionState(deal: DealSignals): ContractResolutionState {
  if (!deal.contractUploaded) {
    // Check if we're at or past the contract stage
    const contractStatuses = [
      "CONTRACT_PENDING",
      "CONTRACT_REVIEW",
      "CONTRACT_MANUAL_REVIEW_REQUIRED",
      "CONTRACT_INTERNAL_FIX_IN_PROGRESS",
      "CONTRACT_ADMIN_OVERRIDE_APPROVED",
      "CONTRACT_APPROVED",
    ]
    if (contractStatuses.includes(deal.dealStatus)) return "PENDING_UPLOAD"
    return "NOT_STARTED"
  }

  if (deal.cmaApproved) return "APPROVED"
  if (deal.cmaStatus === "OPEN" || deal.cmaStatus === "PENDING_SECOND_APPROVAL")
    return "MANUAL_REVIEW_REQUIRED"
  if (deal.cmaStatus === "RETURNED_INTERNAL_FIX") return "INTERNAL_FIX_IN_PROGRESS"
  if (deal.contractScanPassed) return "PASSED"
  if (deal.contractScanStatus === "SCANNING") return "SCANNING"
  if (deal.contractScanStatus === "FAILED" || deal.contractScanStatus === "ISSUES_FOUND")
    return "FAILED"

  // Admin override
  if (deal.dealStatus === "CONTRACT_ADMIN_OVERRIDE_APPROVED") return "ADMIN_OVERRIDE_APPROVED"
  if (deal.dealStatus === "CONTRACT_APPROVED") return "APPROVED"

  return "SCANNING"
}

// ---------------------------------------------------------------------------
// E-Sign Readiness Resolution
// ---------------------------------------------------------------------------

export function resolveESignReadiness(deal: DealSignals): ESignReadinessState {
  if (deal.complianceFlags.length > 0 || deal.manualHold) return "BLOCKED"

  // E-sign requires contract approved + deal at signing stage
  const contractApproved =
    deal.dealStatus === "CONTRACT_APPROVED" ||
    deal.dealStatus === "CONTRACT_ADMIN_OVERRIDE_APPROVED" ||
    deal.dealStatus === "SIGNING_PENDING" ||
    deal.dealStatus === "SIGNED"

  if (!contractApproved) return "NOT_READY"

  const esign = deal.esignStatus
  if (!esign) return "READY"
  if (esign === "COMPLETED") return "COMPLETED"
  if (esign === "SIGNED") return "SIGNED"
  if (esign === "VIEWED") return "VIEWED"
  if (esign === "SENT") return "SENT"
  if (esign === "CREATED") return "READY"

  return "NOT_READY"
}

// ---------------------------------------------------------------------------
// Pickup Readiness Resolution
// ---------------------------------------------------------------------------

export function resolvePickupReadiness(deal: DealSignals): PickupReadinessState {
  if (deal.dealStatus !== "SIGNED" && deal.dealStatus !== "PICKUP_SCHEDULED") return "NOT_READY"

  const pickup = deal.pickupStatus
  if (!pickup) return "READY"
  if (pickup === "COMPLETED") return "COMPLETED"
  if (pickup === "BUYER_ARRIVED") return "ARRIVED"
  if (pickup === "CONFIRMED") return "CONFIRMED"
  if (pickup === "SCHEDULED") return "SCHEDULED"

  return "READY"
}

// ---------------------------------------------------------------------------
// Payout Release State Resolution
// ---------------------------------------------------------------------------

export function resolvePayoutReleaseState(
  deal: DealSignals,
  affiliate: AffiliateSignals | null
): PayoutReleaseState {
  if (!affiliate?.affiliateId) return "NOT_APPLICABLE"
  if (affiliate.fraudDetected || affiliate.selfReferral) return "BLOCKED"
  if (affiliate.complianceFlags.length > 0) return "BLOCKED"

  const payoutStatus = deal.payoutStatus
  if (!payoutStatus || payoutStatus === "PENDING") return "HELD"
  if (payoutStatus === "COMPLETED") return "RELEASED"
  if (payoutStatus === "PROCESSING") return "READY"

  return "HELD"
}

// ---------------------------------------------------------------------------
// Refund Hold State Resolution
// ---------------------------------------------------------------------------

export function resolveRefundHoldState(deal: DealSignals): RefundHoldState {
  const refund = deal.refundStatus
  if (!refund) return "NONE"
  if (refund === "SUCCEEDED") return "COMPLETED"
  if (refund === "PENDING") return "REQUESTED"
  if (refund === "FAILED" || refund === "CANCELLED") return "DENIED"

  return "NONE"
}

// ---------------------------------------------------------------------------
// Compliance Hold Aggregation
// ---------------------------------------------------------------------------

export function aggregateComplianceHolds(inputs: DecisionInputs): ComplianceHoldReasonCode[] {
  const holds = new Set<ComplianceHoldReasonCode>()

  // Buyer-level holds
  for (const flag of inputs.buyer.complianceFlags) holds.add(flag)
  if (inputs.buyer.manualHold) holds.add("MANUAL_HOLD")
  if (!inputs.buyer.identityVerified) holds.add("IDENTITY_UNVERIFIED")

  // Check prequal expiry
  if (inputs.buyer.prequal.exists && inputs.buyer.prequal.expiresAt) {
    const expiresAt = new Date(inputs.buyer.prequal.expiresAt)
    if (expiresAt < new Date(inputs.timestamp)) {
      holds.add("PREQUAL_EXPIRED")
    }
  }

  // Dealer-level holds
  if (inputs.dealer) {
    for (const flag of inputs.dealer.complianceFlags) holds.add(flag)
    if (inputs.dealer.manualHold) holds.add("MANUAL_HOLD")
    if (inputs.dealer.highRisk) holds.add("HIGH_RISK_DEALER")
  }

  // Deal-level holds
  if (inputs.deal) {
    for (const flag of inputs.deal.complianceFlags) holds.add(flag)
    if (inputs.deal.manualHold) holds.add("MANUAL_HOLD")
  }

  // Affiliate-level holds
  if (inputs.affiliate) {
    if (inputs.affiliate.selfReferral) holds.add("SELF_REFERRAL_DETECTED")
    if (inputs.affiliate.fraudDetected) holds.add("AFFILIATE_FRAUD")
    for (const flag of inputs.affiliate.complianceFlags) holds.add(flag)
  }

  return Array.from(holds)
}

// ---------------------------------------------------------------------------
// Decision Source Summary Builder
// ---------------------------------------------------------------------------

function buildDecisionSourceSummary(inputs: DecisionInputs): DecisionSourceEntry[] {
  const entries: DecisionSourceEntry[] = []

  // Buyer signals
  entries.push({
    signal: "buyer_profile",
    source: "buyer",
    value: inputs.buyer.profileComplete ? "complete" : "incomplete",
    contribution: "buyer_readiness",
  })

  if (inputs.buyer.prequal.exists) {
    entries.push({
      signal: "prequal",
      source: "buyer",
      value: `${inputs.buyer.prequal.source}:${inputs.buyer.prequal.status ?? "null"}`,
      contribution: "buyer_readiness,messaging_eligibility",
    })
  }

  if (inputs.buyer.externalPreApproval.exists) {
    entries.push({
      signal: "external_preapproval",
      source: "buyer",
      value: inputs.buyer.externalPreApproval.status ?? "unknown",
      contribution: "buyer_readiness,messaging_eligibility",
    })
  }

  if (inputs.buyer.cashBasis) {
    entries.push({
      signal: "cash_basis",
      source: "buyer",
      value: "true",
      contribution: "buyer_readiness,messaging_eligibility",
    })
  }

  // Dealer signals
  if (inputs.dealer) {
    entries.push({
      signal: "dealer_verified",
      source: "dealer",
      value: inputs.dealer.verified ? "true" : "false",
      contribution: "dealer_operational_state",
    })
    entries.push({
      signal: "dealer_integrity_score",
      source: "dealer",
      value: String(inputs.dealer.integrityScore),
      contribution: "dealer_operational_state",
    })
  }

  // Deal signals
  if (inputs.deal) {
    entries.push({
      signal: "deal_status",
      source: "deal",
      value: inputs.deal.dealStatus,
      contribution: "deal_progression",
    })
    if (inputs.deal.contractScanStatus) {
      entries.push({
        signal: "contract_scan",
        source: "deal",
        value: inputs.deal.contractScanStatus,
        contribution: "contract_resolution",
      })
    }
    if (inputs.deal.esignStatus) {
      entries.push({
        signal: "esign_status",
        source: "deal",
        value: inputs.deal.esignStatus,
        contribution: "esign_readiness",
      })
    }
  }

  return entries
}

// ---------------------------------------------------------------------------
// Master Decision Resolver
// ---------------------------------------------------------------------------

export function resolveDecision(inputs: DecisionInputs): DecisionOutput {
  const complianceHoldReasonCodes = aggregateComplianceHolds(inputs)

  const buyerReadinessState = resolveBuyerReadiness(inputs.buyer)
  const buyerMessagingEligibilityState = resolveBuyerMessagingEligibility(inputs.buyer)
  const dealerOperationalState = inputs.dealer
    ? resolveDealerOperationalState(inputs.dealer)
    : null
  const dealProgressionState = inputs.deal
    ? resolveDealProgressionState(inputs.deal)
    : null
  const contractResolutionState = inputs.deal
    ? resolveContractResolutionState(inputs.deal)
    : null
  const esignReadinessState = inputs.deal ? resolveESignReadiness(inputs.deal) : null
  const pickupReadinessState = inputs.deal ? resolvePickupReadiness(inputs.deal) : null
  const payoutReleaseState = inputs.deal
    ? resolvePayoutReleaseState(inputs.deal, inputs.affiliate)
    : null
  const refundHoldState = inputs.deal ? resolveRefundHoldState(inputs.deal) : null
  const manualReviewRequired =
    inputs.buyer.manualHold ||
    (inputs.dealer?.manualHold ?? false) ||
    (inputs.deal?.manualHold ?? false) ||
    (inputs.deal?.cmaStatus === "OPEN" || inputs.deal?.cmaStatus === "PENDING_SECOND_APPROVAL")

  return {
    buyerReadinessState,
    buyerMessagingEligibilityState,
    dealerOperationalState,
    dealProgressionState,
    contractResolutionState,
    esignReadinessState,
    pickupReadinessState,
    payoutReleaseState,
    refundHoldState,
    manualReviewRequired,
    complianceHoldReasonCodes,
    decisionSourceSummary: buildDecisionSourceSummary(inputs),
    resolvedAt: inputs.timestamp,
    correlationId: inputs.correlationId,
  }
}
