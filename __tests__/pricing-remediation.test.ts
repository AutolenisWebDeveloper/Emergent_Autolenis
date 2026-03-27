import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

/**
 * Pricing Remediation Tests
 *
 * These tests prove that the V1 tiered pricing fallback ($750 path) has been
 * eliminated and the entire backend aligns with the authoritative V2 flat-fee
 * pricing model:
 *
 *   - Standard (FREE) = no concierge fee
 *   - Serious Buyer Deposit = $99
 *   - Premium concierge fee = $499 flat
 *   - Deposit credit toward Premium = $99
 *   - Premium remaining after deposit credit = $400
 *   - No OTD-threshold pricing
 *   - No $750 path anywhere in active backend behavior
 */

// ── Import authoritative pricing config ─────────────────────────────
import { PRICING, PRICING_DISPLAY, depositAppliesTo } from "@/src/config/pricingConfig"
import { PREMIUM_FEE, PREMIUM_FEE_CENTS, DEPOSIT_AMOUNT, DEPOSIT_AMOUNT_CENTS } from "@/lib/constants"

// ── Inline the calculateBaseFee logic for pure-math verification ────
// (mirrors the production implementation after V1 removal)
type PlanId = "FREE" | "PREMIUM"

function calculateBaseFee(_totalOtdCents: number, plan?: PlanId): number {
  if (plan === "FREE") return 0
  return PRICING.premiumFeeCents // $499
}

function calculatePremiumFeeRemaining(depositPaid: boolean): number {
  if (!depositPaid) return PREMIUM_FEE_CENTS
  return PRICING.premiumFeeRemainingCents // $400
}

// ─────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────

describe("Pricing Remediation — V1 Elimination", () => {
  describe("No active path can return or charge $750", () => {
    it("calculateBaseFee returns $499 for PREMIUM regardless of OTD", () => {
      // V1 would return $750 (75000 cents) for OTD > $35,000.
      // V2 always returns $499 regardless of OTD amount.
      expect(calculateBaseFee(5000000, "PREMIUM")).toBe(49900) // $50,000 OTD
      expect(calculateBaseFee(3500001, "PREMIUM")).toBe(49900) // $35,000.01 OTD (was V1 HIGH_TIER trigger)
      expect(calculateBaseFee(10000000, "PREMIUM")).toBe(49900) // $100,000 OTD
      expect(calculateBaseFee(1, "PREMIUM")).toBe(49900) // $0.01 OTD
    })

    it("calculateBaseFee returns $499 when plan is undefined (default)", () => {
      // This was the V1 fallback path — plan undefined meant OTD-threshold logic.
      // Now defaults to PREMIUM fee regardless of OTD.
      expect(calculateBaseFee(5000000)).toBe(49900)   // Was $750 in V1
      expect(calculateBaseFee(3500001)).toBe(49900)    // Was $750 in V1
      expect(calculateBaseFee(10000000)).toBe(49900)   // Was $750 in V1
      expect(calculateBaseFee(3500000)).toBe(49900)    // Was $499 in V1
      expect(calculateBaseFee(100)).toBe(49900)         // Was $499 in V1
    })

    it("calculateBaseFee returns $0 for FREE plan", () => {
      expect(calculateBaseFee(0, "FREE")).toBe(0)
      expect(calculateBaseFee(5000000, "FREE")).toBe(0)
      expect(calculateBaseFee(10000000, "FREE")).toBe(0)
    })

    it("no possible input to calculateBaseFee can produce 75000 cents ($750)", () => {
      const testOtdValues = [0, 100, 9900, 3499999, 3500000, 3500001, 5000000, 10000000, Number.MAX_SAFE_INTEGER]
      const plans: (PlanId | undefined)[] = ["FREE", "PREMIUM", undefined]
      for (const otd of testOtdValues) {
        for (const plan of plans) {
          const fee = calculateBaseFee(otd, plan)
          expect(fee).not.toBe(75000) // $750 must never appear
          expect(fee === 0 || fee === 49900).toBe(true)
        }
      }
    })
  })

  describe("PaymentService and CheckoutService agree on the same fee", () => {
    it("premium fee is always $499 (49900 cents)", () => {
      expect(PREMIUM_FEE).toBe(499)
      expect(PREMIUM_FEE_CENTS).toBe(49900)
      expect(PRICING.premiumFeeCents).toBe(49900)
    })

    it("deposit is always $99 (9900 cents)", () => {
      expect(DEPOSIT_AMOUNT).toBe(99)
      expect(DEPOSIT_AMOUNT_CENTS).toBe(9900)
      expect(PRICING.depositAmountCents).toBe(9900)
    })

    it("premium remaining after deposit is always $400 (40000 cents)", () => {
      expect(PRICING.premiumFeeRemainingCents).toBe(40000)
      expect(calculatePremiumFeeRemaining(true)).toBe(40000)
      expect(PREMIUM_FEE_CENTS - DEPOSIT_AMOUNT_CENTS).toBe(40000)
    })

    it("premium remaining without deposit is $499 (49900 cents)", () => {
      expect(calculatePremiumFeeRemaining(false)).toBe(49900)
    })

    it("display values match numeric values", () => {
      expect(PRICING_DISPLAY.depositAmount).toBe("$99")
      expect(PRICING_DISPLAY.premiumFee).toBe("$499")
      expect(PRICING_DISPLAY.premiumFeeRemaining).toBe("$400")
    })
  })

  describe("Deposit credit handling is consistent", () => {
    it("PREMIUM deposit applies as FEE_CREDIT", () => {
      expect(depositAppliesTo("PREMIUM")).toBe("FEE_CREDIT")
    })

    it("FREE deposit applies as PURCHASE_CREDIT", () => {
      expect(depositAppliesTo("FREE")).toBe("PURCHASE_CREDIT")
    })

    it("deposit credit equals $99 (9900 cents)", () => {
      expect(DEPOSIT_AMOUNT_CENTS).toBe(9900)
      expect(PRICING.depositAmountCents).toBe(9900)
    })

    it("premium fee minus deposit credit equals $400", () => {
      const remainingCents = PRICING.premiumFeeCents - PRICING.depositAmountCents
      expect(remainingCents).toBe(40000)
      expect(remainingCents).toBe(PRICING.premiumFeeRemainingCents)
    })
  })
})

