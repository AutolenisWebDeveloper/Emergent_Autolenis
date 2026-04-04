import { describe, expect, it } from "vitest"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

// ─── P0: Onboarding API Route Existence & Shape ─────────────────────────────
// The onboarding page POSTs to /api/affiliate/onboarding, which previously
// did not exist, causing a broken onboarding flow.
// ─────────────────────────────────────────────────────────────────────────────

describe("Onboarding API Route", () => {
  const ROUTE_PATH = "app/api/affiliate/onboarding/route.ts"

  it("route file exists", () => {
    expect(existsSync(resolve(__dirname, `../${ROUTE_PATH}`))).toBe(true)
  })

  it("exports a POST handler", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    expect(src).toContain("export async function POST")
  })

  it("checks authentication (returns 401 for unauthenticated users)", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    expect(src).toContain("401")
  })

  it("checks affiliate role (returns 403 for wrong role)", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    expect(src).toContain("isAffiliateRole")
    expect(src).toContain("403")
  })

  it("validates required fields: firstName, lastName, phone", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    expect(src).toContain("firstName")
    expect(src).toContain("lastName")
    expect(src).toContain("phone")
    expect(src).toContain("400")
  })

  it("uses affiliateService.createAffiliate for affiliate creation", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    expect(src).toContain("affiliateService.createAffiliate")
  })

  it("returns { success: true, data: { referralCode, referralLink } } on success", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    expect(src).toContain("success: true")
    expect(src).toContain("referralCode")
    expect(src).toContain("referralLink")
  })

  it("response shape matches what onboarding page expects (data.referralCode, data.referralLink)", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    // Page expects: data.data.referralCode and data.data.referralLink
    expect(src).toMatch(/data:\s*\{[\s\S]*referralCode/)
    expect(src).toMatch(/data:\s*\{[\s\S]*referralLink/)
  })

  it("has rate limiting", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    expect(src).toContain("rateLimit")
  })

  it("does not leak error.message in catch block", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    const catchBlocks = src.match(/catch\s*\([^)]*\)\s*\{[\s\S]*?\}/g) || []
    for (const block of catchBlocks) {
      if (block.includes("NextResponse.json")) {
        expect(block).not.toMatch(/error:\s*error\.message/)
      }
    }
  })

  it("catch block returns 500, not 400", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    expect(src).not.toMatch(/error\.message.*status:\s*400/)
  })

  it("onboarding page fetches the correct endpoint", () => {
    const pageSrc = readFileSync(
      resolve(__dirname, "../app/affiliate/portal/onboarding/page.tsx"),
      "utf-8",
    )
    expect(pageSrc).toContain('"/api/affiliate/onboarding"')
  })
})

// ─── P0: Referrals Route RBAC ───────────────────────────────────────────────
// The referrals API route was missing an affiliate role check, allowing any
// authenticated user to query referral data.
// ─────────────────────────────────────────────────────────────────────────────

describe("Referrals API Route RBAC", () => {
  const ROUTE_PATH = "app/api/affiliate/referrals/route.ts"

  it("checks affiliate role via isUserAffiliate or inline AFFILIATE check", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    const usesSharedCheck = src.includes("isUserAffiliate")
    const usesInlineCheck = src.includes("AFFILIATE") && src.includes("is_affiliate")
    expect(usesSharedCheck || usesInlineCheck).toBe(true)
  })

  it("returns 403 for non-affiliate users", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    expect(src).toContain("403")
  })

  it("returns 401 for unauthenticated users", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    expect(src).toContain("401")
  })

  it("role check occurs before any DB query", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    const roleCheckPos = src.indexOf("isUserAffiliate")
    const dbQueryPos = src.indexOf('from("Affiliate")')
    expect(roleCheckPos).toBeGreaterThan(-1)
    expect(dbQueryPos).toBeGreaterThan(-1)
    expect(roleCheckPos).toBeLessThan(dbQueryPos)
  })
})

// ─── P0: Payouts Route RBAC ────────────────────────────────────────────────
// The payouts API route was missing an affiliate role check on both GET and POST.
// ─────────────────────────────────────────────────────────────────────────────

describe("Payouts API Route RBAC", () => {
  const ROUTE_PATH = "app/api/affiliate/payouts/route.ts"

  it("checks affiliate role via isUserAffiliate or inline AFFILIATE check", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    const usesSharedCheck = src.includes("isUserAffiliate")
    const usesInlineCheck = src.includes("AFFILIATE") && src.includes("is_affiliate")
    expect(usesSharedCheck || usesInlineCheck).toBe(true)
  })

  it("returns 403 for non-affiliate users", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    expect(src).toContain("403")
  })

  it("returns 401 for unauthenticated users", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    expect(src).toContain("401")
  })

  it("GET handler has role check before DB access", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    // The GET handler should check role before touching DB
    const getHandler = src.substring(src.indexOf("export async function GET"))
    const roleCheckPos = getHandler.indexOf("isUserAffiliate")
    const dbQueryPos = getHandler.indexOf('from("Affiliate")')
    expect(roleCheckPos).toBeGreaterThan(-1)
    expect(dbQueryPos).toBeGreaterThan(-1)
    expect(roleCheckPos).toBeLessThan(dbQueryPos)
  })

  it("POST handler has role check before DB access", () => {
    const src = readFileSync(resolve(__dirname, `../${ROUTE_PATH}`), "utf-8")
    // The POST handler should check role before touching DB
    const postHandler = src.substring(src.indexOf("export async function POST"))
    const roleCheckPos = postHandler.indexOf("isUserAffiliate")
    const dbQueryPos = postHandler.indexOf('from("Affiliate")')
    expect(roleCheckPos).toBeGreaterThan(-1)
    expect(dbQueryPos).toBeGreaterThan(-1)
    expect(roleCheckPos).toBeLessThan(dbQueryPos)
  })
})

