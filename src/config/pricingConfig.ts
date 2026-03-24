/**
 * AutoLenis Pricing Config — Single Source of Truth (V2)
 *
 * Import this module from BOTH frontend and backend code to guarantee
 * consistent pricing, deposit, and plan logic throughout the platform.
 *
 * Hard-coded dollar strings ($499, $99, etc.) MUST NOT appear elsewhere
 * in app or API code — render from these values instead.
 * (Policy / legal / canonical docs are exempt.)
 */

// ─── Plan identifiers ──────────────────────────────────────────────
export type PlanId = "FREE" | "PREMIUM"

// ─── Deposit credit application ────────────────────────────────────
export type DepositAppliesTo = "PURCHASE_CREDIT" | "FEE_CREDIT"

// ─── Refund eligibility reasons ────────────────────────────────────
export type RefundReason =
  | "NO_OFFERS"
  | "CANCELED_BEFORE_WINNER"
  | "OFFERS_NOT_ELIGIBLE"
  | "BUYER_WITHDREW_AFTER_WINNER"
  | "POLICY_VIOLATION"
  | "FRAUD"

export const REFUND_ELIGIBLE_REASONS: readonly RefundReason[] = [
  "NO_OFFERS",
  "CANCELED_BEFORE_WINNER",
  "OFFERS_NOT_ELIGIBLE",
] as const

export const REFUND_DENIED_REASONS: readonly RefundReason[] = [
  "BUYER_WITHDREW_AFTER_WINNER",
  "POLICY_VIOLATION",
  "FRAUD",
] as const

// ─── Credit / ledger types ─────────────────────────────────────────
export type CreditType = "DEPOSIT_PURCHASE_CREDIT" | "FEE_CREDIT" | "REFUND"
export type CreditStatus = "AVAILABLE" | "APPLIED" | "VOIDED" | "REFUNDED"

// ─── State machine statuses ────────────────────────────────────────
export type DepositStatus =
  | "NOT_PAID"
  | "PAID"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "DENIED"

export type PremiumFeeStatus =
  | "NOT_REQUIRED"
  | "DUE"
  | "PAID"
  | "REFUNDED"

export type AuctionStatusV2 =
  | "DRAFT"
  | "ACTIVE"
  | "OFFERS_RECEIVED"
  | "WINNER_SELECTED"
  | "CLOSED"
  | "CANCELED"

// ─── Amounts (cents) ───────────────────────────────────────────────
export const PRICING = {
  /** Serious Buyer Deposit in cents — required to start an auction */
  depositAmountCents: 9900,
  /** Human-readable deposit label */
  depositLabel: "Serious Buyer Deposit",
  /** Premium concierge fee in cents */
  premiumFeeCents: 49900,
  /** Remaining premium fee after deposit credit is applied (cents) */
  premiumFeeRemainingCents: 49900 - 9900, // 40000 = $400
} as const

// ─── Dollar-formatted helpers (for UI) ─────────────────────────────
export const PRICING_DISPLAY = {
  depositAmount: "$99",
  premiumFee: "$499",
  premiumFeeRemaining: "$400",
} as const

// ─── Deposit credit rules (tier-based) ─────────────────────────────
export function depositAppliesTo(plan: PlanId): DepositAppliesTo {
  return plan === "PREMIUM" ? "FEE_CREDIT" : "PURCHASE_CREDIT"
}

/** Human-readable explanation of how the deposit is applied */
export function depositCreditExplanation(plan: PlanId): string {
  if (plan === "PREMIUM") {
    return `Your ${PRICING_DISPLAY.depositAmount} ${PRICING.depositLabel} is credited toward your ${PRICING_DISPLAY.premiumFee} concierge fee (${PRICING_DISPLAY.premiumFeeRemaining} remaining).`
  }
  return `Your ${PRICING_DISPLAY.depositAmount} ${PRICING.depositLabel} is credited toward your vehicle purchase at closing (due-at-signing / down-payment credit).`
}

// ─── Plan definitions ──────────────────────────────────────────────
export interface PlanDefinition {
  id: PlanId
  label: string
  tagline: string
  priceLabel: string
  priceCents: number
  badge?: string
  depositAppliesTo: DepositAppliesTo
  features: string[]
  cta: string
  ctaHref: string
  /** Short value proposition — used under pricing cards and in upsell surfaces */
  valueProposition?: string
  /** Financing assistance disclosure — compliant copy */
  financingText?: string
  /** Free home delivery benefit text */
  deliveryText?: string
  /** General compliance / risk disclosure for the plan */
  disclosureText?: string
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  FREE: {
    id: "FREE",
    label: "Standard",
    tagline: "Get started at no cost",
    priceLabel: "Free Plan",
    priceCents: 0,
    depositAppliesTo: "PURCHASE_CREDIT",
    features: [
      "Instant pre-qualification",
      "Silent reverse auction",
      "Best price engine",
      "Contract Shield AI verification",
      "Insurance quotes",
      "E-signature & QR pickup",
      "Standard support",
    ],
    cta: "Get Started Free",
    ctaHref: "/buyer/onboarding",
  },
  PREMIUM: {
    id: "PREMIUM",
    label: "Premium",
    tagline: "Full concierge experience",
    priceLabel: "$499",
    priceCents: 49900,
    badge: "Most Popular",
    depositAppliesTo: "FEE_CREDIT",
    features: [
      "Everything in Standard",
      "Full-service buying support from start to finish",
      "Dedicated buying specialist",
      "Priority dealer handling",
      "Financing assistance to help find the right loan options",
      "Smarter financing process designed to reduce unnecessary inquiries",
      "Contract review and closing coordination",
      "Free home delivery",
      "Priority support",
    ],
    cta: "Go Premium",
    ctaHref: "/buyer/onboarding?plan=premium",
    valueProposition:
      "Premium is our complete white-glove buying service. We help you through the full process — from finding the right vehicle and securing competitive offers to guiding financing, reviewing the contract, coordinating closing, and delivering the vehicle to your home.",
    financingText:
      "Our Premium process is designed to help you explore the right financing path without unnecessary inquiry volume.",
    deliveryText:
      "Free home delivery included for Premium buyers, subject to delivery area eligibility and scheduling availability.",
    disclosureText:
      "Financing guidance is informational and not a guarantee of approval, rate, or terms. AutoLenis is not a lender.",
  },
} as const