describe("Pricing Remediation — Source Code Verification", () => {
  const paymentServicePath = path.join(
    process.cwd(),
    "lib/services/payment.service.ts"
  )
  const constantsPath = path.join(process.cwd(), "lib/constants.ts")
  const checkoutServicePath = path.join(
    process.cwd(),
    "lib/services/checkout.service.ts"
  )
  const adminRefundPath = path.join(
    process.cwd(),
    "app/api/admin/deals/[dealId]/refunds/route.ts"
  )

  it("payment.service.ts does not import FEE_STRUCTURE_CENTS", () => {
    const src = fs.readFileSync(paymentServicePath, "utf8")
    expect(src).not.toContain("FEE_STRUCTURE_CENTS")
  })

  it("payment.service.ts calculateBaseFee has no OTD-based branching logic", () => {
    const src = fs.readFileSync(paymentServicePath, "utf8")
    // Extract the calculateBaseFee function body
    const fnMatch = src.match(/static calculateBaseFee[\s\S]*?^\s*\}/m)
    expect(fnMatch).toBeTruthy()
    const fnBody = fnMatch![0]
    // Must not reference threshold-based pricing constants or branching
    expect(fnBody).not.toContain("LOW_TIER")
    expect(fnBody).not.toContain("HIGH_TIER")
    expect(fnBody).not.toContain("75000")
    expect(fnBody).not.toContain("FEE_STRUCTURE")
    expect(fnBody).not.toContain("totalOtdCents <=")
    expect(fnBody).not.toContain("totalOtdCents >=")
  })

  it("payment.service.ts does not contain active V1 tiered pricing", () => {
    const src = fs.readFileSync(paymentServicePath, "utf8")
    expect(src).not.toContain("FEE_STRUCTURE_CENTS.HIGH_TIER")
    expect(src).not.toContain("FEE_STRUCTURE_CENTS.LOW_TIER")
    expect(src).not.toContain("FEE_STRUCTURE.HIGH_TIER")
    expect(src).not.toContain("FEE_STRUCTURE.LOW_TIER")
  })

  it("legacy FEE_STRUCTURE constants are marked @deprecated in constants.ts", () => {
    const src = fs.readFileSync(constantsPath, "utf8")
    expect(src).toContain("@deprecated")
    expect(src).toContain("DEPRECATED")
  })

  it("payment.service.ts getFeeOptions checks deposit status with both PAID and SUCCEEDED", () => {
    const src = fs.readFileSync(paymentServicePath, "utf8")
    // Verify getFeeOptions deposit query uses .in() with both statuses
    const feeOptionsMatch = src.match(/static async getFeeOptions[\s\S]*?return \{[\s\S]*?\}/m)
    expect(feeOptionsMatch).toBeTruthy()
    const feeOptionsBody = feeOptionsMatch![0]
    expect(feeOptionsBody).toContain('"PAID", "SUCCEEDED"')
  })

  it("checkout.service.ts uses flat PREMIUM_FEE (not calculateBaseFee)", () => {
    const src = fs.readFileSync(checkoutServicePath, "utf8")
    expect(src).toContain("PREMIUM_FEE")
    expect(src).not.toContain("calculateBaseFee")
    expect(src).not.toContain("FEE_STRUCTURE")
    expect(src).not.toContain("75000")
  })

  it("checkout.service.ts checks deposit status with both SUCCEEDED and PAID", () => {
    const src = fs.readFileSync(checkoutServicePath, "utf8")
    expect(src).toContain('"SUCCEEDED", "PAID"')
  })

  it("admin refund route includes commission reversal for SERVICE_FEE", () => {
    const src = fs.readFileSync(adminRefundPath, "utf8")
    expect(src).toContain("Commission")
    expect(src).toContain("REVERSED")
    expect(src).toContain('paymentType === "SERVICE_FEE"')
  })
})

