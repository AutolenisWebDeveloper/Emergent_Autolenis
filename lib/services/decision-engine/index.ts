/**
 * Unified Decision Engine
 *
 * Canonical decision layer for platform-wide readiness, approval,
 * restriction, hold, and routing decisions.
 */

export { resolveDecision } from "./engine"
export {
  resolveBuyerReadiness,
  resolveBuyerMessagingEligibility,
  resolveDealerOperationalState,
  resolveDealProgressionState,
  resolveContractResolutionState,
  resolveESignReadiness,
  resolvePickupReadiness,
  resolvePayoutReleaseState,
  resolveRefundHoldState,
  aggregateComplianceHolds,
} from "./engine"

export type {
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
