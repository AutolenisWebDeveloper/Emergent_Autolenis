/**
 * Canonical Workflow Status Constants
 *
 * Single source of truth for all lifecycle status values used across
 * Buyer, Dealer, Admin, and Affiliate dashboards.
 *
 * These mirror the Prisma schema enums exactly. Services, routes, and
 * dashboard data providers MUST import from this module instead of using
 * raw string literals.
 *
 * Domain-specific constants that already existed (DealStatus in
 * lib/services/deal/types.ts, BuyerCaseStatus / SourcedOfferStatus in
 * lib/services/sourcing.service.ts) are re-exported here for convenience
 * and single-import ergonomics — those modules remain the canonical
 * defining sources for their respective domains.
 */

// ─── Auction ────────────────────────────────────────────────────────────────

/** Matches Prisma `enum AuctionStatus` */
export const AuctionStatus = {
  PENDING_DEPOSIT: "PENDING_DEPOSIT",
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const
export type AuctionStatus = (typeof AuctionStatus)[keyof typeof AuctionStatus]

// ─── Inventory ──────────────────────────────────────────────────────────────

/** Matches Prisma `enum InventoryStatus` */
export const InventoryStatus = {
  AVAILABLE: "AVAILABLE",
  HOLD: "HOLD",
  SOLD: "SOLD",
  REMOVED: "REMOVED",
} as const
export type InventoryStatus = (typeof InventoryStatus)[keyof typeof InventoryStatus]

// ─── Deal ───────────────────────────────────────────────────────────────────

// Re-export from canonical source (lib/services/deal/types.ts)
export { DealStatus } from "@/lib/services/deal/types"

// ─── Payment ────────────────────────────────────────────────────────────────

/** Matches Prisma `enum PaymentStatus` */
export const PaymentStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

// ─── Pickup ─────────────────────────────────────────────────────────────────

/** Matches Prisma `enum PickupStatus` */
export const PickupStatus = {
  SCHEDULED: "SCHEDULED",
  CONFIRMED: "CONFIRMED",
  BUYER_ARRIVED: "BUYER_ARRIVED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const
export type PickupStatus = (typeof PickupStatus)[keyof typeof PickupStatus]

// ─── Contract / Compliance ──────────────────────────────────────────────────

/** Matches Prisma `enum ContractStatus` */
export const ContractStatus = {
  UPLOADED: "UPLOADED",
  SCANNING: "SCANNING",
  ISSUES_FOUND: "ISSUES_FOUND",
  PASSED: "PASSED",
  FAILED: "FAILED",
} as const
export type ContractStatus = (typeof ContractStatus)[keyof typeof ContractStatus]

// ─── Commission (Affiliate) ─────────────────────────────────────────────────

/** Matches Prisma `enum CommissionStatus` */
export const CommissionStatus = {
  PENDING: "PENDING",
  EARNED: "EARNED",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
} as const
export type CommissionStatus = (typeof CommissionStatus)[keyof typeof CommissionStatus]

// ─── Payout (Affiliate) ─────────────────────────────────────────────────────

/** Matches Prisma `enum PayoutStatus` */
export const PayoutStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const
export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus]

// ─── Refund ─────────────────────────────────────────────────────────────────

/** Matches Prisma `enum RefundStatus` */
export const RefundStatus = {
  PENDING: "PENDING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus]

// ─── Deposit Request ────────────────────────────────────────────────────────

/** Matches Prisma `enum DepositRequestStatus` */
export const DepositRequestStatus = {
  REQUESTED: "REQUESTED",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
} as const
export type DepositRequestStatus = (typeof DepositRequestStatus)[keyof typeof DepositRequestStatus]

// ─── Concierge Fee Request ──────────────────────────────────────────────────

/** Matches Prisma `enum ConciergeFeeRequestStatus` */
export const ConciergeFeeRequestStatus = {
  REQUESTED: "REQUESTED",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
} as const
export type ConciergeFeeRequestStatus = (typeof ConciergeFeeRequestStatus)[keyof typeof ConciergeFeeRequestStatus]

// ─── Lender Fee Disbursement ────────────────────────────────────────────────

/** Matches Prisma `enum LenderDisbursementStatus` */
export const LenderDisbursementStatus = {
  PENDING: "PENDING",
  DISBURSED: "DISBURSED",
} as const
export type LenderDisbursementStatus = (typeof LenderDisbursementStatus)[keyof typeof LenderDisbursementStatus]

// ─── Insurance Readiness (re-export from canonical source) ──────────────────

export {
  InsuranceReadinessStatus,
  INSURANCE_VALID_TRANSITIONS,
  InsuranceDocumentTag,
  INSURANCE_ACCEPTED_FILE_TYPES,
  INSURANCE_DELIVERY_RELEASE_STATUSES,
  isInsuranceVerifiedForDelivery,
  INSURANCE_DASHBOARD_CONFIG,
} from "@/lib/constants/insurance"

// ─── Buyer Eligibility (re-export from canonical source) ────────────────────

export {
  resolveBuyerEligibility,
} from "@/lib/constants/buyer-eligibility"
export type {
  BuyerEligibility,
  PrequalStatus,
} from "@/lib/constants/buyer-eligibility"

// ─── Sourcing (re-export from canonical source) ─────────────────────────────

export {
  BuyerCaseStatus,
  AdminSubStatus,
  SourcedOfferStatus,
} from "@/lib/services/sourcing.service"

// ─── Convenience groupings for dashboard queries ────────────────────────────

/** Sourcing case statuses that represent a terminal/closed state */
export const CLOSED_CASE_STATUSES = [
  "CLOSED_WON",
  "CLOSED_LOST",
  "CLOSED_CANCELLED",
] as const

/** Sourcing case statuses that represent active (non-closed) work */
export const ACTIVE_CASE_STATUSES = [
  "SOURCING",
  "OFFERS_AVAILABLE",
  "OFFER_SELECTED",
  "DEALER_INVITED",
  "IN_PLATFORM_TRANSACTION",
] as const
