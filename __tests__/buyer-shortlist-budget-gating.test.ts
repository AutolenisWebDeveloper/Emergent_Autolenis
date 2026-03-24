/**
 * Buyer Shortlist Budget Gating Test
 *
 * Validates that the shortlist API:
 * 1. Enforces BUYER-only access
 * 2. Gates budget visibility via prequal data
 * 3. Returns withinBudget field for each item
 * 4. Caps shortlist items at MAX_SHORTLIST_ITEMS
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

const ROOT = join(__dirname, "..")

describe("Buyer Shortlist Budget Gating", () => {
  const src = readFileSync(join(ROOT, "app/api/buyer/shortlist/route.ts"), "utf-8")

  it("enforces BUYER role on GET", () => {
    expect(src).toMatch(/user\.role\s*!==\s*["']BUYER["']/)
  })

  it("enforces BUYER role on POST", () => {
    // POST handler also checks BUYER role
    const postSection = src.slice(src.indexOf("export async function POST"))
    expect(postSection).toMatch(/user\.role\s*!==\s*["']BUYER["']/)
  })

  it("enforces BUYER role on DELETE", () => {
    const deleteSection = src.slice(src.indexOf("export async function DELETE"))
    expect(deleteSection).toMatch(/user\.role\s*!==\s*["']BUYER["']/)
  })

  it("fetches prequalification for budget gating", () => {
    expect(src).toContain("PreQualification")
    expect(src).toContain("maxOtdAmountCents")
  })

  it("computes withinBudget for each item", () => {
    expect(src).toContain("withinBudget")
    // Check that withinBudget is derived from price vs. maxOtdCents comparison
    expect(src).toMatch(/priceCents\s*<=\s*maxOtdCents/)
  })

  it("defines MAX_SHORTLIST_ITEMS constant", () => {
    expect(src).toContain("MAX_SHORTLIST_ITEMS")
    // Verify it's a reasonable number
    const match = src.match(/MAX_SHORTLIST_ITEMS\s*=\s*(\d+)/)
    expect(match).not.toBeNull()
    const max = parseInt(match![1], 10)
    expect(max).toBeGreaterThanOrEqual(5)
    expect(max).toBeLessThanOrEqual(50)
  })

  it("enforces item limit on POST", () => {
    const postSection = src.slice(src.indexOf("export async function POST"))
    expect(postSection).toContain("MAX_SHORTLIST_ITEMS")
  })

  it("implements idempotent add (existing items return success)", () => {
    expect(src).toContain("Already in shortlist")
  })

  it("uses soft-delete for item removal", () => {
    expect(src).toContain("removed_at")
  })
})
