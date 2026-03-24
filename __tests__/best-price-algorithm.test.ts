import { describe, it, expect } from "vitest"

/**
 * Best Price Engine algorithm tests
 *
 * Tests the pure-math ranking helpers used by BestPriceService
 * without requiring a database connection.
 */

// ──────────────────────────────────────────────────────────────
// Re-implement the pure-math helpers from BestPriceService
// ──────────────────────────────────────────────────────────────

const DEFAULT_WEIGHTS = {
  balanced: {
    otd: 0.35,
    monthly: 0.35,
    vehicle: 0.15,
    dealer: 0.1,
    junkFee: 0.05,
  },
  monthly: {
    shorterTermBonus: 0.2,
    aprPenalty: 0.3,
    budgetPenalty: 0.5,
  },
}

interface MockOffer {
  id: string
  cashOtdCents: number
  junkFeeRatio: number
  vehicleYear: number
  mileage: number
  isNew: boolean
  dealerIntegrity: number
  financingOptions: Array<{
    id: string
    apr: number
    termMonths: number
    monthlyPaymentCents: number
    isPromoted?: boolean
  }>
}

function getOfferOtdCents(offer: MockOffer): number {
  return offer.cashOtdCents
}

function calculateJunkFees(
  docFeeCents: number,
  dealerFeesCents: number,
  addOnsCents: number,
  totalOtdCents: number,
): { junkFeeCents: number; junkFeeRatio: number } {
  const junkFeeCents = docFeeCents + dealerFeesCents + addOnsCents
  const junkFeeRatio = totalOtdCents > 0 ? junkFeeCents / totalOtdCents : 0
  return { junkFeeCents, junkFeeRatio }
}

function filterByBrandPreference(
  offers: MockOffer[],
  preferredMakes: string[],
  getMake: (o: MockOffer) => string,
): { primaryUniverse: MockOffer[]; fallbackUniverse: MockOffer[] } {
  if (!preferredMakes || preferredMakes.length === 0) {
    return { primaryUniverse: offers, fallbackUniverse: offers }
  }
  const normalizedPreferred = preferredMakes.map((m) => m.toLowerCase().trim())
  const primaryUniverse = offers.filter((o) => {
    const make = getMake(o).toLowerCase().trim()
    return normalizedPreferred.includes(make)
  })
  return { primaryUniverse, fallbackUniverse: offers }
}

function rankBestCash(offers: MockOffer[], maxOtdCents: number | null, limit: number) {
  const scored = offers.map((offer) => {
    const otdCents = getOfferOtdCents(offer)
    let score = 1_000_000_000 / (otdCents || 1)
    score -= offer.junkFeeRatio * 1000
    score += (offer.vehicleYear - 2015) * 10
    score -= offer.mileage / 10000

    if (maxOtdCents && otdCents > maxOtdCents) {
      const overBudgetRatio = (otdCents - maxOtdCents) / maxOtdCents
      score -= overBudgetRatio * 5000
    }

    return { offer, score }
  })

  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}

