import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

// ─── Commission Rate Consistency ────────────────────────────────────────────
// The service defines the canonical commission rates. All UI/API code must
// match exactly: L1=15%, L2=3%, L3=2%.
// ─────────────────────────────────────────────────────────────────────────────

const SERVICE_RATES = { 1: 0.15, 2: 0.03, 3: 0.02 }

describe("Commission Rate Consistency", () => {
  it("service defines 3-level rates: 15/3/2", () => {
    const serviceSrc = readFileSync(
      resolve(__dirname, "../lib/services/affiliate.service.ts"),
      "utf-8",
    )
    expect(serviceSrc).toContain("1: 0.15")
    expect(serviceSrc).toContain("2: 0.03")
    expect(serviceSrc).toContain("3: 0.02")
  })

  it("income planner component uses matching rates", () => {
    const src = readFileSync(
      resolve(__dirname, "../components/affiliate/income-planner.tsx"),
      "utf-8",
    )
    expect(src).toContain("0.15")
    expect(src).toContain("0.03")
    expect(src).toContain("0.02")
    // COMMISSION_RATES array must contain exactly 3 levels
    expect(src).toMatch(/COMMISSION_RATES\s*=\s*\[0\.15/)
  })

  it("dashboard API uses matching rates", () => {
    const src = readFileSync(
      resolve(__dirname, "../app/api/affiliate/dashboard/route.ts"),
      "utf-8",
    )
    // Must define COMMISSION_RATES with correct values
    expect(src).toContain("1: 0.15")
    expect(src).toContain("2: 0.03")
    expect(src).toContain("3: 0.02")
  })

  it("income calculator test uses matching rates", () => {
    const src = readFileSync(
      resolve(__dirname, "./income-calculator.test.ts"),
      "utf-8",
    )
    expect(src).toContain("0.15")
    expect(src).toContain("0.03")
    expect(src).toContain("0.02")
    // COMMISSION_RATES array must contain 3-level rates
    expect(src).toMatch(/COMMISSION_RATES\s*=\s*\[0\.15/)
  })

  it("onboarding page shows correct rates", () => {
    const src = readFileSync(
      resolve(__dirname, "../app/affiliate/portal/onboarding/page.tsx"),
      "utf-8",
    )
    // Should contain correct rates
    expect(src).toContain(">15%<")
    expect(src).toContain(">3%<")
    expect(src).toContain(">2%<")
    // Must NOT contain old rates or removed levels
    expect(src).not.toContain(">20%<")
    expect(src).not.toContain(">10%<")
    expect(src).not.toContain(">4%<")
    expect(src).not.toContain(">1%<")
    expect(src).not.toContain("Level 4")
    expect(src).not.toContain("Level 5")
  })

  it("total across all 3 levels is 20%", () => {
    const total = Object.values(SERVICE_RATES).reduce((s, r) => s + r, 0)
    expect(total).toBeCloseTo(0.20, 10)
  })
})

// ─── Commission Calculation Logic ───────────────────────────────────────────

describe("Commission Calculation Math", () => {
  const BASE_FEE_CENTS = 49500 // Default base fee ($495)

  function calculateCommission(level: number, baseFeeCents: number): number {
    const rate = SERVICE_RATES[level as keyof typeof SERVICE_RATES] || 0
    return Math.floor(baseFeeCents * rate)
  }

  it("Level 1 commission: 15% of $495 = $74.25", () => {
    expect(calculateCommission(1, BASE_FEE_CENTS)).toBe(7425)
  })

  it("Level 2 commission: 3% of $495 = $14.85", () => {
    expect(calculateCommission(2, BASE_FEE_CENTS)).toBe(1485)
  })

  it("Level 3 commission: 2% of $495 = $9.90", () => {
    expect(calculateCommission(3, BASE_FEE_CENTS)).toBe(990)
  })

  it("total commission for all 3 levels = $99.00 (20% of $495)", () => {
    let total = 0
    for (let level = 1; level <= 3; level++) {
      total += calculateCommission(level, BASE_FEE_CENTS)
    }
    expect(total).toBe(9900)
  })

  it("returns 0 for invalid levels (e.g., 4, 5, 6)", () => {
    expect(calculateCommission(4, BASE_FEE_CENTS)).toBe(0)
    expect(calculateCommission(5, BASE_FEE_CENTS)).toBe(0)
    expect(calculateCommission(6, BASE_FEE_CENTS)).toBe(0)
    expect(calculateCommission(0, BASE_FEE_CENTS)).toBe(0)
  })

  it("uses floor rounding (no overpay on fractional cents)", () => {
    // 15% of $499.01 = 7485.15 → floor to 7485
    expect(calculateCommission(1, 49901)).toBe(7485)
  })
})

// ─── API Authorization Checks ───────────────────────────────────────────────

describe("API Route Authorization", () => {
  const AFFILIATE_API_ROUTES = [
    "app/api/affiliate/dashboard/route.ts",
    "app/api/affiliate/commissions/route.ts",
    "app/api/affiliate/analytics/route.ts",
    "app/api/affiliate/settings/route.ts",
    "app/api/affiliate/documents/route.ts",
    "app/api/affiliate/share-link/route.ts",
  ]

  for (const route of AFFILIATE_API_ROUTES) {
    it(`${route} checks for affiliate role via shared isAffiliateRole or inline check`, () => {
      const src = readFileSync(resolve(__dirname, `../${route}`), "utf-8")
      // Must either import isAffiliateRole or inline check role
      const usesSharedCheck = src.includes("isAffiliateRole")
      const usesInlineCheck = src.includes("AFFILIATE") && src.includes("is_affiliate")
      expect(usesSharedCheck || usesInlineCheck).toBe(true)
    })
  }

  for (const route of AFFILIATE_API_ROUTES) {
    it(`${route} returns 401 for unauthenticated users`, () => {
      const src = readFileSync(resolve(__dirname, `../${route}`), "utf-8")
      expect(src).toContain("401")
    })
  }
})

// ─── Error Handling ─────────────────────────────────────────────────────────

describe("Error Handling — No Internal Message Leakage", () => {
  const ROUTES_WITH_CATCH = [
    "app/api/affiliate/dashboard/route.ts",
    "app/api/affiliate/commissions/route.ts",
    "app/api/affiliate/analytics/route.ts",
    "app/api/affiliate/payouts/route.ts",
    "app/api/affiliate/referrals/route.ts",
    "app/api/affiliate/settings/route.ts",
    "app/api/affiliate/documents/route.ts",
    "app/api/affiliate/click/route.ts",
    "app/api/affiliate/enroll/route.ts",
    "app/api/affiliate/process-referral/route.ts",
    "app/api/affiliate/share-link/route.ts",
    "app/api/affiliate/referral/route.ts",
    "app/api/affiliate/referrals/affiliates/route.ts",
    "app/api/affiliate/referrals/buyers/route.ts",
  ]

  for (const route of ROUTES_WITH_CATCH) {
    it(`${route} catch block returns 500, not 400`, () => {
      const src = readFileSync(resolve(__dirname, `../${route}`), "utf-8")
      // The catch block should NOT have: error.message || "..." with status 400
      expect(src).not.toMatch(/error\.message.*status:\s*400/)
    })
  }

  for (const route of ROUTES_WITH_CATCH) {
    it(`${route} does not leak error.message to clients in catch`, () => {
      const src = readFileSync(resolve(__dirname, `../${route}`), "utf-8")
      // Look for the pattern: catch block returning error.message directly
      // The catch blocks should use safe static messages
      const catchBlocks = src.match(/catch\s*\([^)]*\)\s*\{[\s\S]*?\}/g) || []
      for (const block of catchBlocks) {
        if (block.includes("NextResponse.json")) {
          // Should not expose error.message directly in response
          expect(block).not.toMatch(/error:\s*error\.message/)
        }
      }
    })
  }
})

// ─── Dashboard API Response Shape ───────────────────────────────────────────

describe("Dashboard API Response Shape Consistency", () => {
  it("dashboard route returns stats.pendingCommissions for UI compatibility", () => {
    const src = readFileSync(
      resolve(__dirname, "../app/api/affiliate/dashboard/route.ts"),
      "utf-8",
    )
    expect(src).toContain("pendingCommissions")
    expect(src).toContain("paidCommissions")
    expect(src).toContain("totalPaidOut")
  })

  it("dashboard route returns referralLevels array for UI", () => {
    const src = readFileSync(
      resolve(__dirname, "../app/api/affiliate/dashboard/route.ts"),
      "utf-8",
    )
    expect(src).toContain("referralLevels")
  })

  it("default dashboard data includes all expected fields", () => {
    const src = readFileSync(
      resolve(__dirname, "../app/api/affiliate/dashboard/route.ts"),
      "utf-8",
    )
    // All required fields
    expect(src).toContain("referralLink")
    expect(src).toContain("totalClicks")
    expect(src).toContain("pendingCents")
    expect(src).toContain("referralsByLevel")
    expect(src).toContain("recentCommissions")
  })
})

// ─── Input Validation ───────────────────────────────────────────────────────

describe("Pagination Input Validation", () => {
  const PAGINATED_ROUTES = [
    "app/api/affiliate/commissions/route.ts",
    "app/api/affiliate/referrals/route.ts",
  ]

  for (const route of PAGINATED_ROUTES) {
    it(`${route} clamps page to minimum 1`, () => {
      const src = readFileSync(resolve(__dirname, `../${route}`), "utf-8")
      expect(src).toContain("Math.max(1")
    })

    it(`${route} clamps limit to maximum 100`, () => {
      const src = readFileSync(resolve(__dirname, `../${route}`), "utf-8")
      expect(src).toContain("Math.min(100")
    })
  }

  it("analytics route clamps days parameter", () => {
    const src = readFileSync(
      resolve(__dirname, "../app/api/affiliate/analytics/route.ts"),
      "utf-8",
    )
    expect(src).toContain("Math.min(365")
    expect(src).toContain("Math.max(1")
  })
})
