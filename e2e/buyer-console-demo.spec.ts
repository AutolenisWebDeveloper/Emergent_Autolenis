import { test, expect } from "@playwright/test"

/**
 * Buyer Console Auto-Click Demo E2E Tests
 *
 * Verifies:
 * 1) "Your Buyer Console — Every Offer, One Dashboard" section renders on homepage
 * 2) BuyerConsole component renders with dealer cards
 * 3) Manual clicking on dealer cards updates selection (real state change)
 * 4) Component does not throw runtime errors
 *
 * Run: pnpm test:e2e --grep "Buyer Console Demo"
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000"

test.describe("Buyer Console Demo", () => {
  test.use({ viewport: { width: 1280, height: 900 } })
  test.setTimeout(30_000)

  test("section heading renders on homepage", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" })

    const heading = page.locator(
      "text=Your Buyer Console — Every Offer, One Dashboard"
    )
    await expect(heading.first()).toBeVisible({ timeout: 10_000 })
  })

  test("buyer console renders with dealer cards", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" })

    // Scroll to the section to ensure it's in view
    const heading = page.locator(
      "text=Your Buyer Console — Every Offer, One Dashboard"
    )
    await heading.first().scrollIntoViewIfNeeded()

    // All three dealer cards should be present
    await expect(page.locator("text=Dealer A").first()).toBeVisible()
    await expect(page.locator("text=Dealer B").first()).toBeVisible()
  })

  test("manual click on dealer card changes selection", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" })

    const heading = page.locator(
      "text=Your Buyer Console — Every Offer, One Dashboard"
    )
    await heading.first().scrollIntoViewIfNeeded()

    // Wait for cards to appear
    const dealerA = page.locator('[data-dealer-id="a"] [role="button"]')
    await expect(dealerA).toBeVisible({ timeout: 10_000 })

    // Click Dealer A
    await dealerA.click()

    // Dealer A should now have the selected styling (green border)
    await expect(dealerA).toHaveClass(/border-brand-green/, { timeout: 5_000 })

    // Click Dealer B
    const dealerB = page.locator('[data-dealer-id="b"] [role="button"]')
    await dealerB.click()

    // Dealer B should now be selected
    await expect(dealerB).toHaveClass(/border-brand-green/, { timeout: 5_000 })

    // Dealer A should no longer be selected
    await expect(dealerA).not.toHaveClass(/border-brand-green/)
  })

  test("homepage loads without console errors in production path", async ({
    page,
  }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    const response = await page.goto(BASE, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })

    expect(response?.status()).toBeLessThan(500)

    // Scroll through the console section to trigger any lazy rendering
    const heading = page.locator(
      "text=Your Buyer Console — Every Offer, One Dashboard"
    )
    await heading.first().scrollIntoViewIfNeeded()

    // Wait for network to settle after scrolling
    await page.waitForLoadState("networkidle")

    expect(
      errors.length,
      `Runtime errors detected: ${errors.join("; ")}`
    ).toBe(0)
  })
})
