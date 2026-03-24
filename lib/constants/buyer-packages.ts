/**
 * Buyer package tier constants and billing initialization helpers.
 *
 * These values are the single source of truth for package-level configuration.
 * They are consumed during registration, onboarding, dashboard display, and
 * billing workflows.
 */

// ---------------------------------------------------------------------------
// Canonical enum
// ---------------------------------------------------------------------------

export enum BuyerPackageTier {
  STANDARD = "STANDARD",
  PREMIUM = "PREMIUM",
}

// ---------------------------------------------------------------------------
// Deposit credit treatment (how the $99 deposit is applied)
// ---------------------------------------------------------------------------

export enum DepositCreditTreatment {
  /** Deposit amount credited toward the vehicle purchase at closing */
  CREDIT_TO_VEHICLE_AT_CLOSING = "CREDIT_TO_VEHICLE_AT_CLOSING",
  /** Deposit amount credited toward the premium concierge fee */
  CREDIT_TO_PREMIUM_FEE = "CREDIT_TO_PREMIUM_FEE",
}

// ---------------------------------------------------------------------------
// Billing state shape written at signup
// ---------------------------------------------------------------------------

export interface BuyerBillingInit {
  depositRequired: boolean
  depositAmount: number
  depositStatus: "NOT_PAID"
  depositCreditTreatment: DepositCreditTreatment
  premiumFeeTotal: number
  premiumFeeRemaining: number
}

export function buildBillingInit(tier: BuyerPackageTier): BuyerBillingInit {
  if (tier === BuyerPackageTier.PREMIUM) {
    return {
      depositRequired: true,
      depositAmount: 99,
      depositStatus: "NOT_PAID",
      depositCreditTreatment: DepositCreditTreatment.CREDIT_TO_PREMIUM_FEE,
      premiumFeeTotal: 499,
      premiumFeeRemaining: 499, // realized only after deposit payment
    }
  }

  return {
    depositRequired: true,
    depositAmount: 99,
    depositStatus: "NOT_PAID",
    depositCreditTreatment: DepositCreditTreatment.CREDIT_TO_VEHICLE_AT_CLOSING,
    premiumFeeTotal: 0,
    premiumFeeRemaining: 0,
  }
}

// ---------------------------------------------------------------------------
// Package display metadata (used by the signup UI and dashboard)
// ---------------------------------------------------------------------------

export interface PackageDisplayInfo {
  tier: BuyerPackageTier
  label: string
  price: string
  depositNote: string
  features: string[]
  cta: string
}

export const PACKAGE_DISPLAY: Record<BuyerPackageTier, PackageDisplayInfo> = {
  [BuyerPackageTier.STANDARD]: {
    tier: BuyerPackageTier.STANDARD,
    label: "Standard / Free Plan",
    price: "Free",
    depositNote: "$99 serious-buyer deposit required to start auction — credited toward vehicle purchase at closing",
    features: [
      "$99 serious buyer deposit to start auction",
      "Deposit credited toward vehicle purchase at closing",
      "Self-serve platform experience",
      "Standard support",
    ],
    cta: "Create Free Account",
  },
  [BuyerPackageTier.PREMIUM]: {
    tier: BuyerPackageTier.PREMIUM,
    label: "Premium / $499 Concierge Plan",
    price: "$499",
    depositNote: "$99 deposit credited toward concierge fee — $400 remaining after deposit",
    features: [
      "$99 deposit credited toward concierge fee",
      "$400 remaining after deposit",
      "Dedicated buying specialist",
      "Priority handling",
      "Financing assistance",
      "Contract review & closing coordination",
      "Free home delivery",
      "Priority support",
    ],
    cta: "Create Premium Account",
  },
}

// Current package version – bump when pricing or features change
export const CURRENT_PACKAGE_VERSION = "2025-01-v1"