function rankBestMonthly(
  offers: MockOffer[],
  maxMonthlyCents: number | null,
  weights: typeof DEFAULT_WEIGHTS.monthly,
  limit: number,
) {
  const pairs: Array<{ offer: MockOffer; optionIdx: number; score: number }> = []

  for (const offer of offers) {
    for (let idx = 0; idx < offer.financingOptions.length; idx++) {
      const option = offer.financingOptions[idx]
      const monthlyCents = option.monthlyPaymentCents
      const termMonths = option.termMonths
      const apr = option.apr

      if (monthlyCents <= 0 || termMonths < 12 || termMonths > 96 || apr < 0 || apr > 40) {
        continue
      }

      let score = 1_000_000 / monthlyCents
      const termBonus = ((96 - termMonths) / 96) * weights.shorterTermBonus * 100
      score += termBonus
      const aprPenalty = (apr / 40) * weights.aprPenalty * 100
      score -= aprPenalty

      if (maxMonthlyCents && monthlyCents > maxMonthlyCents) {
        const overRatio = (monthlyCents - maxMonthlyCents) / maxMonthlyCents
        score -= overRatio * weights.budgetPenalty * 1000
      }

      pairs.push({ offer, optionIdx: idx, score })
    }
  }

  // Keep only best per offer
  const bestByOffer = new Map<string, (typeof pairs)[0]>()
  for (const pair of pairs) {
    const existing = bestByOffer.get(pair.offer.id)
    if (!existing || pair.score > existing.score) {
      bestByOffer.set(pair.offer.id, pair)
    }
  }

  return Array.from(bestByOffer.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function rankBalanced(
  offers: MockOffer[],
  maxOtdCents: number | null,
  maxMonthlyCents: number | null,
  weights: typeof DEFAULT_WEIGHTS.balanced,
  limit: number,
) {
  const otds = offers.map((o) => o.cashOtdCents)
  const minOtd = Math.min(...otds)
  const maxOtd = Math.max(...otds)

  const monthlies = offers
    .flatMap((o) => o.financingOptions.map((f) => f.monthlyPaymentCents))
    .filter((m) => m > 0)
  const minMonthly = monthlies.length > 0 ? Math.min(...monthlies) : 0
  const maxMonthly = monthlies.length > 0 ? Math.max(...monthlies) : 1

  const scored = offers.map((offer) => {
    const otdCents = offer.cashOtdCents
    const otdScore = maxOtd !== minOtd ? (maxOtd - otdCents) / (maxOtd - minOtd) : 1

    const promoted = offer.financingOptions.find((f) => f.isPromoted)
    const standardTerm = offer.financingOptions
      .filter((f) => f.termMonths >= 60 && f.termMonths <= 72)
      .sort((a, b) => a.monthlyPaymentCents - b.monthlyPaymentCents)[0]
    const anyOption = [...offer.financingOptions].sort((a, b) => a.monthlyPaymentCents - b.monthlyPaymentCents)[0]
    const chosenOption = promoted || standardTerm || anyOption

    let monthlyScore = 0
    let monthlyCents: number | null = null
    if (chosenOption) {
      monthlyCents = chosenOption.monthlyPaymentCents
      monthlyScore = maxMonthly !== minMonthly ? (maxMonthly - monthlyCents) / (maxMonthly - minMonthly) : 1
    }

    const yearScore = Math.min(1, (offer.vehicleYear - 2015) / 10)
    const mileageScore = Math.max(0, 1 - offer.mileage / 150000)
    const isNewBonus = offer.isNew ? 0.2 : 0
    const vehicleScore = (yearScore + mileageScore + isNewBonus) / 2.2

    const dealerScore = offer.dealerIntegrity
    const junkFeeScore = 1 - Math.min(1, offer.junkFeeRatio * 5)

    let score =
      weights.otd * otdScore +
      weights.monthly * monthlyScore +
      weights.vehicle * vehicleScore +
      weights.dealer * dealerScore +
      weights.junkFee * junkFeeScore

    if (maxOtdCents && otdCents > maxOtdCents * 1.1) {
      score -= 0.2
    }
    if (maxMonthlyCents && monthlyCents && monthlyCents > maxMonthlyCents * 1.1) {
      score -= 0.3
    }

    return { offer, score: Math.round(score * 100) }
  })

  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}

// ──────────────────────────────────────────────────────────────
// Test fixtures
// ──────────────────────────────────────────────────────────────

function makeOffer(overrides: Partial<MockOffer> & { id: string }): MockOffer {
  return {
    cashOtdCents: 2500000,
    junkFeeRatio: 0.02,
    vehicleYear: 2023,
    mileage: 15000,
    isNew: false,
    dealerIntegrity: 0.9,
    financingOptions: [
      { id: `${overrides.id}-fin-1`, apr: 5.9, termMonths: 60, monthlyPaymentCents: 45000 },
    ],
    ...overrides,
  }
}

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

describe("Best Price Engine Algorithm", () => {
  describe("Junk Fee Calculation", () => {
    it("calculates junk fee ratio correctly", () => {
      const result = calculateJunkFees(8500, 50000, 29900, 2500000)
      expect(result.junkFeeCents).toBe(88400) // 85 + 500 + 299 = $884
      expect(result.junkFeeRatio).toBeCloseTo(0.03536, 4)
    })

    it("returns 0 ratio for zero OTD", () => {
      const result = calculateJunkFees(8500, 50000, 29900, 0)
      expect(result.junkFeeRatio).toBe(0)
    })

    it("returns 0 when no junk fees", () => {
      const result = calculateJunkFees(0, 0, 0, 2500000)
      expect(result.junkFeeCents).toBe(0)
      expect(result.junkFeeRatio).toBe(0)
    })
  })

  describe("Brand Preference Filtering", () => {
    const offers = [
      makeOffer({ id: "A" }),
      makeOffer({ id: "B" }),
      makeOffer({ id: "C" }),
    ]
    const getMake = (_o: MockOffer) => {
      if (_o.id === "A") return "Toyota"
      if (_o.id === "B") return "Honda"
      return "Ford"
    }

    it("returns all offers when no preferences", () => {
      const { primaryUniverse } = filterByBrandPreference(offers, [], getMake)
      expect(primaryUniverse).toHaveLength(3)
    })

    it("filters to preferred makes", () => {
      const { primaryUniverse, fallbackUniverse } = filterByBrandPreference(offers, ["Toyota"], getMake)
      expect(primaryUniverse).toHaveLength(1)
      expect(primaryUniverse[0].id).toBe("A")
      expect(fallbackUniverse).toHaveLength(3) // fallback always has all
    })

    it("handles case-insensitive matching", () => {
      const { primaryUniverse } = filterByBrandPreference(offers, ["HONDA"], getMake)
      expect(primaryUniverse).toHaveLength(1)
      expect(primaryUniverse[0].id).toBe("B")
    })
  })

  describe("rankBestCash", () => {
    it("ranks lower OTD higher", () => {
      const offers = [
        makeOffer({ id: "expensive", cashOtdCents: 3000000 }),
        makeOffer({ id: "cheap", cashOtdCents: 2000000 }),
        makeOffer({ id: "mid", cashOtdCents: 2500000 }),
      ]

      const ranked = rankBestCash(offers, null, 5)
      expect(ranked[0].offer.id).toBe("cheap")
      expect(ranked[ranked.length - 1].offer.id).toBe("expensive")
    })

    it("penalizes over-budget offers", () => {
      const offers = [
        makeOffer({ id: "within", cashOtdCents: 2400000 }),
        makeOffer({ id: "over", cashOtdCents: 2600000 }),
      ]

      const rankedWithBudget = rankBestCash(offers, 2500000, 5)
      const rankedWithoutBudget = rankBestCash(offers, null, 5)

      // With budget, the "over" offer should be penalized more
      const overScoreWithBudget = rankedWithBudget.find((r) => r.offer.id === "over")!.score
      const overScoreWithout = rankedWithoutBudget.find((r) => r.offer.id === "over")!.score
      expect(overScoreWithBudget).toBeLessThan(overScoreWithout)
    })

    it("respects limit parameter", () => {
      const offers = Array.from({ length: 10 }, (_, i) =>
        makeOffer({ id: `offer-${i}`, cashOtdCents: 2000000 + i * 100000 }),
      )

      const ranked = rankBestCash(offers, null, 3)
      expect(ranked).toHaveLength(3)
    })

    it("favors newer vehicles with same price", () => {
      const offers = [
        makeOffer({ id: "old", cashOtdCents: 2500000, vehicleYear: 2018 }),
        makeOffer({ id: "new", cashOtdCents: 2500000, vehicleYear: 2024 }),
      ]

      const ranked = rankBestCash(offers, null, 5)
      expect(ranked[0].offer.id).toBe("new")
    })

    it("penalizes high junk fee ratios", () => {
      const offers = [
        makeOffer({ id: "clean", cashOtdCents: 2500000, junkFeeRatio: 0.01 }),
        makeOffer({ id: "junk", cashOtdCents: 2500000, junkFeeRatio: 0.15 }),
      ]

      const ranked = rankBestCash(offers, null, 5)
      expect(ranked[0].offer.id).toBe("clean")
    })
  })

  describe("rankBestMonthly", () => {
    it("ranks lower monthly payment higher", () => {
      const offers = [
        makeOffer({
          id: "high-monthly",
          financingOptions: [{ id: "f1", apr: 5.9, termMonths: 60, monthlyPaymentCents: 55000 }],
        }),
        makeOffer({
          id: "low-monthly",
          financingOptions: [{ id: "f2", apr: 5.9, termMonths: 60, monthlyPaymentCents: 40000 }],
        }),
      ]

      const ranked = rankBestMonthly(offers, null, DEFAULT_WEIGHTS.monthly, 5)
      expect(ranked[0].offer.id).toBe("low-monthly")
    })

    it("skips invalid financing options", () => {
      const offers = [
        makeOffer({
          id: "invalid",
          financingOptions: [
            { id: "f1", apr: 5.9, termMonths: 6, monthlyPaymentCents: 40000 }, // term < 12
            { id: "f2", apr: 50, termMonths: 60, monthlyPaymentCents: 40000 }, // apr > 40
            { id: "f3", apr: 5.9, termMonths: 60, monthlyPaymentCents: 0 }, // zero payment
          ],
        }),
      ]

      const ranked = rankBestMonthly(offers, null, DEFAULT_WEIGHTS.monthly, 5)
      expect(ranked).toHaveLength(0)
    })

    it("gives shorter term bonus", () => {
      const offers = [
        makeOffer({
          id: "long-term",
          financingOptions: [{ id: "f1", apr: 5.9, termMonths: 84, monthlyPaymentCents: 35000 }],
        }),
        makeOffer({
          id: "short-term",
          financingOptions: [{ id: "f2", apr: 5.9, termMonths: 48, monthlyPaymentCents: 35000 }],
        }),
      ]

      const ranked = rankBestMonthly(offers, null, DEFAULT_WEIGHTS.monthly, 5)
      // Same monthly but short term should rank higher due to bonus
      expect(ranked[0].offer.id).toBe("short-term")
    })

    it("keeps only best option per offer", () => {
      const offers = [
        makeOffer({
          id: "multi",
          financingOptions: [
            { id: "f1", apr: 5.9, termMonths: 60, monthlyPaymentCents: 45000 },
            { id: "f2", apr: 3.9, termMonths: 48, monthlyPaymentCents: 50000 },
            { id: "f3", apr: 7.9, termMonths: 72, monthlyPaymentCents: 38000 },
          ],
        }),
      ]

      const ranked = rankBestMonthly(offers, null, DEFAULT_WEIGHTS.monthly, 5)
      expect(ranked).toHaveLength(1) // Only one entry per offer
    })

    it("penalizes over-budget monthly payments", () => {
      const offers = [
        makeOffer({
          id: "within",
          financingOptions: [{ id: "f1", apr: 5.9, termMonths: 60, monthlyPaymentCents: 40000 }],
        }),
        makeOffer({
          id: "over",
          financingOptions: [{ id: "f2", apr: 5.9, termMonths: 60, monthlyPaymentCents: 60000 }],
        }),
      ]

      const ranked = rankBestMonthly(offers, 45000, DEFAULT_WEIGHTS.monthly, 5)
      // "over" should be penalized
      const withinScore = ranked.find((r) => r.offer.id === "within")!.score
      const overScore = ranked.find((r) => r.offer.id === "over")!.score
      expect(withinScore).toBeGreaterThan(overScore)
    })
  })

  describe("rankBalanced", () => {
    it("produces scores between 0 and 100", () => {
      const offers = [
        makeOffer({ id: "A", cashOtdCents: 2000000 }),
        makeOffer({ id: "B", cashOtdCents: 3000000 }),
      ]

      const ranked = rankBalanced(offers, null, null, DEFAULT_WEIGHTS.balanced, 5)
      for (const r of ranked) {
        expect(r.score).toBeGreaterThanOrEqual(0)
        expect(r.score).toBeLessThanOrEqual(100)
      }
    })

    it("prefers offers with best combined metrics", () => {
      const offers = [
        makeOffer({
          id: "balanced",
          cashOtdCents: 2500000,
          vehicleYear: 2024,
          mileage: 5000,
          dealerIntegrity: 0.95,
          junkFeeRatio: 0.01,
          financingOptions: [{ id: "f1", apr: 4.9, termMonths: 60, monthlyPaymentCents: 38000 }],
        }),
        makeOffer({
          id: "cheap-bad",
          cashOtdCents: 2500000, // same price so OTD doesn't dominate
          vehicleYear: 2016,
          mileage: 120000,
          dealerIntegrity: 0.3,
          junkFeeRatio: 0.18,
          financingOptions: [{ id: "f2", apr: 15.9, termMonths: 84, monthlyPaymentCents: 55000 }],
        }),
      ]

      const ranked = rankBalanced(offers, null, null, DEFAULT_WEIGHTS.balanced, 5)
      expect(ranked[0].offer.id).toBe("balanced")
    })

    it("applies over-budget penalties", () => {
      const offers = [
        makeOffer({
          id: "within",
          cashOtdCents: 2400000,
          financingOptions: [{ id: "f1", apr: 5.9, termMonths: 60, monthlyPaymentCents: 40000 }],
        }),
        makeOffer({
          id: "over-both",
          cashOtdCents: 3500000,
          financingOptions: [{ id: "f2", apr: 5.9, termMonths: 60, monthlyPaymentCents: 70000 }],
        }),
      ]

      const ranked = rankBalanced(offers, 2500000, 45000, DEFAULT_WEIGHTS.balanced, 5)
      expect(ranked[0].offer.id).toBe("within")
    })

    it("respects limit parameter", () => {
      const offers = Array.from({ length: 10 }, (_, i) =>
        makeOffer({ id: `offer-${i}`, cashOtdCents: 2000000 + i * 100000 }),
      )

      const ranked = rankBalanced(offers, null, null, DEFAULT_WEIGHTS.balanced, 3)
      expect(ranked).toHaveLength(3)
    })

    it("handles single offer", () => {
      const offers = [makeOffer({ id: "only" })]
      const ranked = rankBalanced(offers, null, null, DEFAULT_WEIGHTS.balanced, 5)
      expect(ranked).toHaveLength(1)
      expect(ranked[0].score).toBeGreaterThan(0)
    })
  })

  describe("Weight configuration", () => {
    it("default weights sum to 1.0 for balanced", () => {
      const sum =
        DEFAULT_WEIGHTS.balanced.otd +
        DEFAULT_WEIGHTS.balanced.monthly +
        DEFAULT_WEIGHTS.balanced.vehicle +
        DEFAULT_WEIGHTS.balanced.dealer +
        DEFAULT_WEIGHTS.balanced.junkFee
      expect(sum).toBeCloseTo(1.0)
    })

    it("monthly weights sum to 1.0", () => {
      const sum =
        DEFAULT_WEIGHTS.monthly.shorterTermBonus +
        DEFAULT_WEIGHTS.monthly.aprPenalty +
        DEFAULT_WEIGHTS.monthly.budgetPenalty
      expect(sum).toBeCloseTo(1.0)
    })
  })
})
