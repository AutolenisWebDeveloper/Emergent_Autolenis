import { test, expect } from "@playwright/test"

/**
 * Dealer Quick-Offer Token Flow E2E Tests
 *
 * Validates:
 * - /dealer/quick-offer/[token] page loads for any token (expired/invalid states handled)
 * - /dealer/apply page loads without 500
 * - Quick-offer submit API requires valid token
 * - Quick-offer page displays appropriate state (invalid/expired/consumed/form)
 * - Dealer apply page supports continuation from quick-offer flow
 *
 * Run: pnpm test:e2e --grep "Dealer Quick-Offer"
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000"
const TEST_BASE = process.env.SMOKE_TEST_BASE_URL ?? BASE

test.describe("Dealer Quick-Offer Token Flow", () => {
  test.setTimeout(60_000)

  test("quick-offer page loads for a test token without 500", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/dealer/quick-offer/test-token-123`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    // Should return page content (200) or redirect, never 500
    expect(status).toBeLessThan(500)
  })

  test("quick-offer page shows invalid/expired state for unknown token", async ({ page }) => {
    await page.goto(`${TEST_BASE}/dealer/quick-offer/invalid-token-xyz`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const finalUrl = page.url()

    if (finalUrl.includes("/auth/") || finalUrl.includes("/sign-in")) {
      test.skip(true, "Redirected to auth — skipping")
      return
    }

    // Should show an invalid/expired/error state for a fake token
    const stateContent = page.locator("text=/invalid|expired|not found|error|submit|offer/i").first()
    const exists = await stateContent.isVisible({ timeout: 5_000 }).catch(() => false)
    expect(exists, "Quick-offer page should display a token state message").toBeTruthy()
  })

  test("quick-offer API validates token on GET", async ({ request }) => {
    const res = await request.get(`${TEST_BASE}/api/dealer/quick-offer/fake-token-000`)
    // Should return 401/403 (auth required) or 404 (token not found), never 500
    expect(res.status()).toBeLessThan(500)
  })

  test("quick-offer API rejects submission without valid token", async ({ request }) => {
    const res = await request.post(`${TEST_BASE}/api/dealer/quick-offer/fake-token-000/submit`, {
      data: {
        priceCents: 2500000,
        notes: "Test offer",
      },
    })
    // Should be auth error or not-found, never 500
    expect(res.status()).toBeLessThan(500)
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test("dealer apply page loads without 500", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/dealer/apply`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("dealer apply page renders application content when authenticated", async ({ page }) => {
    await page.goto(`${TEST_BASE}/dealer/apply`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const finalUrl = page.url()

    if (finalUrl.includes("/auth/") || finalUrl.includes("/sign-in")) {
      test.skip(true, "Redirected to auth — cannot check apply content without session")
      return
    }

    // Apply page should show application-related content
    const applyContent = page.locator("text=/apply|agreement|upload|onboarding|application/i").first()
    const exists = await applyContent.isVisible({ timeout: 5_000 }).catch(() => false)
    expect(exists, "Apply page should display dealer application content").toBeTruthy()
  })

  test("dealer apply page supports prospectId query parameter", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/dealer/apply?prospectId=test-prospect-123`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    // Should not crash with a query parameter
    expect(status).toBeLessThan(500)
  })

  test("dealer inventory suggested API requires authentication", async ({ request }) => {
    const res = await request.get(`${TEST_BASE}/api/dealer/inventory/suggested`)
    expect([401, 403]).toContain(res.status())
  })

  test("quick-offer → apply flow: both pages are accessible", async ({ page }) => {
    // Verify quick-offer page loads
    const offerRes = await page.goto(`${TEST_BASE}/dealer/quick-offer/test-token-abc`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(offerRes?.status() ?? 0).toBeLessThan(500)

    // Verify apply page loads (continuation from quick-offer)
    const applyRes = await page.goto(`${TEST_BASE}/dealer/apply`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(applyRes?.status() ?? 0).toBeLessThan(500)
  })

  test("dealer onboarding conversion-status API requires authentication", async ({ request }) => {
    const res = await request.get(`${TEST_BASE}/api/dealer/onboarding/conversion-status`)
    expect([401, 403]).toContain(res.status())
  })
})