// ─── P2: Income Calculator in Sidebar Nav ───────────────────────────────────
// The income-calculator page existed but was unreachable from the sidebar.
// ─────────────────────────────────────────────────────────────────────────────

describe("Income Calculator Sidebar Reachability", () => {
  it("income-calculator page exists", () => {
    expect(
      existsSync(resolve(__dirname, "../app/affiliate/portal/income-calculator/page.tsx")),
    ).toBe(true)
  })

  it("income-calculator route is in the sidebar nav config", () => {
    const layoutSrc = readFileSync(
      resolve(__dirname, "../app/affiliate/portal/layout.tsx"),
      "utf-8",
    )
    expect(layoutSrc).toContain("/affiliate/portal/income-calculator")
  })

  it("income-calculator is in the Earnings section", () => {
    const layoutSrc = readFileSync(
      resolve(__dirname, "../app/affiliate/portal/layout.tsx"),
      "utf-8",
    )
    // The income-calculator link should appear after the Earnings label
    const earningsPos = layoutSrc.indexOf('"Earnings"')
    const incomeCalcPos = layoutSrc.indexOf("/affiliate/portal/income-calculator")
    expect(earningsPos).toBeGreaterThan(-1)
    expect(incomeCalcPos).toBeGreaterThan(earningsPos)
  })

  it("Calculator icon is imported in layout-client", () => {
    const clientSrc = readFileSync(
      resolve(__dirname, "../app/affiliate/portal/layout-client.tsx"),
      "utf-8",
    )
    expect(clientSrc).toContain("Calculator")
  })

  it("Calculator icon is in the iconMap", () => {
    const clientSrc = readFileSync(
      resolve(__dirname, "../app/affiliate/portal/layout-client.tsx"),
      "utf-8",
    )
    // Should be in the iconMap object
    const iconMapBlock = clientSrc.substring(
      clientSrc.indexOf("const iconMap"),
      clientSrc.indexOf("}", clientSrc.indexOf("const iconMap")) + 1,
    )
    expect(iconMapBlock).toContain("Calculator")
  })
})

// ─── All Affiliate API Routes Now Have Role Checks ──────────────────────────
// Comprehensive check that every sensitive affiliate API route enforces role.
// ─────────────────────────────────────────────────────────────────────────────

describe("Comprehensive Affiliate API RBAC Coverage", () => {
  const ALL_SENSITIVE_ROUTES = [
    "app/api/affiliate/dashboard/route.ts",
    "app/api/affiliate/commissions/route.ts",
    "app/api/affiliate/analytics/route.ts",
    "app/api/affiliate/settings/route.ts",
    "app/api/affiliate/documents/route.ts",
    "app/api/affiliate/share-link/route.ts",
    "app/api/affiliate/referrals/route.ts",
    "app/api/affiliate/payouts/route.ts",
    "app/api/affiliate/onboarding/route.ts",
  ]

  for (const route of ALL_SENSITIVE_ROUTES) {
    it(`${route} enforces affiliate role check`, () => {
      const src = readFileSync(resolve(__dirname, `../${route}`), "utf-8")
      const usesIsAffiliateRole = src.includes("isAffiliateRole")
      const usesIsUserAffiliate = src.includes("isUserAffiliate")
      const usesInlineCheck = src.includes("AFFILIATE") && src.includes("is_affiliate")
      expect(usesIsAffiliateRole || usesIsUserAffiliate || usesInlineCheck).toBe(true)
    })

    it(`${route} returns 401 for unauthenticated`, () => {
      const src = readFileSync(resolve(__dirname, `../${route}`), "utf-8")
      expect(src).toContain("401")
    })
  }
})

// ─── All Portal Routes in Sidebar Nav ───────────────────────────────────────

describe("All Portal Routes Reachable from Sidebar", () => {
  const EXPECTED_SIDEBAR_ROUTES = [
    "/affiliate/portal/dashboard",
    "/affiliate/portal/link",
    "/affiliate/portal/analytics",
    "/affiliate/portal/referrals",
    "/affiliate/portal/referrals/buyers",
    "/affiliate/portal/referrals/affiliates",
    "/affiliate/portal/commissions",
    "/affiliate/portal/payouts",
    "/affiliate/portal/income-calculator",
    "/affiliate/portal/assets",
    "/affiliate/portal/documents",
    "/affiliate/portal/settings",
  ]

  const layoutSrc = readFileSync(
    resolve(__dirname, "../app/affiliate/portal/layout.tsx"),
    "utf-8",
  )

  for (const route of EXPECTED_SIDEBAR_ROUTES) {
    it(`sidebar contains link to ${route}`, () => {
      expect(layoutSrc).toContain(route)
    })
  }
})
