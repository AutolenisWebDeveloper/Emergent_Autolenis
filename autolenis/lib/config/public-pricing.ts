/**
 * Public-facing pricing display config — single source of truth.
 *
 * All buyer-facing UI, marketing copy, emails, and structured content
 * should consume these values instead of hardcoding price strings.
 *
 * Internal/backend pricing math lives in src/config/pricingConfig.ts.
 */

export const PUBLIC_PRICING = {
  STANDARD: {
    displayPrice: "Free Plan",
    subtitle: "Get started at no cost",
    depositCreditMessage:
      "$99 deposit credited toward your vehicle purchase at closing",
  },
  PREMIUM: {
    displayPrice: "$499 concierge fee",
    subtitle: "Full concierge experience",
    depositCreditMessage:
      "$99 deposit credited toward fee — $400 remaining",
    remainingAfterDeposit: 400,
  },
  DEPOSIT: 99,
} as const
