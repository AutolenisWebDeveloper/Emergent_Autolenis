/**
 * Concierge Context Types — typed contract for the state-aware context loader.
 *
 * These types define the shape of the dynamic knowledge plane (Plane B)
 * that the Lenis Concierge uses to answer state-specific questions
 * grounded in live system data.
 */

// ---------------------------------------------------------------------------
// Status enums
// ---------------------------------------------------------------------------

export type PrequalStatus = "NOT_STARTED" | "IN_REVIEW" | "APPROVED" | "DENIED"
export type AuctionStatus = "NOT_STARTED" | "ACTIVE" | "ENDED"
export type OffersStatus = "NONE" | "PENDING" | "READY"
export type DealStatus = "NONE" | "SELECTED" | "IN_CONTRACT" | "SIGNED" | "COMPLETED"
export type PaymentStatus = "PAID" | "DUE" | "NA"
export type InsuranceStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE"
export type ContractShieldStatus = "NOT_UPLOADED" | "PASS" | "REJECT" | "MANUAL_REVIEW" | "INTERNAL_FIX" | "OVERRIDE_APPROVED"
export type EsignStatus = "NOT_SENT" | "SENT" | "SIGNED"
export type PickupStatus = "NOT_SCHEDULED" | "SCHEDULED" | "COMPLETED"

// ---------------------------------------------------------------------------
// Buyer state
// ---------------------------------------------------------------------------

export interface BuyerPrequalState {
  status: PrequalStatus
  updatedAt: string | null
}

export interface BuyerShortlistState {
  count: number
  vehicles: string[]
}

export interface BuyerAuctionState {
  status: AuctionStatus
  endsAt: string | null
}

export interface BuyerOffersState {
  status: OffersStatus
  count: number
}

export interface BuyerSelectedDealState {
  status: DealStatus
}

export interface BuyerPaymentsState {
  deposit: PaymentStatus
  serviceFee: PaymentStatus
}

export interface BuyerInsuranceState {
  status: InsuranceStatus
}

export interface BuyerContractShieldState {
  status: ContractShieldStatus
  rejectReasons: string[]
}

export interface BuyerEsignState {
  status: EsignStatus
}

export interface BuyerPickupState {
  status: PickupStatus
  time: string | null
}

export interface BuyerState {
  prequal: BuyerPrequalState
  shortlist: BuyerShortlistState
  auction: BuyerAuctionState
  offers: BuyerOffersState
  selectedDeal: BuyerSelectedDealState
  payments: BuyerPaymentsState
  insurance: BuyerInsuranceState
  contractShield: BuyerContractShieldState
  esign: BuyerEsignState
  pickup: BuyerPickupState
}

// ---------------------------------------------------------------------------
// Dealer state
// ---------------------------------------------------------------------------

export interface DealerAuctionInvite {
  auctionId: string
  status: "INVITED" | "BID_SUBMITTED" | "WON" | "LOST"
}

export interface DealerState {
  invitedAuctions: DealerAuctionInvite[]
  activeBids: number
  wonDeals: number
}

// ---------------------------------------------------------------------------
// Affiliate state
// ---------------------------------------------------------------------------

export interface AffiliateState {
  clicks: number
  signups: number
  commissions: number
  pendingPayout: number
}

// ---------------------------------------------------------------------------
// Admin state
// ---------------------------------------------------------------------------

export interface AdminState {
  pendingReviews: number
  activeAuctions: number
  openExceptions: number
}

// ---------------------------------------------------------------------------
// Concierge Context (top-level contract)
// ---------------------------------------------------------------------------

export interface ConciergeContextUser {
  id: string
  firstName: string | null
}

export interface ConciergeContext {
  workspace: "LIVE" | "TEST"
  role: "BUYER" | "DEALER" | "AFFILIATE" | "ADMIN" | "PUBLIC"
  user: ConciergeContextUser | null
  timestamp: string
  buyerState: BuyerState | null
  dealerState: DealerState | null
  affiliateState: AffiliateState | null
  adminState: AdminState | null
}
