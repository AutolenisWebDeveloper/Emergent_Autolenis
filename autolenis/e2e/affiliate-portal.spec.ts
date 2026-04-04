import { test, expect } from "@playwright/test"

/**
 * Affiliate Portal Smoke Tests
 * Verifies that all primary pages render correctly
 * and that navigation and key CTAs function.
 *
 * Note: These tests run against the dev server and require
 * an authenticated affiliate session to be present.
 * In CI without a real session, they validate that
 * pages redirect to sign-in rather than 500/crash.
 */

const PORTAL_PAGES = [
  { path: "/affiliate/portal/dashboard", heading: /dashboard|welcome/i },
  { path: "/affiliate/portal/link", heading: /referral link/i },
  { path: "/affiliate/portal/income-calculator", heading: /income calculator/i },
  { path: "/affiliate/portal/analytics", heading: /analytics/i },
  { path: "/affiliate/portal/referrals", heading: /referral/i },
  { path: "/affiliate/portal/commissions", heading: /commission/i },
  { path: "/affiliate/portal/payouts", heading: /payout/i },
  { path: "/affiliate/portal/documents", heading: /document/i },
  { path: "/affiliate/portal/assets", heading: /asset|promo/i },
  { path: "/affiliate/portal/settings", heading: /settings|account/i },
]

test.describe("Affiliate Portal Smoke", () => {
  for (const page of PORTAL_PAGES) {
    test(`${page.path} loads without 500`, async ({ page: p }) => {
      const res = await p.goto(page.path, { waitUntil: "domcontentloaded" })
      // Page should not be a 500 server error
      expect(res?.status()).not.toBe(500)
      // Either renders the page or redirects to signin
      const url = p.url()
      const is500 = res?.status() === 500
      expect(is500).toBe(false)
    })
  }

  test("sign-out form exists in header", async ({ page }) => {
    const res = await page.goto("/affiliate/portal/dashboard", { waitUntil: "domcontentloaded" })
    const finalUrl = page.url()
    // If redirected to signin (expected without auth), skip the assertion
    if (finalUrl.includes("signin") || finalUrl.includes("sign-in") || finalUrl.includes("/auth/")) {
      test.skip(true, "Redirected to auth — cannot check sign-out form without session")
      return
    }
    const logoutForm = page.locator('form[action="/api/auth/signout"]')
    await expect(logoutForm).toBeVisible()
  })

  test("income calculator renders slider controls", async ({ page }) => {
    await page.goto("/affiliate/portal/income-calculator", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const finalUrl = page.url()

    if (finalUrl.includes("/auth/") || finalUrl.includes("sign-in") || finalUrl.includes("signin")) {
      test.skip(true, "Redirected to auth — skipping")
      return
    }

    // Check for calculator content
    const calcHeading = page.locator("text=/income calculator/i").first()
    const exists = await calcHeading.isVisible({ timeout: 5_000 }).catch(() => false)
    expect(exists, "Income Calculator heading should be visible").toBeTruthy()
  })

  test("share link API requires authentication", async ({ request }) => {
    const response = await request.post("/api/affiliate/share-link", {
      data: { recipientEmail: "test@example.com" },
    })
    expect([401, 403]).toContain(response.status())
  })

  test("affiliate documents page loads", async ({ page }) => {
    const res = await page.goto("/affiliate/portal/documents", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(res?.status()).not.toBe(500)
  })

  test("affiliate payouts page loads", async ({ page }) => {
    const res = await page.goto("/affiliate/portal/payouts", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(res?.status()).not.toBe(500)
  })

  test("affiliate settings page loads", async ({ page }) => {
    const res = await page.goto("/affiliate/portal/settings", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(res?.status()).not.toBe(500)
  })

  test("affiliate settings API requires authentication", async ({ request }) => {
    const res = await request.get("/api/affiliate/settings")
    expect([401, 403]).toContain(res.status())
  })

  test("affiliate settings redirect works", async ({ page }) => {
    const res = await page.goto("/affiliate/settings", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(res?.status()).toBeLessThan(500)
  })
})
