import { test, expect } from "@playwright/test"

/**
 * Buyer Dashboard Smoke Tests
 *
 * Verifies:
 * - All buyer routes load without 500
 * - Prequal page renders status or onboarding CTA
 * - Auctions/Offers page loads
 * - Settings page has password change and MFA sections
 *
 * Run: pnpm test:e2e --grep "Buyer Smoke"
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000"
const TEST_BASE = process.env.SMOKE_TEST_BASE_URL ?? BASE

const BUYER_ROUTES = [
  "/buyer/dashboard",
  "/buyer/documents",
  "/buyer/prequal",
  "/buyer/auction",
  "/buyer/offers",
  "/buyer/settings",
  "/buyer/search",
  "/buyer/shortlist",
  "/buyer/payments",
]

test.describe("Buyer Smoke", () => {
  test.setTimeout(60_000)

  test("all buyer routes return non-500 status", async ({ page }) => {
    const issues: string[] = []

    for (const route of BUYER_ROUTES) {
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
      console.error("[Buyer Smoke] Route issues:", issues)
    }
    expect(issues.length, `Found ${issues.length} failing buyer routes`).toBe(0)
  })

  test("prequal page renders correctly", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/buyer/prequal`, {
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

    // Page should contain pre-qualification related content
    const prequalContent = page.locator("text=/pre-qual|financing|approval|onboarding/i").first()
    const exists = await prequalContent.isVisible({ timeout: 5_000 }).catch(() => false)
    expect(exists, "Prequal page should display relevant content").toBeTruthy()
  })

  test("prequal draft API accepts GET and PUT", async ({ request }) => {
    // Test draft endpoint exists (will return 401 without auth, which is expected)
    const getResponse = await request.get(`${TEST_BASE}/api/buyer/prequal/draft`)
    expect([200, 401, 403]).toContain(getResponse.status())

    const putResponse = await request.put(`${TEST_BASE}/api/buyer/prequal/draft`, {
      data: { firstName: "Test", lastName: "User" },
    })
    expect([200, 401, 403]).toContain(putResponse.status())
  })

  test("auctions page loads without error", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/buyer/auction`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("offers page loads without error", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/buyer/offers`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("settings page has password change section", async ({ page }) => {
    await page.goto(`${TEST_BASE}/buyer/settings`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const finalUrl = page.url()
    if (finalUrl.includes("/auth/") || finalUrl.includes("/sign-in")) {
      test.skip(true, "Redirected to auth — skipping")
      return
    }

    // Look for password-related content
    const passwordSection = page.locator("text=/change password|password/i").first()
    const exists = await passwordSection.isVisible({ timeout: 5_000 }).catch(() => false)
    expect(exists, "Settings should have password change section").toBeTruthy()
  })

  test("settings page has MFA section", async ({ page }) => {
    await page.goto(`${TEST_BASE}/buyer/settings`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const finalUrl = page.url()
    if (finalUrl.includes("/auth/") || finalUrl.includes("/sign-in")) {
      test.skip(true, "Redirected to auth — skipping")
      return
    }

    // Look for MFA/2FA-related content
    const mfaSection = page.locator("text=/two-factor|2fa|mfa|authenticat/i").first()
    const exists = await mfaSection.isVisible({ timeout: 5_000 }).catch(() => false)
    expect(exists, "Settings should have MFA section").toBeTruthy()
  })

  test("change password API validates input", async ({ request }) => {
    const response = await request.post(`${TEST_BASE}/api/auth/change-password`, {
      data: { currentPassword: "", newPassword: "" },
    })
    // Should reject with 400 or 401 (missing fields or unauthorized)
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test("MFA enroll API requires authentication", async ({ request }) => {
    const response = await request.post(`${TEST_BASE}/api/auth/mfa/enroll`)
    expect([401, 403]).toContain(response.status())
  })
})
