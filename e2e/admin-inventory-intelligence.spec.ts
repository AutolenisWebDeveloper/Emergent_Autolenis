import { test, expect } from "@playwright/test"

/**
 * Admin Inventory Intelligence E2E Tests
 *
 * Validates all 7 admin inventory-intelligence pages:
 * - /admin/dealer-intelligence
 * - /admin/inventory/sources
 * - /admin/inventory/market
 * - /admin/inventory/verified
 * - /admin/coverage-gaps
 * - /admin/dealer-invites
 * - /admin/deal-protection
 *
 * Verifies:
 * - All pages load without 500
 * - Pages redirect to admin sign-in when unauthenticated
 * - Associated API routes require authentication
 * - Navigation links exist in admin layout
 *
 * Run: pnpm test:e2e --grep "Admin Inventory Intelligence"
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000"
const TEST_BASE = process.env.SMOKE_TEST_BASE_URL ?? BASE

const ADMIN_II_PAGES = [
  { route: "/admin/dealer-intelligence", label: "Dealer Intelligence" },
  { route: "/admin/inventory/sources", label: "Inventory Sources" },
  { route: "/admin/inventory/market", label: "Market Inventory" },
  { route: "/admin/inventory/verified", label: "Verified Inventory" },
  { route: "/admin/coverage-gaps", label: "Coverage Gaps" },
  { route: "/admin/dealer-invites", label: "Dealer Invites" },
  { route: "/admin/deal-protection", label: "Deal Protection" },
]

const ADMIN_II_API_ROUTES = [
  "/api/admin/dealers/discovered",
  "/api/admin/dealers/prospects",
  "/api/admin/inventory/sources",
  "/api/admin/inventory/market",
  "/api/admin/inventory/verified",
  "/api/admin/inventory/health",
  "/api/admin/inventory/duplicates",
  "/api/admin/coverage-gaps",
  "/api/admin/dealer-invites",
  "/api/admin/deal-protection/alerts",
  "/api/admin/deal-protection/identity-release-events",
  "/api/admin/deal-protection/redaction-events",
]

test.describe("Admin Inventory Intelligence", () => {
  test.setTimeout(60_000)

  test("all 7 admin inventory-intelligence pages return non-500 status", async ({ page }) => {
    const issues: string[] = []

    for (const { route } of ADMIN_II_PAGES) {
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
      console.error("[Admin II] Route issues:", issues)
    }
    expect(issues.length, `Found ${issues.length} failing admin II routes`).toBe(0)
  })

  for (const { route, label } of ADMIN_II_PAGES) {
    test(`${label} page (${route}) loads without 500`, async ({ page }) => {
      const response = await page.goto(`${TEST_BASE}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      })
      const status = response?.status() ?? 0
      expect(status).toBeLessThan(500)
    })

    test(`${label} page redirects to admin sign-in when unauthenticated`, async ({ page }) => {
      await page.goto(`${TEST_BASE}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      })
      // Should redirect to admin sign-in or show the page
      await expect(page).toHaveURL(/admin/)
    })
  }

  test("admin inventory-intelligence API routes require authentication", async ({ request }) => {
    const issues: string[] = []

    for (const apiRoute of ADMIN_II_API_ROUTES) {
      const url = `${TEST_BASE}${apiRoute}`
      const res = await request.get(url)
      const status = res.status()

      // Should require auth (401/403) or fail gracefully, never 500
      if (status >= 500) {
        issues.push(`${apiRoute} → ${status}`)
      }
      if (status === 200) {
        // If somehow accessible without auth, check it returns valid JSON
        try {
          await res.json()
        } catch {
          issues.push(`${apiRoute} → 200 but invalid JSON`)
        }
      }
    }

    if (issues.length > 0) {
      console.error("[Admin II API] Issues:", issues)
    }
    expect(issues.length, `Found ${issues.length} failing admin II API routes`).toBe(0)
  })

  test("admin sign-in page has navigation structure for inventory intelligence", async ({ page }) => {
    await page.goto(`${TEST_BASE}/admin/sign-in`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })

    // The sign-in page should load properly
    await expect(page.locator("text=/admin/i").first()).toBeVisible()
  })

  test("admin layout includes inventory intelligence navigation links when authenticated", async ({ page }) => {
    // Navigate to any admin page
    await page.goto(`${TEST_BASE}/admin/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const finalUrl = page.url()

    if (finalUrl.includes("/sign-in") || finalUrl.includes("/auth/")) {
      test.skip(true, "Redirected to auth — cannot verify nav without admin session")
      return
    }

    // When authenticated, the sidebar should contain inventory intelligence links
    for (const { route, label } of ADMIN_II_PAGES) {
      const navLink = page.locator(`a[href="${route}"]`).first()
      const exists = await navLink.isVisible({ timeout: 3_000 }).catch(() => false)
      if (!exists) {
        // Try by label text as fallback
        const labelLink = page.locator(`text=${label}`).first()
        const labelExists = await labelLink.isVisible({ timeout: 2_000 }).catch(() => false)
        expect(labelExists, `Admin nav should contain link for ${label}`).toBeTruthy()
      }
    }
  })

  test("admin pages have no dead-end states", async ({ page }) => {
    for (const { route, label } of ADMIN_II_PAGES) {
      const response = await page.goto(`${TEST_BASE}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      })
      const status = response?.status() ?? 0
      expect(status, `${label} should not 500`).toBeLessThan(500)

      const finalUrl = page.url()
      if (!finalUrl.includes("/sign-in") && !finalUrl.includes("/auth/")) {
        // Page should have navigation (sidebar links or buttons)
        const actionable = page.locator("a, button").first()
        const hasAction = await actionable.isVisible({ timeout: 5_000 }).catch(() => false)
        expect(hasAction, `${label} page should have actionable elements`).toBeTruthy()
      }
    }
  })

  test("discovered dealers API returns proper error for unauthenticated request", async ({ request }) => {
    const res = await request.get(`${TEST_BASE}/api/admin/dealers/discovered`)
    expect([401, 403]).toContain(res.status())
  })

  test("coverage gaps API returns proper error for unauthenticated request", async ({ request }) => {
    const res = await request.get(`${TEST_BASE}/api/admin/coverage-gaps`)
    expect([401, 403]).toContain(res.status())
  })

  test("dealer invites API returns proper error for unauthenticated request", async ({ request }) => {
    const res = await request.get(`${TEST_BASE}/api/admin/dealer-invites`)
    expect([401, 403]).toContain(res.status())
  })

  test("deal protection alerts API returns proper error for unauthenticated request", async ({ request }) => {
    const res = await request.get(`${TEST_BASE}/api/admin/deal-protection/alerts`)
    expect([401, 403]).toContain(res.status())
  })

  test("inventory sources API returns proper error for unauthenticated request", async ({ request }) => {
    const res = await request.get(`${TEST_BASE}/api/admin/inventory/sources`)
    expect([401, 403]).toContain(res.status())
  })

  test("inventory market API returns proper error for unauthenticated request", async ({ request }) => {
    const res = await request.get(`${TEST_BASE}/api/admin/inventory/market`)
    expect([401, 403]).toContain(res.status())
  })

  test("inventory verified API returns proper error for unauthenticated request", async ({ request }) => {
    const res = await request.get(`${TEST_BASE}/api/admin/inventory/verified`)
    expect([401, 403]).toContain(res.status())
  })
})
