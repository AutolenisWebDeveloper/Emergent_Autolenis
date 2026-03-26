// Shopping range calculator (affordability cap, loan term, risk-band adjustment)
// Returns shopping range in CENTS

import type { IpredictBand, IbvOutcome } from "@/lib/types/prequal"
import { LOAN_DEFAULTS, SHOPPING_PASS_VALIDITY_DAYS } from "@/lib/prequal/constants"

export interface ShoppingRangeInput {
  grossMonthlyIncomeCents: number
  monthlyHousingPaymentCents: number
  downPaymentCents: number
  targetMonthlyPaymentCents: number
  ipredictBand: IpredictBand
  ibvOutcome: IbvOutcome
  verifiedMonthlyIncomeCents?: number  // From IBV if available
}

export interface ShoppingRangeResult {
  minCents: number
  maxCents: number
}

/**
 * Calculates the consumer's estimated vehicle shopping range.
 * Uses DTI cap, loan term, APR by risk band, and target payment input.
 *
 * IMPORTANT: This is NOT a loan approval or financing offer.
 * It is an estimated shopping readiness range only.
 */
export function calculateShoppingRange(input: ShoppingRangeInput): ShoppingRangeResult {
  // Use IBV-verified income if available and higher than self-reported
  const effectiveMonthlyIncome = input.verifiedMonthlyIncomeCents
    ? Math.max(input.grossMonthlyIncomeCents, input.verifiedMonthlyIncomeCents)
    : input.grossMonthlyIncomeCents

  // Max monthly payment based on DTI
  const maxDtiPaymentCents = Math.floor(
    effectiveMonthlyIncome * LOAN_DEFAULTS.DEBT_TO_INCOME_MAX - input.monthlyHousingPaymentCents
  )

  // Determine APR by band
  const apr = input.ipredictBand === "PASS"
    ? LOAN_DEFAULTS.BASE_RATE_PASS
    : LOAN_DEFAULTS.BASE_RATE_BORDERLINE

  const termMonths = LOAN_DEFAULTS.TERM_MONTHS
  const monthlyRate = apr / 12

  // Monthly payment → loan amount formula: P = pmt * [(1-(1+r)^-n) / r]
  const pvFactor = (1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate

  // Affordability-capped max payment
  const effectiveMaxPayment = Math.min(
    maxDtiPaymentCents,
    input.targetMonthlyPaymentCents > 0 ? input.targetMonthlyPaymentCents : maxDtiPaymentCents
  )

  const cappedPayment = Math.max(effectiveMaxPayment, LOAN_DEFAULTS.MONTHLY_PAYMENT_FLOOR_CENTS)

  // Max vehicle price = (loan amount from max payment) + down payment
  const maxLoanCents = Math.floor(cappedPayment * pvFactor)
  const maxVehicleCents = maxLoanCents + input.downPaymentCents

  // IBV adjustment factor
  const ibvFactor = getIbvFactor(input.ibvOutcome, input.ipredictBand)
  const adjustedMaxCents = Math.floor(maxVehicleCents * ibvFactor)

  // Minimum range = 70% of max
  const minCents = Math.floor(adjustedMaxCents * 0.70)

  // Round to nearest $500
  const roundTo = 50000 // $500 in cents
  const roundedMax = Math.round(adjustedMaxCents / roundTo) * roundTo
  const roundedMin = Math.round(minCents / roundTo) * roundTo

  return {
    minCents: Math.max(roundedMin, 0),
    maxCents: Math.max(roundedMax, 0),
  }
}

function getIbvFactor(ibvOutcome: IbvOutcome, band: IpredictBand): number {
  if (ibvOutcome === "SUFFICIENT") return 1.0
  if (ibvOutcome === "WEAK") return band === "PASS" ? 0.90 : 0.80
  // NOT_TRIGGERED or INCOMPLETE
  if (band === "PASS") return 0.95
  return 0.85
}

/**
 * Returns the shopping pass expiry date.
 */
export function getShoppingPassExpiry(): Date {
  return new Date(Date.now() + SHOPPING_PASS_VALIDITY_DAYS * 24 * 60 * 60 * 1000)
}
