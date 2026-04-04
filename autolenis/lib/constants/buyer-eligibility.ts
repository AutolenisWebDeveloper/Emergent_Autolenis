/**
 * Buyer Eligibility Object
 *
 * Simplified buyer eligibility focused on shopping-readiness and
 * buyer-seriousness verification. No lender-partner dependencies.
 *
 * The prequalification system is strictly:
 *   - shopping-readiness
 *   - budget-estimation
 *   - buyer seriousness verification
 *   - vehicle affordability gating
 */

/** Prequalification status for buyer eligibility */
export type PrequalStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "PREQUALIFIED"
  | "PREQUALIFIED_CONDITIONAL"
  | "MANUAL_REVIEW"
  | "NOT_PREQUALIFIED"
  | "EXPIRED"

/** Buyer eligibility object — no lender-oriented fields */
export interface BuyerEligibility {
  buyer_id: string
  prequal_status: PrequalStatus
  shopping_range_low: number | null
  shopping_range_high: number | null
  shopping_pass_issued_at: string | null
  shopping_pass_expires_at: string | null
  income_verified: boolean
  manual_review_required: boolean
  allowed_to_shop: boolean
  allowed_to_shortlist: boolean
  allowed_to_trigger_auction: boolean
  vehicle_budget_cap: number | null
  next_required_action: string | null
}

/**
 * Resolve buyer eligibility from prequal status.
 *
 * Rules:
 * - PREQUALIFIED: shortlist allowed, auction allowed
 * - PREQUALIFIED_CONDITIONAL: shortlist allowed, auction allowed only if
 *   required next step is completed per platform rule
 * - MANUAL_REVIEW: shortlist optional, auction blocked until review resolution
 * - NOT_PREQUALIFIED: shortlist and auction blocked
 * - Insurance status MUST NOT block shortlist or auction
 */
export function resolveBuyerEligibility(params: {
  buyerId: string
  prequalStatus: PrequalStatus
  shoppingRangeLow: number | null
  shoppingRangeHigh: number | null
  shoppingPassIssuedAt: string | null
  shoppingPassExpiresAt: string | null
  incomeVerified: boolean
  manualReviewRequired: boolean
  vehicleBudgetCap: number | null
}): BuyerEligibility {
  const {
    buyerId,
    prequalStatus,
    shoppingRangeLow,
    shoppingRangeHigh,
    shoppingPassIssuedAt,
    shoppingPassExpiresAt,
    incomeVerified,
    manualReviewRequired,
    vehicleBudgetCap,
  } = params

  const shoppingPassValid =
    shoppingPassIssuedAt != null &&
    (shoppingPassExpiresAt == null || new Date(shoppingPassExpiresAt) > new Date())

  let allowedToShop = false
  let allowedToShortlist = false
  let allowedToTriggerAuction = false
  let nextRequiredAction: string | null = null

  switch (prequalStatus) {
    case "PREQUALIFIED":
      allowedToShop = true
      allowedToShortlist = true
      allowedToTriggerAuction = true
      break
    case "PREQUALIFIED_CONDITIONAL":
      allowedToShop = true
      allowedToShortlist = true
      allowedToTriggerAuction = shoppingPassValid
      if (!shoppingPassValid) {
        nextRequiredAction = "complete_required_step"
      }
      break
    case "MANUAL_REVIEW":
      allowedToShop = true
      allowedToShortlist = true
      allowedToTriggerAuction = false
      nextRequiredAction = "await_manual_review"
      break
    case "PENDING":
      allowedToShop = false
      allowedToShortlist = false
      allowedToTriggerAuction = false
      nextRequiredAction = "complete_prequalification"
      break
    case "NOT_STARTED":
      allowedToShop = false
      allowedToShortlist = false
      allowedToTriggerAuction = false
      nextRequiredAction = "start_prequalification"
      break
    case "NOT_PREQUALIFIED":
      allowedToShop = false
      allowedToShortlist = false
      allowedToTriggerAuction = false
      nextRequiredAction = "retry_prequalification"
      break
    case "EXPIRED":
      allowedToShop = false
      allowedToShortlist = false
      allowedToTriggerAuction = false
      nextRequiredAction = "renew_prequalification"
      break
    default:
      nextRequiredAction = "start_prequalification"
  }

  return {
    buyer_id: buyerId,
    prequal_status: prequalStatus,
    shopping_range_low: shoppingRangeLow,
    shopping_range_high: shoppingRangeHigh,
    shopping_pass_issued_at: shoppingPassIssuedAt,
    shopping_pass_expires_at: shoppingPassExpiresAt,
    income_verified: incomeVerified,
    manual_review_required: manualReviewRequired,
    allowed_to_shop: allowedToShop,
    allowed_to_shortlist: allowedToShortlist,
    allowed_to_trigger_auction: allowedToTriggerAuction,
    vehicle_budget_cap: vehicleBudgetCap,
    next_required_action: nextRequiredAction,
  }
}
