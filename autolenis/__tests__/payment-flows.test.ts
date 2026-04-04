import { describe, it, expect } from "vitest"

/**
 * Payment flow tests — V2 Pricing Model
 *
 * Tests the pure-math helpers and fee calculation logic from PaymentService
 * without requiring Stripe or database connections.
 *
 * V2 model: FREE (Free Plan) + PREMIUM ($499 flat fee), $99 Serious Buyer Deposit
 * credited differently by plan:
 *   FREE → purchase credit at closing
 *   PREMIUM → fee credit ($400 remaining)
 */

// ──────────────────────────────────────────────────────────────
// V2 Constants
// ──────────────────────────────────────────────────────────────

const PREMIUM_FEE_CENTS = 49900  // $499
const DEPOSIT_AMOUNT_CENTS = 9900 // $99
const PREMIUM_REMAINING_CENTS = PREMIUM_FEE_CENTS - DEPOSIT_AMOUNT_CENTS // $400

type PlanId = "FREE" | "PREMIUM"

const COMMISSION_RATES = {
  LEVEL_1: 0.15, // 15%
  LEVEL_2: 0.03, // 3%
  LEVEL_3: 0.02, // 2%
} as const

// ──────────────────────────────────────────────────────────────
// V2 pure-math helpers
// ──────────────────────────────────────────────────────────────

/** V2: Fee is plan-based, not OTD-based */
function calculateBaseFee(plan: PlanId): number {
  return plan === "PREMIUM" ? PREMIUM_FEE_CENTS : 0
}

function calculateFeeOptions(plan: PlanId, depositPaid: boolean) {
  const baseFee = calculateBaseFee(plan)
  if (plan === "FREE") {
    return {
      baseFeeCents: 0,
      depositAppliedCents: 0,
      remainingCents: 0,
      depositAppliesTo: "PURCHASE_CREDIT" as const,
    }
  }
  const depositApplied = depositPaid ? DEPOSIT_AMOUNT_CENTS : 0
  return {
    baseFeeCents: baseFee,
    depositAppliedCents: depositApplied,
    remainingCents: baseFee - depositApplied,
    depositAppliesTo: "FEE_CREDIT" as const,
  }
}

function calculateLoanImpact(
  feeAmountCents: number,
  apr: number,
  termMonths: number,
  baseMonthlyPaymentCents: number,
) {
  const monthlyRate = apr / 12 / 100
  const feeAmount = feeAmountCents / 100

  const feeMonthly =
    (feeAmount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1)

  const baseMonthly = baseMonthlyPaymentCents / 100
  const newMonthly = baseMonthly + feeMonthly
  const totalExtraCost = feeMonthly * termMonths

  return {
    feeAmountCents,
    apr,
    termMonths,
    baseMonthlyPaymentCents,
    baseMonthlyCents: baseMonthlyPaymentCents,
    newMonthlyCents: Math.round(newMonthly * 100),
    deltaMonthlyCents: Math.round(feeMonthly * 100),
    totalExtraCostCents: Math.round(totalExtraCost * 100),
    feeAmount,
    baseMonthly,
    newMonthly,
    monthlyIncrease: feeMonthly,
    totalExtraCost,
  }
}

function calculateCommissions(baseFeeCents: number) {
  const level1 = Math.round(baseFeeCents * COMMISSION_RATES.LEVEL_1)
  const level2 = Math.round(baseFeeCents * COMMISSION_RATES.LEVEL_2)
  const level3 = Math.round(baseFeeCents * COMMISSION_RATES.LEVEL_3)
  return { level1, level2, level3 }
}

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

