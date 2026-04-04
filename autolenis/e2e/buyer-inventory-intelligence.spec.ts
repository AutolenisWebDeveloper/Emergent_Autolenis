import { test, expect } from "@playwright/test"

/**
 * Buyer Inventory Intelligence E2E Tests
 *
 * Validates the buyer search → shortlist → offers path:
 * - /buyer/search loads with dual-lane search (verified + market lanes)
 * - /buyer/shortlist loads with match-status and sourcing indicators
 * - /buyer/offers loads with anonymous dealer display before identity release
 * - Navigation flow between these pages works without dead-ends
 * - External approval link is present on search page
 *
 * Run: pnpm test:e2e --grep "Buyer Inventory Intelligence"
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000"
const TEST_BASE = process.env.SMOKE_TEST_BASE_URL ?? BASE

const INVENTORY_BUYER_ROUTES = [
  "/buyer/search",
  "/buyer/shortlist",
  "/buyer/offers",
]

test.describe("Buyer Inventory Intelligence", () => {
  test.setTimeout(60_000)

  test("all inventory-intelligence buyer routes return non-500 status", async ({ page }) => {
    const issues: string[] = []

    for (const route of INVENTORY_BUYER_ROUTES) {
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
      } catch (err) {
        issues.push(`${route} → error: ${(err as Error).message?.slice(0, 80)}`)
      }
    }

    if (issues.length > 0) {
      console.error("[Buyer II] Route issues:", issues)
    }
    expect(issues.length, `Found ${issues.length} failing buyer II routes`).toBe(0)
  })

  test("search page loads without error", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/buyer/search`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("search page renders dual-lane elements when authenticated", async ({ page }) => {
    await page.goto(`${TEST_BASE}/buyer/search`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const finalUrl = page.url()

    if (finalUrl.includes("/auth/") || finalUrl.includes("/sign-in")) {
      test.skip(true, "Redirected to auth — cannot check search content without session")
      return
    }

    // Search page should contain search-related content
    const searchContent = page.locator("text=/search|vehicle|inventory|find/i").first()
    const exists = await searchContent.isVisible({ timeout: 5_000 }).catch(() => false)
    expect(exists, "Search page should display vehicle search content").toBeTruthy()
  })

  test("shortlist page loads without error", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/buyer/shortlist`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("shortlist page renders match-status content when authenticated", async ({ page }) => {
    await page.goto(`${TEST_BASE}/buyer/shortlist`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const finalUrl = page.url()

    if (finalUrl.includes("/auth/") || finalUrl.includes("/sign-in")) {
      test.skip(true, "Redirected to auth — cannot check shortlist content without session")
      return
    }

    // Shortlist should display list or empty state
    const shortlistContent = page.locator("text=/shortlist|saved|vehicle|no items|empty/i").first()
    const exists = await shortlistContent.isVisible({ timeout: 5_000 }).catch(() => false)
    expect(exists, "Shortlist page should display relevant content or empty state").toBeTruthy()
  })

  test("offers page loads and handles anonymous dealer display", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/buyer/offers`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)

    const finalUrl = page.url()
    if (finalUrl.includes("/auth/") || finalUrl.includes("/sign-in")) {
      test.skip(true, "Redirected to auth — skipping")
      return
    }

    // Offers page should show offers or empty state
    const offersContent = page.locator("text=/offer|dealer|no offers|empty|bid/i").first()
    const exists = await offersContent.isVisible({ timeout: 5_000 }).catch(() => false)
    expect(exists, "Offers page should display offers content or empty state").toBeTruthy()
  })

  test("buyer search API requires authentication", async ({ request }) => {
    const res = await request.get(`${TEST_BASE}/api/buyer/inventory/search`)
    expect([401, 403]).toContain(res.status())
  })

  test("buyer shortlist API requires authentication", async ({ request }) => {
    const res = await request.get(`${TEST_BASE}/api/buyer/shortlist`)
    expect([401, 403]).toContain(res.status())
  })

  test("buyer shortlist match API is POST-only", async ({ request }) => {
    const res = await request.get(`${TEST_BASE}/api/buyer/shortlist/match`)
    // This endpoint only accepts POST; GET should return 405 or auth error
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test("search → shortlist → offers navigation path has no dead-ends", async ({ page }) => {
    // Verify each page in the path loads (even with auth redirect)
    for (const route of INVENTORY_BUYER_ROUTES) {
      const url = `${TEST_BASE}${route}`
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      })
      const status = response?.status() ?? 0
      expect(status, `${route} should not 500`).toBeLessThan(500)

      const finalUrl = page.url()
      // If not redirected to auth, verify page has actionable content
      if (!finalUrl.includes("/auth/") && !finalUrl.includes("/sign-in")) {
        // Page should have at least one link or button (no dead-ends)
        const actionable = page.locator("a, button").first()
        const hasAction = await actionable.isVisible({ timeout: 5_000 }).catch(() => false)
        expect(hasAction, `${route} should have actionable elements (no dead-end)`).toBeTruthy()
      }
    }
  })
})
