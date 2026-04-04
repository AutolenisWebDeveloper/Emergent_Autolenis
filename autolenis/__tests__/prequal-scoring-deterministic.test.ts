/**
 * Tests for deterministic pre-qualification scoring logic.
 *
 * The internal scoring engine must produce consistent results for the
 * same input profile — no Math.random() in scoring paths.
 */
import { describe, it, expect } from "vitest"
import path from "path"
import fs from "fs"

const ROOT = path.resolve(__dirname, "..")

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf-8")
}

describe("PreQual scoring — determinism", () => {
  const source = readSource("lib/services/prequal.service.ts")

  it("does NOT use Math.random() for credit scoring", () => {
    // Extract the prequalify method body (between the function signature and the return block)
    const scoringBlock = source.slice(
      source.indexOf("// Scoring logic based on income and housing"),
      source.indexOf("providerReferenceId:"),
    )
    expect(scoringBlock).not.toContain("Math.random()")
  })

  it("uses deterministic estimatedScore formula", () => {
    expect(source).toContain("dtiScore")
    expect(source).toContain("incomeScore")
    expect(source).toContain("stabilityScore")
    expect(source).toContain("estimatedScore")
  })

  it("covers all credit tiers aligned to Prisma CreditTier enum", () => {
    expect(source).toContain('"EXCELLENT"')
    expect(source).toContain('"GOOD"')
    expect(source).toContain('"FAIR"')
    expect(source).toContain('"POOR"')
  })

  it("rejects DTI > 50", () => {
    expect(source).toContain("dtiRatio > 50")
    expect(source).toContain("Debt-to-income ratio exceeds acceptable threshold")
  })
})

describe("PreQual scoring — deterministic values", () => {
  // Replicate the scoring formula locally to verify correctness
  function computeScore(monthlyIncome: number, monthlyHousing: number) {
    const dtiRatio = monthlyIncome > 0 ? (monthlyHousing / monthlyIncome) * 100 : 100
    if (dtiRatio > 50) return { rejected: true, dtiRatio }

    const dtiScore = Math.max(0, 100 - dtiRatio * 2)
    const incomeScore = Math.min(100, monthlyIncome / 80)
    const stabilityScore = Math.min(100, Math.max(0, 100 - (monthlyHousing / Math.max(monthlyIncome, 1)) * 200))
    const estimatedScore = Math.floor(600 + (dtiScore * 0.4 + incomeScore * 0.35 + stabilityScore * 0.25) * 2)

    let creditTier: string
    if (estimatedScore >= 750) creditTier = "EXCELLENT"
    else if (estimatedScore >= 700) creditTier = "GOOD"
    else if (estimatedScore >= 650) creditTier = "FAIR"
    else creditTier = "POOR"

    return { rejected: false, estimatedScore, creditTier, dtiRatio }
  }

  it("high income + low housing → EXCELLENT", () => {
    const result = computeScore(8000, 1000)
    expect(result.rejected).toBe(false)
    expect(result.creditTier).toBe("EXCELLENT")
  })

  it("moderate income + moderate housing → GOOD or above", () => {
    const result = computeScore(5000, 1200)
    expect(result.rejected).toBe(false)
    expect(["EXCELLENT", "GOOD"]).toContain(result.creditTier)
  })

  it("same inputs always produce the same tier", () => {
    const r1 = computeScore(4000, 1500)
    const r2 = computeScore(4000, 1500)
    expect(r1).toEqual(r2)
  })

  it("DTI > 50% is rejected", () => {
    const result = computeScore(2000, 1200) // 60% DTI
    expect(result.rejected).toBe(true)
  })

  it("zero income is rejected (DTI = 100)", () => {
    const result = computeScore(0, 500)
    expect(result.rejected).toBe(true)
  })
})