describe("Payment Flow Tests — V2 Pricing", () => {
  describe("Plan-Based Fee Calculation", () => {
    it("returns no fee for FREE plan", () => {
      expect(calculateBaseFee("FREE")).toBe(0)
    })

    it("returns $499 for PREMIUM plan", () => {
      expect(calculateBaseFee("PREMIUM")).toBe(49900)
    })
  })

  describe("Fee Options with Deposit Credit", () => {
    it("PREMIUM with deposit: $99 credit, $400 remaining", () => {
      const result = calculateFeeOptions("PREMIUM", true)
      expect(result.baseFeeCents).toBe(49900)
      expect(result.depositAppliedCents).toBe(9900)
      expect(result.remainingCents).toBe(40000) // $499 - $99 = $400
      expect(result.depositAppliesTo).toBe("FEE_CREDIT")
    })

    it("PREMIUM without deposit: full $499 remaining", () => {
      const result = calculateFeeOptions("PREMIUM", false)
      expect(result.depositAppliedCents).toBe(0)
      expect(result.remainingCents).toBe(49900)
    })

    it("FREE: no concierge fee, deposit is purchase credit", () => {
      const result = calculateFeeOptions("FREE", true)
      expect(result.baseFeeCents).toBe(0)
      expect(result.remainingCents).toBe(0)
      expect(result.depositAppliesTo).toBe("PURCHASE_CREDIT")
    })
  })

  describe("Loan Impact Calculator", () => {
    it("calculates monthly increase for fee inclusion in loan", () => {
      // Include $400 remaining fee in a 60-month loan at 5.9% APR
      const result = calculateLoanImpact(40000, 5.9, 60, 45000)

      expect(result.deltaMonthlyCents).toBeGreaterThan(0)
      expect(result.newMonthlyCents).toBeGreaterThan(result.baseMonthlyCents)
      expect(result.totalExtraCostCents).toBeGreaterThan(result.feeAmountCents)
    })

    it("total extra cost exceeds fee due to interest", () => {
      const result = calculateLoanImpact(40000, 5.9, 60, 45000)
      expect(result.totalExtraCostCents).toBeGreaterThan(40000)
    })

    it("higher APR means higher total cost", () => {
      const lowApr = calculateLoanImpact(40000, 3.0, 60, 45000)
      const highApr = calculateLoanImpact(40000, 9.9, 60, 45000)
      expect(highApr.totalExtraCostCents).toBeGreaterThan(lowApr.totalExtraCostCents)
    })

    it("longer term means higher total cost", () => {
      const shortTerm = calculateLoanImpact(40000, 5.9, 36, 45000)
      const longTerm = calculateLoanImpact(40000, 5.9, 84, 45000)
      expect(longTerm.totalExtraCostCents).toBeGreaterThan(shortTerm.totalExtraCostCents)
    })

    it("shorter term means higher monthly increase", () => {
      const shortTerm = calculateLoanImpact(40000, 5.9, 36, 45000)
      const longTerm = calculateLoanImpact(40000, 5.9, 84, 45000)
      expect(shortTerm.deltaMonthlyCents).toBeGreaterThan(longTerm.deltaMonthlyCents)
    })
  })

  describe("Commission Calculations", () => {
    it("calculates 3-level commission on $499 premium fee", () => {
      const result = calculateCommissions(49900)
      expect(result.level1).toBe(7485) // 15% of $499 = $74.85
      expect(result.level2).toBe(1497) // 3% of $499 = $14.97
      expect(result.level3).toBe(998)  // 2% of $499 = $9.98
    })

    it("total commissions are 20% of base fee", () => {
      const result = calculateCommissions(49900)
      const total = result.level1 + result.level2 + result.level3
      expect(total).toBe(Math.round(49900 * 0.20))
    })

    it("handles zero fee (FREE plan)", () => {
      const result = calculateCommissions(0)
      expect(result.level1).toBe(0)
      expect(result.level2).toBe(0)
      expect(result.level3).toBe(0)
    })
  })

  describe("Deposit Amount", () => {
    it("deposit is $99", () => {
      expect(DEPOSIT_AMOUNT_CENTS).toBe(9900)
    })

    it("premium remaining is $400", () => {
      expect(PREMIUM_REMAINING_CENTS).toBe(40000)
    })
  })

  describe("End-to-End Fee Flow", () => {
    it("FREE plan: deposit is purchase credit, no concierge fee", () => {
      const baseFee = calculateBaseFee("FREE")
      expect(baseFee).toBe(0)

      const feeOptions = calculateFeeOptions("FREE", true)
      expect(feeOptions.remainingCents).toBe(0)
      expect(feeOptions.depositAppliesTo).toBe("PURCHASE_CREDIT")

      // No commission on FREE plan
      const commissions = calculateCommissions(baseFee)
      expect(commissions.level1).toBe(0)
    })

    it("PREMIUM plan: deposit as fee credit, $400 remaining, full flow", () => {
      // Step 1: PREMIUM plan → $499 fee
      const baseFee = calculateBaseFee("PREMIUM")
      expect(baseFee).toBe(49900)

      // Step 2: Deposit paid → fee credit
      const feeOptions = calculateFeeOptions("PREMIUM", true)
      expect(feeOptions.remainingCents).toBe(40000) // $400 remaining
      expect(feeOptions.depositAppliesTo).toBe("FEE_CREDIT")

      // Step 3: Include remaining in loan at 5.9% APR, 60 months
      const impact = calculateLoanImpact(feeOptions.remainingCents, 5.9, 60, 45000)
      expect(impact.newMonthlyCents).toBeGreaterThan(45000)

      // Step 4: Commission earned on base fee
      const commissions = calculateCommissions(baseFee)
      expect(commissions.level1).toBe(7485) // $74.85 for L1 affiliate
    })
  })
})
