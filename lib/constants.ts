// AutoLenis Platform Constants
// NOTE: For V2 pricing config (plans, deposit rules, feature lists), import
// from "@/src/config/pricingConfig" — that module is the single source of truth.

// ─── Legacy V1 fee structure (kept behind pricing_v2_enabled flag) ──
export const FEE_STRUCTURE = {
  LOW_TIER: {
    threshold: 35000,
    fee: 499,
  },
  HIGH_TIER: {
    threshold: Number.POSITIVE_INFINITY,
    fee: 750,
  },
} as const

export const FEE_STRUCTURE_CENTS = {
  LOW_TIER: {
    threshold: 3500000,
    fee: 49900,
  },
  HIGH_TIER: {
    threshold: Number.POSITIVE_INFINITY,
    fee: 75000,
  },
} as const

// ─── V2 flat fee (single premium tier) ─────────────────────────────
export const PREMIUM_FEE = 499 // $499 concierge fee
export const PREMIUM_FEE_CENTS = 49900 // $499 in cents

export const DEPOSIT_AMOUNT = 99 // $99 deposit
export const DEPOSIT_AMOUNT_CENTS = 9900 // $99 in cents

// Deal statuses that allow fee payment initiation
export const FEE_ELIGIBLE_DEAL_STATUSES = ["SELECTED", "FINANCING_APPROVED", "FEE_PENDING", "FINANCING_PENDING"] as const

export const COMMISSION_RATES = {
  LEVEL_1: 0.15, // 15%
  LEVEL_2: 0.03, // 3%
  LEVEL_3: 0.02, // 2%
} as const

export const AUCTION_DURATION_HOURS = 48

export const PREQUAL_EXPIRY_DAYS = 30

export const CREDIT_TIERS = {
  EXCELLENT: { min: 740, max: 850 },
  GOOD: { min: 670, max: 739 },
  FAIR: { min: 580, max: 669 },
  POOR: { min: 300, max: 579 },
} as const

export const MAX_SHORTLIST_ITEMS = 5

export const CONTRACT_SHIELD_THRESHOLDS = {
  PASS: 85,
  WARNING: 70,
  FAIL: 69,
} as const
