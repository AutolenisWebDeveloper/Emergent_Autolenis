import { test, expect } from "@playwright/test"

test.describe("Mobile Responsiveness", () => {
  test.use({ viewport: { width: 375, height: 667 } }) // iPhone SE size

  test("should display mobile navigation", async ({ page }) => {
    await page.goto("/")

    // Check for mobile menu button
    const menuButton = page.locator('[aria-label*="menu" i], [aria-label*="navigation" i]').first()
    await expect(menuButton).toBeVisible()
  })

  test("should have readable text on mobile", async ({ page }) => {
    await page.goto("/")

    // Check that main heading is visible and readable
    const heading = page.locator("h1").first()
    await expect(heading).toBeVisible()

    // Font size should be reasonable (at least 16px for body text)
    const fontSize = await heading.evaluate((el) => {
      return window.getComputedStyle(el).fontSize
    })
    expect(Number.parseInt(fontSize)).toBeGreaterThan(20) // Headings typically larger
  })

  test("should not have horizontal scroll", async ({ page }) => {
    await page.goto("/")

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })

  test("forms should be usable on mobile", async ({ page }) => {
    await page.goto("/auth/signin")

    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')

    // Check inputs are large enough to tap
    const emailBox = await emailInput.boundingBox()
    const passwordBox = await passwordInput.boundingBox()

    expect(emailBox?.height).toBeGreaterThanOrEqual(44) // WCAG minimum
    expect(passwordBox?.height).toBeGreaterThanOrEqual(44)
  })

  test("mobile navigation should work", async ({ page }) => {
    await page.goto("/")

    // Open mobile menu
    const menuButton = page.locator('[aria-label*="menu" i]').first()
    if (await menuButton.isVisible()) {
      await menuButton.click()

      // Check menu items are visible
      await expect(page.locator("nav a").first()).toBeVisible()
    }
  })
})

test.describe("Tablet Responsiveness", () => {
  test.use({ viewport: { width: 768, height: 1024 } }) // iPad size

  test("should display appropriate layout on tablet", async ({ page }) => {
    await page.goto("/")

    // Page should be visible without issues
    await expect(page.locator("body")).toBeVisible()

    // No horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5) // 5px tolerance
  })
})
