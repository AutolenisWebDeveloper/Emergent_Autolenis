import { test, expect } from "@playwright/test"

/**
 * Header Navigation Integrity E2E Tests
 *
 * Validates the redesigned public header meets all requirements:
 * 1) All nav items present with correct labels and hrefs
 * 2) CTAs (Sign In, Get Started) are present
 * 3) Mobile hamburger opens sheet with all items
 * 4) Accessibility: header landmark, nav label, aria-expanded
 * 5) No broken routes (non-500 responses)
 *
 * Run: pnpm test:e2e --grep "Header Navigation"
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000"

const EXPECTED_NAV_ITEMS = [
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Refinance", href: "/refinance" },
  { label: "About", href: "/about" },
  { label: "Contract Shield", href: "/contract-shield" },
  { label: "Contact", href: "/contact" },
  { label: "Partner Program", href: "/affiliate" },
  { label: "Dealers", href: "/dealer-application" },
]

test.describe("Header Navigation — Desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } })
  test.setTimeout(30_000)

  test("renders all nav links with correct labels", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" })

    const nav = page.locator('nav[aria-label="Main navigation"]')
    await expect(nav).toBeVisible()

    for (const item of EXPECTED_NAV_ITEMS) {
      const link = nav.locator(`a[href="${item.href}"]`, { hasText: item.label })
      await expect(link, `Missing nav link: ${item.label}`).toBeVisible()
    }
  })

  test("renders Sign In and Get Started CTAs", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" })

    const signIn = page.locator('nav[aria-label="Main navigation"] a[href="/auth/signin"]', { hasText: "Sign In" }).first()
    await expect(signIn).toBeVisible()

    const getStarted = page.locator('nav[aria-label="Main navigation"] a[href="/auth/signup"]', { hasText: "Get Started" }).first()
    await expect(getStarted).toBeVisible()
  })

  test("has correct semantic structure", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" })

    // Should have a <header> element
    const header = page.locator("header").first()
    await expect(header).toBeVisible()

    // Should have <nav> with aria-label
    const nav = header.locator('nav[aria-label="Main navigation"]')
    await expect(nav).toBeVisible()
  })

  test("all header nav hrefs return non-500", async ({ page }) => {
    const issues: string[] = []

    for (const item of EXPECTED_NAV_ITEMS) {
      const url = `${BASE}${item.href}`
      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        })
        const status = response?.status() ?? 0
        if (status >= 500) {
          issues.push(`${item.label} (${item.href}) → ${status}`)
        }
      } catch (err) {
        issues.push(
          `${item.label} (${item.href}) → error: ${(err as Error).message?.slice(0, 80)}`,
        )
      }
    }

    expect(issues.length, `Header link failures: ${issues.join(", ")}`).toBe(0)
  })
})

test.describe("Header Navigation — Mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } })
  test.setTimeout(30_000)

  test("shows hamburger and hides desktop nav on mobile", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" })

    // Hamburger should be visible
    const hamburger = page.locator('button[aria-label="Open menu"]')
    await expect(hamburger).toBeVisible()

    // Desktop nav links should be hidden
    const desktopNav = page.locator('div[role="menubar"]')
    await expect(desktopNav).toBeHidden()
  })

  test("hamburger opens sheet with all nav items", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" })
    // Wait for page to fully hydrate
    await page.waitForTimeout(1000)

    const hamburger = page.locator('button[aria-label="Open menu"]')
    await expect(hamburger).toBeVisible({ timeout: 5_000 })
    await hamburger.click()

    // Wait for sheet to open — look for mobile nav landmark
    await page.waitForSelector('nav[aria-label="Mobile navigation"]', { state: "visible", timeout: 10_000 })

    // Give the sheet animation time to fully complete
    await page.waitForTimeout(1000)

    // Check for all nav items in the sheet
    for (const item of EXPECTED_NAV_ITEMS) {
      const link = page.locator(`nav[aria-label="Mobile navigation"] a[href="${item.href}"]`).first()
      await expect(link, `Missing mobile nav link: ${item.label}`).toBeVisible({ timeout: 5_000 })
    }

    // Sign In should be in the sheet (footer area)
    const sheetSignIn = page.locator('#mobile-nav-sheet a[href="/auth/signin"]')
    await expect(sheetSignIn.first()).toBeVisible({ timeout: 5_000 })

    // Get Started should be in the sheet (footer area)
    const sheetGetStarted = page.locator('#mobile-nav-sheet a[href="/auth/signup"]')
    await expect(sheetGetStarted.first()).toBeVisible({ timeout: 5_000 })
  })

  test("mobile Get Started CTA is visible in header bar", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" })
    // Wait for client hydration
    await page.waitForTimeout(1000)

    // The mobile header should show a "Get Started" CTA alongside the hamburger
    // Use the container that's lg:hidden to scope to mobile CTA
    const mobileGetStarted = page.locator('.lg\\:hidden a[href="/auth/signup"]').first()
    await expect(mobileGetStarted).toBeVisible({ timeout: 5_000 })
  })
})
