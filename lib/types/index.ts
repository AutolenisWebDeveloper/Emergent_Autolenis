// Shared TypeScript types for AutoLenis platform

// Workspace / Tenant Types
export type WorkspaceMode = "LIVE" | "TEST"

// User and Role Types
export type UserRole = "BUYER" | "DEALER" | "DEALER_USER" | "ADMIN" | "SUPER_ADMIN" | "AFFILIATE" | "AFFILIATE_ONLY" | "SYSTEM_AGENT"

export interface User {
  id: string
  email: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export interface BuyerProfile {
  id: string
  userId: string
  workspaceId?: string | null
  firstName: string
  lastName: string
  phone?: string | null
  address: string
  city: string
  state: string
  zip: string
  employment?: string | null
  employer?: string | null
  annualIncome?: number | null
  housingStatus?: string | null
  monthlyHousing?: number | null
  dateOfBirth?: Date | null
  addressLine2?: string | null
  postalCode?: string | null
  country?: string | null
  employmentStatus?: string | null
  employerName?: string | null
  monthlyIncomeCents?: number | null
  monthlyHousingCents?: number | null
  createdAt: Date
  updatedAt: Date
}

export type CreditTier = "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DECLINED"

export type PreQualSource = "INTERNAL" | "EXTERNAL_MANUAL" | "MICROBILT" | "IPREDICT"

/**
 * Canonical normalized prequalification result DTO.
 * Returned by the buyer prequal APIs for all source types.
 */
export interface NormalizedPrequalResult {
  id: string
  status: string
  sourceType: string
  provider: string
  creditTier: string
  maxOtd: number | null
  estimatedMonthlyMin: number | null
  estimatedMonthlyMax: number | null
  expiresAt: string | null
  disclosuresAccepted: boolean
  forwardingAuthorized: boolean
  createdAt: string
}

export interface PreQualification {
  id: string
  buyerId: string
  workspaceId?: string | null
  status?: string | null
  creditScore?: number | null
  creditTier: CreditTier
  maxOtd: number
  estimatedMonthlyMin: number
  estimatedMonthlyMax: number
  maxOtdAmountCents?: number | null
  minMonthlyPaymentCents?: number | null
  maxMonthlyPaymentCents?: number | null
  dti?: number | null
  dtiRatio?: number | null
  softPullCompleted: boolean
  softPullDate?: Date | null
  consentGiven: boolean
  consentDate?: Date | null
  source: PreQualSource
  externalSubmissionId?: string | null
  providerName?: string | null
  providerReferenceId?: string | null
  rawResponseJson?: unknown
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface Dealer {
  id: string
  name: string
  licenseNumber: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  verified: boolean
  integrityScore: number
  createdAt: Date
  updatedAt: Date
}

export interface AdminUser {
  id: string
  userId: string
  permissions: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Affiliate {
  id: string
  userId: string
  referralCode: string
  parentAffiliateId: string | null
  level: number
  totalEarnings: number
  createdAt: Date
  updatedAt: Date
}

// Vehicle and Inventory Types
export interface Vehicle {
  id: string
  vin: string
  year: number
  make: string
  model: string
  trim: string
  mileage: number
  color: string
  createdAt: Date
  updatedAt: Date
}

export interface InventoryItem {
  id: string
  dealerId: string
  workspaceId: string
  priceCents: number
  msrpCents?: number | null
  vin?: string | null
  stockNumber?: string | null
  year?: number | null
  make?: string | null
  model?: string | null
  trim?: string | null
  isNew: boolean
  mileage?: number | null
  exteriorColor?: string | null
  interiorColor?: string | null
  transmission?: string | null
  fuelType?: string | null
  bodyStyle?: string | null
  description?: string | null
  photosJson: string[]
  locationName?: string | null
  locationCity?: string | null
  locationState?: string | null
  latitude?: number | null
  longitude?: number | null
  source?: string | null
  sourceReferenceId?: string | null
  lastSyncedAt?: Date | null
  status: string
  reservedAt?: Date | null
  soldAt?: Date | null
  archivedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Shortlist {
  id: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

// Auction Types
export type AuctionStatus = "PENDING" | "ACTIVE" | "CLOSED" | "CANCELLED"

export interface Auction {
  id: string
  userId: string
  shortlistId: string
  status: AuctionStatus
  depositPaid: boolean
  closesAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface AuctionOffer {
  id: string
  auctionId: string
  dealerId: string
  inventoryItemId: string
  cashOtd: number
  taxAmount: number
  feesBreakdown: any
  createdAt: Date
  updatedAt: Date
}

// Deal Types
export type DealStatus =
  | "SELECTED"
  | "FINANCING_PENDING"
  | "FINANCING_APPROVED"
  | "FEE_PENDING"
  | "FEE_PAID"
  | "INSURANCE_PENDING"
  | "INSURANCE_COMPLETE"
  | "CONTRACT_PENDING"
  | "CONTRACT_REVIEW"
  | "CONTRACT_MANUAL_REVIEW_REQUIRED"
  | "CONTRACT_INTERNAL_FIX_IN_PROGRESS"
  | "CONTRACT_ADMIN_OVERRIDE_APPROVED"
  | "CONTRACT_APPROVED"
  | "SIGNING_PENDING"
  | "SIGNED"
  | "PICKUP_SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"

export interface SelectedDeal {
  id: string
  auctionId: string
  userId: string
  offerId: string
  status: DealStatus
  createdAt: Date
  updatedAt: Date
}

// Payment Types
export type FeePaymentMethod = "CARD" | "LOAN_INCLUSION"
export type PaymentStatus = "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED"

export interface ServiceFeePayment {
  id: string
  dealId: string
  amount: number
  method: FeePaymentMethod
  status: PaymentStatus
  stripePaymentId: string | null
  createdAt: Date
  updatedAt: Date
}

// Insurance Types

// Policy lifecycle status (matches Prisma InsuranceStatus enum)
export type InsurancePolicyStatus =
  | "QUOTE_REQUESTED"
  | "QUOTE_RECEIVED"
  | "POLICY_SELECTED"
  | "POLICY_BOUND"
  | "EXTERNAL_UPLOADED"

// Deal-level insurance readiness (stored in SelectedDeal.insurance_status)
export type DealInsuranceReadiness =
  | "NOT_SELECTED"
  | "SELECTED_AUTOLENIS"
  | "EXTERNAL_PROOF_UPLOADED"
  | "BOUND"

export interface InsurancePolicy {
  id: string
  dealId: string
  carrier: string
  policyNumber: string
  coverageType: string
  status: InsurancePolicyStatus
  createdAt: Date
  updatedAt: Date
}

// Contract Types
export type ContractStatus = "PENDING" | "SCANNING" | "ISSUES_FOUND" | "PASSED" | "REJECTED"

export interface ContractDocument {
  id: string
  dealId: string
  dealerId: string
  status: ContractStatus
  uploadedAt: Date
  updatedAt: Date
}

export interface ContractShieldScan {
  id: string
  contractId: string
  aprMatch: boolean
  paymentMatch: boolean
  otdMatch: boolean
  junkFeesDetected: boolean
  overallScore: number
  scannedAt: Date
}

// E-Sign Types
export type ESignStatus = "PENDING" | "SENT" | "SIGNED" | "COMPLETED" | "DECLINED"

export interface ESignEnvelope {
  id: string
  dealId: string
  providerId: string
  status: ESignStatus
  createdAt: Date
  updatedAt: Date
}

// Pickup Types
export type PickupStatus = "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

export interface PickupAppointment {
  id: string
  dealId: string
  scheduledDate: Date
  qrCode: string
  status: PickupStatus
  createdAt: Date
  updatedAt: Date
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Pre-Qualification Types
export interface PreQualRequest {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
  employment: string
  employer: string
  annualIncome: number
  housingStatus: string
  monthlyHousing: number
  ssn: string
  dob: string
  consentGiven: boolean
}

export interface PreQualResult {
  approved: boolean
  maxOtdAmountCents: number | null
  creditTier: CreditTier
  minMonthlyPaymentCents: number | null
  maxMonthlyPaymentCents: number | null
  dtiRatio: number | null
  expiresAt: Date
}

// Best Price Types
export interface BestPriceResults {
  bestCash: BestPriceOptionDetail
  bestMonthly: BestPriceOptionDetail
  balanced: BestPriceOptionDetail
  allOffers: OfferDetail[]
}

export interface BestPriceOptionDetail {
  offerId: string
  dealerId: string
  dealerName: string
  inventoryItemId: string
  vehicle: Vehicle
  cashOtd: number
  monthlyPayment: number | null
  score: number
}

export interface OfferDetail extends Omit<BestPriceOptionDetail, "score"> {
  taxAmount: number
  feesBreakdown: Record<string, number>
  financingOptions: any[] // FinancingOptionInput[]
}

// Fee Payment Types
export interface FeeOptions {
  baseFee: number
  depositCredit: number
  finalAmount: number
  options: {
    payDirectly: boolean
    includeInLoan: boolean
  }
}

export interface LoanImpactCalculation {
  feeAmount: number
  apr: number
  termMonths: number
  baseMonthly: number
  newMonthly: number
  monthlyIncrease: number
  totalExtraCost: number
  totalFinanced: number
}

// Insurance Types
export interface InsuranceQuoteRequest {
  vehicleId: string
  coverageType: "LIABILITY" | "COLLISION" | "COMPREHENSIVE" | "FULL"
}

export interface InsuranceQuoteResult {
  carrier: string
  coverageType: string
  monthlyPremium: number
  sixMonthPremium: number
  coverageLimits: Record<string, string>
  deductibles: Record<string, number>
}

// Contract Shield Types
export interface ContractShieldResult {
  status: ContractStatus
  aprMatch: boolean
  paymentMatch: boolean
  otdMatch: boolean
  junkFeesDetected: boolean
  missingAddendums: string[]
  overallScore: number
  fixList: FixListItemDetail[]
}

export interface FixListItemDetail {
  category: string
  description: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  expectedFix: string
  resolved: boolean
}

// Affiliate Types
export interface AffiliateDashboard {
  totalEarnings: number
  pendingEarnings: number
  totalClicks: number
  totalReferrals: number
  completedDeals: number
  commissions: CommissionDetail[]
}

export interface CommissionDetail {
  level: number
  dealId: string
  baseAmount: number
  commissionRate: number
  commissionAmount: number
  status: string
  createdAt: Date
}

// Financing Option Input Type
export type FinancingOptionInput = {}

// Additional Dashboard Types (as per requirements)

// DealerProfile with status
export interface DealerProfile {
  userId: string
  businessName: string
  contactName: string
  phone: string
  status: "pending" | "approved" | "suspended"
  createdAt: Date
}

// DealerOffer with workflow statuses
export type DealerOfferStatus = "draft" | "submitted" | "sent" | "accepted" | "rejected" | "expired"

export interface DealerOffer {
  id: string
  requestId: string
  dealerId: string
  status: DealerOfferStatus
  price: number
  monthlyEstimate: number | null
  vehicleSummary: string
  createdAt: Date
}

// BuyerRequest
export interface BuyerRequest {
  id: string
  buyerId: string
  status: "pending" | "active" | "matched" | "cancelled"
  createdAt: Date
  vehiclePrefs: any
  budget: number
  locationRadius: number
  timeline: string
}

// Deal (simplified unified type)
export interface Deal {
  id: string
  buyerId: string
  requestId?: string
  offerId?: string
  status: DealStatus
  createdAt: Date
  updatedAt: Date
}

// Payment with extended types
export type PaymentType = "deposit" | "concierge_fee" | "dealer_fee" | "other"

export interface Payment {
  id: string
  buyerId: string
  requestId?: string
  dealId?: string
  type: PaymentType
  amount: number
  status: "pending" | "paid" | "failed" | "refunded"
  createdAt: Date
}

// Refund
export type RefundStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED"

export interface Refund {
  id: string
  paymentId: string
  amount: number
  status: RefundStatus
  createdAt: Date
  reason: string
}

// AffiliateProfile with status
export interface AffiliateProfile {
  userId: string
  code: string
  status: "pending" | "approved" | "suspended"
  createdAt: Date
}

// Referral
export interface Referral {
  id: string
  affiliateId: string
  codeUsed: string
  buyerId?: string
  createdAt: Date
  status: "pending" | "converted" | "cancelled"
}

// Commission
export type CommissionStatus = "PENDING" | "EARNED" | "PAID" | "CANCELLED"

export interface Commission {
  id: string
  affiliateId: string
  referralId: string
  amount: number
  status: CommissionStatus
  period: string
  createdAt: Date
  /** FK to SelectedDeal for per-deal traceability (nullable, backfilled where possible) */
  selected_deal_id?: string | null
}

// Payout
export type PayoutStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"

export interface Payout {
  id: string
  affiliateId: string
  amount: number
  status: PayoutStatus
  method: string
  createdAt: Date
}

// Payout–deal linkage (many-to-many via payout_deals table)
export interface PayoutDeal {
  id: string
  payoutId: string
  selectedDealId: string
  allocatedAmountCents: number
  createdAt: Date
}

// PayoutWithDeal view shape (maps to public.Payout_withDeal SQL view, adds computed dealId per payout)
export interface PayoutWithDeal extends Payout {
  /** Latest mapped dealId from payout_deals (single representative deal per payout) */
  dealId: string | null
}

// Document with visibility scope
export type DocumentStatus = "pending" | "approved" | "rejected"
export type DocumentType = "contract" | "insurance" | "title" | "registration" | "other"
export type VisibilityScope = "admin" | "dealer" | "buyer" | "all"

export interface Document {
  id: string
  buyerId: string
  dealId?: string
  requestId?: string
  type: DocumentType
  status: DocumentStatus
  visibilityScope: VisibilityScope[]
  filename?: string
  url?: string
  createdAt: Date
  updatedAt: Date
  reviewReason?: string
}

// AuditLog
export interface AuditLog {
  id: string
  actorId: string
  action: string
  entityType: string
  entityId: string
  metadata: any
  createdAt: Date
}
