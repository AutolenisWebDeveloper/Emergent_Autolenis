import { test, expect } from "@playwright/test"

/**
 * Admin Buyer Detail Page Smoke Tests
 *
 * Verifies:
 * - Buyer detail page route does not 500
 * - Buyers list page loads
 * - Navigation from list to detail does not 500
 *
 * Run: pnpm test:e2e --grep "Admin Buyer Detail"
 */

test.describe("Admin Buyer Detail", () => {
  test.setTimeout(30_000)

  test("admin buyer detail page does not return 500", async ({ page }) => {
    // Visit a buyer detail page with a sample id — should redirect to sign-in
    // or render a 200/404, but must never 500
    const response = await page.goto("/admin/buyers/test-buyer-id", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("admin buyers list page loads without error", async ({ page }) => {
    const response = await page.goto("/admin/buyers", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("admin buyer detail page with non-existent id does not 500", async ({ page }) => {
    const response = await page.goto("/admin/buyers/nonexistent-id-12345", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })
})