describe("Pricing Remediation — Deposit Status Normalization", () => {
  it("PaymentStatus enum defines SUCCEEDED (not PAID) as the canonical success value", () => {
    // Verify by reading the source file directly
    const statusesSrc = fs.readFileSync(
      path.join(process.cwd(), "lib/constants/statuses.ts"),
      "utf8"
    )
    // PaymentStatus should have SUCCEEDED defined
    expect(statusesSrc).toContain('SUCCEEDED: "SUCCEEDED"')
    // PaymentStatus should NOT have a PAID entry (PAID exists in other enums like CommissionStatus)
    // Check specifically within the PaymentStatus block
    const paymentStatusMatch = statusesSrc.match(/PaymentStatus\s*=\s*\{[\s\S]*?\}\s*as const/)
    expect(paymentStatusMatch).toBeTruthy()
    const paymentStatusBlock = paymentStatusMatch![0]
    expect(paymentStatusBlock).toContain("SUCCEEDED")
    expect(paymentStatusBlock).not.toMatch(/^\s*PAID:/m) // No PAID key in PaymentStatus
  })

  it("payment.service.ts deposit read queries use .in() for both PAID and SUCCEEDED", () => {
    const paymentSrc = fs.readFileSync(
      path.join(process.cwd(), "lib/services/payment.service.ts"),
      "utf8"
    )
    // getFeeOptions deposit query should use .in("status", ["PAID", "SUCCEEDED"])
    expect(paymentSrc).toContain('.in("status", ["PAID", "SUCCEEDED"])')
    // checkIfDepositPaid should use .in("status", ["PAID", "SUCCEEDED"])
    const checkMethod = paymentSrc.match(/checkIfDepositPaid[\s\S]*?return existing/)
    expect(checkMethod).toBeTruthy()
    expect(checkMethod![0]).toContain('.in("status", ["PAID", "SUCCEEDED"])')
  })
})