export const PLAN_LIST: PlanDefinition[] = [PLANS.FREE, PLANS.PREMIUM]

// ─── State machine invariants ──────────────────────────────────────

export interface BuyerPricingState {
  plan: PlanId
  depositStatus: DepositStatus
  depositAppliesTo: DepositAppliesTo
  premiumFeeStatus: PremiumFeeStatus
  auctionStatus: AuctionStatusV2
}

/**
 * Validate hard invariants on a buyer/auction pricing state.
 * Returns an array of violation messages (empty = valid).
 */
export function validatePricingInvariants(
  state: BuyerPricingState,
): string[] {
  const violations: string[] = []

  // Auction cannot be ACTIVE unless deposit is PAID
  if (state.auctionStatus === "ACTIVE" && state.depositStatus !== "PAID") {
    violations.push(
      "auction_status cannot become ACTIVE unless deposit_status == PAID",
    )
  }

  // Plan ↔ depositAppliesTo consistency
  if (state.plan === "PREMIUM" && state.depositAppliesTo !== "FEE_CREDIT") {
    violations.push(
      "If plan == PREMIUM, deposit_applies_to must == FEE_CREDIT",
    )
  }
  if (state.plan === "FREE" && state.depositAppliesTo !== "PURCHASE_CREDIT") {
    violations.push(
      "If plan == FREE, deposit_applies_to must == PURCHASE_CREDIT",
    )
  }

  // No conflicting premium fee + deposit credit states
  if (
    state.premiumFeeStatus === "PAID" &&
    state.depositAppliesTo === "PURCHASE_CREDIT"
  ) {
    violations.push(
      "premium_fee_status cannot be PAID while deposit_applies_to == PURCHASE_CREDIT",
    )
  }

  // FREE plan should never have premiumFeeStatus == PAID or DUE
  if (
    state.plan === "FREE" &&
    (state.premiumFeeStatus === "PAID" || state.premiumFeeStatus === "DUE")
  ) {
    violations.push(
      "FREE plan cannot have premium_fee_status == PAID or DUE",
    )
  }

  return violations
}

/**
 * Evaluate whether a deposit refund request is eligible.
 */
export function evaluateRefundEligibility(reason: RefundReason): {
  eligible: boolean
  reason: RefundReason
  explanation: string
} {
  if ((REFUND_ELIGIBLE_REASONS as readonly string[]).includes(reason)) {
    return {
      eligible: true,
      reason,
      explanation: `Refund approved: ${reason.replace(/_/g, " ").toLowerCase()}.`,
    }
  }
  return {
    eligible: false,
    reason,
    explanation: `Refund denied: ${reason.replace(/_/g, " ").toLowerCase()}.`,
  }
}

// ─── Feature flag ──────────────────────────────────────────────────
export const FEATURE_FLAGS = {
  PRICING_V2_ENABLED: "pricing_v2_enabled",
} as const

/**
 * Check if pricing V2 is enabled.
 * In production, read from AdminSetting / environment.
 * Defaults to true when the flag is not explicitly set to "false".
 */
export function isPricingV2Enabled(flagValue?: string | boolean | null): boolean {
  if (flagValue === false || flagValue === "false" || flagValue === "0") {
    return false
  }
  // Default: enabled once deployed
  return true
}

// ─── Upgrade rules ─────────────────────────────────────────────────
export type UpgradePoint = "BEFORE_DEPOSIT" | "AFTER_DEPOSIT" | "AFTER_AUCTION_ACTIVE"

/** Allowed upgrade points for FREE → PREMIUM */
export const ALLOWED_UPGRADE_POINTS: readonly UpgradePoint[] = [
  "BEFORE_DEPOSIT",
  "AFTER_DEPOSIT",
] as const

/**
 * Determine whether a plan upgrade from FREE to PREMIUM is allowed
 * at the current point in the buyer journey.
 */
export function canUpgrade(
  currentPlan: PlanId,
  upgradePoint: UpgradePoint,
): boolean {
  if (currentPlan !== "FREE") return false
  return (ALLOWED_UPGRADE_POINTS as readonly string[]).includes(upgradePoint)
}
