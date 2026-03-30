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

/**
 * Helper: scroll to the buyer-console heading via JS evaluation.
 *
 * The heading lives inside a Framer Motion `SlideIn` wrapper that starts at
 * `opacity: 0` with a `whileInView` trigger.  Playwright's built-in
 * `scrollIntoViewIfNeeded()` refuses to act on an element it considers "not
 * visible", creating a deadlock: the element can't become visible until it
 * enters the viewport, but Playwright won't scroll to it until it's visible.
 *
 * Using `evaluate` bypasses the visibility gate and lets the browser's native
 * `scrollIntoView` bring the element into the viewport, which fires the
 * IntersectionObserver and triggers the entrance animation.
 */
async function scrollToHeading(page: import("@playwright/test").Page) {
  // Target the <h2> specifically — the same text also appears in a mobile-only
  // <p> that is display:none at the test viewport (1280×900 → lg breakpoint).
  // Using a generic text locator causes .first() to pick the hidden <p>,
  // which can never become visible and times out.
  const heading = page.locator(
    "h2:has-text('Your Buyer Console — Every Offer, One Dashboard')"
  )
  // Wait for the element to be attached to the DOM (even if opacity: 0)
  await heading.first().waitFor({ state: "attached", timeout: 10_000 })
  // Scroll via JS — bypasses Playwright's visibility requirement
  await heading.first().evaluate((el) => el.scrollIntoView({ block: "center" }))
  // Wait for IntersectionObserver to fire and animation to complete
  await heading.first().waitFor({ state: "visible", timeout: 10_000 })
}

test.describe("Buyer Console Demo", () => {
  test.use({ viewport: { width: 1280, height: 900 } })
  test.setTimeout(30_000)

  test("section heading renders on homepage", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" })

    await scrollToHeading(page)

    const heading = page.locator(
      "h2:has-text('Your Buyer Console — Every Offer, One Dashboard')"
    )
    await expect(heading.first()).toBeVisible({ timeout: 10_000 })
  })

  test("buyer console renders with dealer cards", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" })

    await scrollToHeading(page)

    // Dealer cards should be present (use :visible to target the
    // desktop BuyerConsole — the mobile duplicate is display:none at 1280 px)
    await expect(page.locator('[data-dealer-id="a"]:visible')).toBeVisible()
    await expect(page.locator('[data-dealer-id="b"]:visible')).toBeVisible()
  })

  test("manual click on dealer card changes selection", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" })

    await scrollToHeading(page)

    // Wait for cards to appear (use :visible to target the desktop instance —
    // the mobile duplicate is display:none at 1280 px and causes strict-mode
    // violations without the pseudo-selector)
    const dealerA = page.locator('[data-dealer-id="a"]:visible [role="button"]')
    await expect(dealerA).toBeVisible({ timeout: 10_000 })

    // Click Dealer A
    await dealerA.click()

    // Dealer A should now have the selected styling (green border)
    await expect(dealerA).toHaveClass(/border-brand-green/, { timeout: 5_000 })

    // Click Dealer B
    const dealerB = page.locator('[data-dealer-id="b"]:visible [role="button"]')
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
    await scrollToHeading(page)

    // Wait for network to settle after scrolling
    await page.waitForLoadState("networkidle")

    expect(
      errors.length,
      `Runtime errors detected: ${errors.join("; ")}`
    ).toBe(0)
  })
})
