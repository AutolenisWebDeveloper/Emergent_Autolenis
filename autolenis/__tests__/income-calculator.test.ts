import { describe, expect, it } from "vitest"

/**
 * Income Calculator Logic — V2 Pricing
 *
 * V2 model: single $499 Premium plan fee. No $750 tier.
 * Commission rates: L1=15%, L2=3%, L3=2% (total 20%).
 * Tests mirror the logic in components/affiliate/income-planner.tsx.
 */

const COMMISSION_RATES = [0.15, 0.03, 0.02]
const PACKAGE_PRICE = 499 // V2: single $499 Premium fee

function calcIncome(salesByLevel: number[], packagePrice: number): number {
  return salesByLevel.reduce(
    (total, sales, i) => total + sales * packagePrice * (COMMISSION_RATES[i] || 0),
    0,
  )
}

function calcSalesForGoal(
  goalIncome: number,
  goalContribution: number[],
  packagePrice: number,
): number[] {
  const total = goalContribution.reduce((s, v) => s + v, 0) || 1
  return goalContribution.map((pct, i) => {
    const normalizedPct = pct / total
    const levelIncome = goalIncome * normalizedPct
    const commissionPerSale = packagePrice * (COMMISSION_RATES[i] || 0)
    return commissionPerSale > 0 ? Math.ceil(levelIncome / commissionPerSale) : 0
  })
}

function sanitizeInt(raw: string, max: number): { value: number; error: string | null } {
  if (raw === "") return { value: 0, error: null }
  const n = Number(raw)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return { value: 0, error: "Enter a whole number" }
  if (n < 0) return { value: 0, error: "Must be 0 or greater" }
  if (n > max) return { value: max, error: `Max value is ${max.toLocaleString()}` }
  return { value: n, error: null }
}

describe("Income Calculator Logic — V2 Pricing", () => {
  describe("sanitizeInt", () => {
    it("accepts valid integers", () => {
      expect(sanitizeInt("100", 10000)).toEqual({ value: 100, error: null })
      expect(sanitizeInt("0", 10000)).toEqual({ value: 0, error: null })
      expect(sanitizeInt("250", 250)).toEqual({ value: 250, error: null })
    })

    it("rejects negative numbers", () => {
      const result = sanitizeInt("-5", 10000)
      expect(result.value).toBe(0)
      expect(result.error).toBe("Must be 0 or greater")
    })

    it("rejects non-integers", () => {
      const result = sanitizeInt("3.5", 10000)
      expect(result.value).toBe(0)
      expect(result.error).toBe("Enter a whole number")
    })

    it("clamps values above max", () => {
      const result = sanitizeInt("500", 250)
      expect(result.value).toBe(250)
      expect(result.error).toContain("Max value")
    })

    it("handles empty string", () => {
      expect(sanitizeInt("", 10000)).toEqual({ value: 0, error: null })
    })
  })

  describe("V2 single package price", () => {
    it("uses $499 flat Premium fee", () => {
      expect(PACKAGE_PRICE).toBe(499)
    })
  })

  describe("estimate income", () => {
    it("calculates income with all zeros", () => {
      expect(calcIncome([0, 0, 0], PACKAGE_PRICE)).toBe(0)
    })

    it("calculates income for 10 direct sales at $499", () => {
      const income = calcIncome([10, 0, 0], PACKAGE_PRICE)
      expect(income).toBeCloseTo(10 * 499 * 0.15, 2) // $748.50
    })

    it("allows sales up to 250 via slider range", () => {
      const income = calcIncome([250, 0, 0], PACKAGE_PRICE)
      expect(income).toBeCloseTo(250 * 499 * 0.15, 2) // $18,712.50
    })

    it("allows sales above 250 via numeric input (e.g., 500)", () => {
      const income = calcIncome([500, 0, 0], PACKAGE_PRICE)
      expect(income).toBeCloseTo(500 * 499 * 0.15, 2)
    })

    it("calculates income across all 3 levels", () => {
      const income = calcIncome([10, 20, 30], PACKAGE_PRICE)
      const expected = 10 * 499 * 0.15 + 20 * 499 * 0.03 + 30 * 499 * 0.02
      expect(income).toBeCloseTo(expected, 2)
    })
  })

  describe("goal calculator with level contribution", () => {
    it("calculates sales for $5000 goal with 50/30/20 split at $499", () => {
      const sales = calcSalesForGoal(5000, [50, 30, 20], PACKAGE_PRICE)
      // Direct: 5000*0.50 / (499*0.15) = 2500/74.85 = 34 (ceil)
      expect(sales[0]).toBe(Math.ceil(5000 * 0.50 / (499 * 0.15)))
      // 2nd: 5000*0.30 / (499*0.03) = 1500/14.97 = 101 (ceil)
      expect(sales[1]).toBe(Math.ceil(5000 * 0.30 / (499 * 0.03)))
      // 3rd: 5000*0.20 / (499*0.02) = 1000/9.98 = 101 (ceil)
      expect(sales[2]).toBe(Math.ceil(5000 * 0.20 / (499 * 0.02)))
    })

    it("calculates sales for 70/20/10 split at $499", () => {
      const sales = calcSalesForGoal(5000, [70, 20, 10], PACKAGE_PRICE)
      // Direct: 5000*0.70 / (499*0.15) = 3500/74.85 = 47 (ceil)
      expect(sales[0]).toBe(Math.ceil(5000 * 0.70 / (499 * 0.15)))
      // 2nd: 5000*0.20 / (499*0.03) = 1000/14.97 = 67 (ceil)
      expect(sales[1]).toBe(Math.ceil(5000 * 0.20 / (499 * 0.03)))
      // 3rd: 5000*0.10 / (499*0.02) = 500/9.98 = 51 (ceil)
      expect(sales[2]).toBe(Math.ceil(5000 * 0.10 / (499 * 0.02)))
    })

    it("normalizes contributions that don't sum to 100", () => {
      const salesAt50 = calcSalesForGoal(5000, [50, 50, 50], PACKAGE_PRICE)
      // 50/50/50 normalizes to ~33.3% each
      expect(salesAt50[0]).toBeGreaterThan(0)
      expect(salesAt50[1]).toBeGreaterThan(0)
      expect(salesAt50[2]).toBeGreaterThan(0)
    })

    it("handles zero goal income", () => {
      const sales = calcSalesForGoal(0, [50, 30, 20], PACKAGE_PRICE)
      expect(sales).toEqual([0, 0, 0])
    })
  })
})
