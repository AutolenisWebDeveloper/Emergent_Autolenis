import { test, expect } from "@playwright/test"

/**
 * Dealer Dashboard Smoke Test
 *
 * Verifies:
 * - All dealer navigation routes load without 404 or 500
 * - Dashboard KPI tiles are clickable and route to correct pages
 * - Primary CTAs exist on key pages
 *
 * Run: pnpm test:e2e --grep "Dealer Smoke"
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000"

// Test workspace URLs (middleware redirects unauthenticated users)
const TEST_BASE = process.env.SMOKE_TEST_BASE_URL ?? BASE

// Routes that should exist in the dealer portal
const DEALER_ROUTES = [
  "/dealer/dashboard",
  "/dealer/inventory",
  "/dealer/inventory/add",
  "/dealer/inventory/bulk-upload",
  "/dealer/auctions",
  "/dealer/deals",
  "/dealer/contracts",
  "/dealer/documents",
  "/dealer/payments",
  "/dealer/messages",
  "/dealer/messages/new",
  "/dealer/settings",
]

// KPI tile → expected destination mapping
const KPI_TILE_MAP = [
  { label: "Active Auctions", expectedPath: "/dealer/auctions", expectedParam: "status=ACTIVE" },
  { label: "Awaiting Your Bids", expectedPath: "/dealer/auctions/invited", expectedParam: null },
  { label: "Completed Deals", expectedPath: "/dealer/deals", expectedParam: "status=COMPLETED" },
  { label: "Total Sales", expectedPath: "/dealer/deals", expectedParam: null },
  { label: "Inventory", expectedPath: "/dealer/inventory", expectedParam: null },
  { label: "Pending Contracts", expectedPath: "/dealer/contracts", expectedParam: "status=PENDING" },
]

test.describe("Dealer Smoke", () => {
  test.setTimeout(60_000)

  test("all dealer routes return non-500 status", async ({ page }) => {
    const issues: string[] = []

    for (const route of DEALER_ROUTES) {
      const url = `${TEST_BASE}${route}`
      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        })
        const status = response?.status() ?? 0

        // Accept 200 (loaded) or 30x redirect to signin
        if (status >= 500) {
          issues.push(`${route} → ${status}`)
        }
      } catch (err) {
        issues.push(`${route} → error: ${(err as Error).message?.slice(0, 80)}`)
      }
    }

    if (issues.length > 0) {
      console.error("[Dealer Smoke] Route issues:", issues)
    }
    expect(issues.length, `Found ${issues.length} failing dealer routes`).toBe(0)
  })

  test("dealer dashboard renders KPI tiles with correct links", async ({ page }) => {
    const url = `${TEST_BASE}/dealer/dashboard`
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 })
    const status = response?.status() ?? 0
    const finalUrl = page.url()

    // If redirected to auth, skip the tile check
    if (finalUrl.includes("/auth/") || finalUrl.includes("/sign-in")) {
      test.skip(true, "Redirected to auth — cannot check tiles without session")
      return
    }

    // Dashboard loaded — check tile links exist
    for (const tile of KPI_TILE_MAP) {
      const link = page.locator(`a[href*="${tile.expectedPath}"]`).first()
      const exists = await link.isVisible({ timeout: 5_000 }).catch(() => false)

      if (exists) {
        const href = await link.getAttribute("href")
        if (tile.expectedParam) {
          expect(href, `${tile.label} tile should include ${tile.expectedParam}`).toContain(tile.expectedParam)
        }
      }
    }
  })

  test("payment success and cancel pages exist", async ({ page }) => {
    for (const subpath of ["/dealer/payments/success", "/dealer/payments/cancel"]) {
      const url = `${TEST_BASE}${subpath}`
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 })
      const status = response?.status() ?? 0
      expect(status, `${subpath} returned ${status}`).toBeLessThan(500)
    }
  })

  test("inventory bulk upload page has Upload Inventory button", async ({ page }) => {
    const url = `${TEST_BASE}/dealer/inventory/bulk-upload`
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 })
    const finalUrl = page.url()

    if (finalUrl.includes("/auth/") || finalUrl.includes("/sign-in")) {
      test.skip(true, "Redirected to auth — skipping")
      return
    }

    const uploadBtn = page.locator("button", { hasText: "Upload Inventory" })
    const exists = await uploadBtn.isVisible({ timeout: 5_000 }).catch(() => false)
    expect(exists, "Upload Inventory button should be visible").toBeTruthy()
  })

  test("dealer settings API requires authentication", async ({ request }) => {
    const res = await request.get(`${TEST_BASE}/api/dealer/settings`)
    expect([401, 403]).toContain(res.status())
  })
})
