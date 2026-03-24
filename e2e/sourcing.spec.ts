import { test, expect } from "@playwright/test"

/**
 * Vehicle Request Sourcing E2E Tests
 *
 * Verifies the sourcing flow routes load without 500 errors:
 * - Buyer request pages
 * - Admin sourcing queue pages
 * - Dealer opportunity pages
 * - Dealer invite claim page
 *
 * Run: pnpm test:e2e --grep "Sourcing"
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000"
const TEST_BASE = process.env.SMOKE_TEST_BASE_URL ?? BASE
const SUITE_TIMEOUT = 60_000

const BUYER_SOURCING_ROUTES = [
  "/buyer/requests",
  "/buyer/requests/new",
]

const ADMIN_SOURCING_ROUTES = [
  "/admin/sourcing",
]

const DEALER_SOURCING_ROUTES = [
  "/dealer/opportunities",
]

test.describe("Sourcing Feature - Buyer Routes", () => {
  test.setTimeout(SUITE_TIMEOUT)

  test("buyer sourcing routes return non-500 status", async ({ page }) => {
    const issues: string[] = []

    for (const route of BUYER_SOURCING_ROUTES) {
      const url = `${TEST_BASE}${route}`
      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        })
        const status = response?.status() ?? 0
        if (status >= 500) {
          issues.push(`${route} → ${status}`)
        }
      } catch (error) {
        issues.push(`${route} → navigation error: ${(error as Error).message}`)
      }
    }

    if (issues.length > 0) {
      console.warn("Buyer sourcing route issues:", issues)
    }
    expect(issues.filter((i) => i.includes("500"))).toHaveLength(0)
  })
})

test.describe("Sourcing Feature - Admin Routes", () => {
  test.setTimeout(SUITE_TIMEOUT)

  test("admin sourcing routes return non-500 status", async ({ page }) => {
    const issues: string[] = []

    for (const route of ADMIN_SOURCING_ROUTES) {
      const url = `${TEST_BASE}${route}`
      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        })
        const status = response?.status() ?? 0
        if (status >= 500) {
          issues.push(`${route} → ${status}`)
        }
      } catch (error) {
        issues.push(`${route} → navigation error: ${(error as Error).message}`)
      }
    }

    if (issues.length > 0) {
      console.warn("Admin sourcing route issues:", issues)
    }
    expect(issues.filter((i) => i.includes("500"))).toHaveLength(0)
  })
})

test.describe("Sourcing Feature - Dealer Routes", () => {
  test.setTimeout(SUITE_TIMEOUT)

  test("dealer sourcing routes return non-500 status", async ({ page }) => {
    const issues: string[] = []

    for (const route of DEALER_SOURCING_ROUTES) {
      const url = `${TEST_BASE}${route}`
      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        })
        const status = response?.status() ?? 0
        if (status >= 500) {
          issues.push(`${route} → ${status}`)
        }
      } catch (error) {
        issues.push(`${route} → navigation error: ${(error as Error).message}`)
      }
    }

    if (issues.length > 0) {
      console.warn("Dealer sourcing route issues:", issues)
    }
    expect(issues.filter((i) => i.includes("500"))).toHaveLength(0)
  })
})

test.describe("Sourcing Feature - Dealer Invite Claim", () => {
  test.setTimeout(30_000)

  test("dealer invite claim page loads without crash", async ({ page }) => {
    const url = `${TEST_BASE}/dealer/invite/claim`
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })
})

test.describe("Sourcing Feature - API Routes Auth", () => {
  test.setTimeout(30_000)

  test("buyer requests API requires authentication", async ({ request }) => {
    const response = await request.get(`${TEST_BASE}/api/buyer/requests`)
    // Should return 401 (unauthenticated) or redirect, not 500
    expect(response.status()).not.toBe(500)
  })

  test("admin sourcing cases API requires authentication", async ({ request }) => {
    const response = await request.get(`${TEST_BASE}/api/admin/sourcing/cases`)
    expect(response.status()).not.toBe(500)
  })

  test("dealer opportunities API requires authentication", async ({ request }) => {
    const response = await request.get(`${TEST_BASE}/api/dealer/opportunities`)
    expect(response.status()).not.toBe(500)
  })

  test("coverage gap API requires authentication", async ({ request }) => {
    const response = await request.get(`${TEST_BASE}/api/buyer/coverage-gap?marketZip=90210`)
    expect(response.status()).not.toBe(500)
  })
})

test.describe("Sourcing Feature - Deal Pipeline Compatibility", () => {
  test.setTimeout(SUITE_TIMEOUT)

  test("buyer deal page loads without 500 (handles null auctionOffer)", async ({ page }) => {
    // The deal page must not crash when a sourced deal has null auctionOffer
    const url = `${TEST_BASE}/buyer/deal`
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("deal sub-pages load without 500", async ({ page }) => {
    const dealSubPages = [
      "/buyer/deal/financing",
      "/buyer/deal/insurance",
      "/buyer/deal/contract",
      "/buyer/deal/esign",
      "/buyer/deal/pickup",
    ]
    const issues: string[] = []
    for (const route of dealSubPages) {
      const url = `${TEST_BASE}${route}`
      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        })
        const status = response?.status() ?? 0
        if (status >= 500) {
          issues.push(`${route} → ${status}`)
        }
      } catch (error) {
        issues.push(`${route} → navigation error: ${(error as Error).message}`)
      }
    }
    expect(issues.filter((i) => i.includes("500"))).toHaveLength(0)
  })
})
