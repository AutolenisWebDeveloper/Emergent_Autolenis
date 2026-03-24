import { test, expect } from "@playwright/test"

/**
 * Refinance Feature — Smoke + Link Alignment
 *
 * Ensures refinance page renders and the required "Report" link routes into Admin Dashboard.
 * This link is allowed to redirect to /admin/sign-in when not authenticated, but it must never point to dealer routes.
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000"

test.describe("Refinance Feature", () => {
  test("refinance page loads and includes Report → /admin/dashboard", async ({ page }) => {
    const res = await page.goto(`${BASE}/refinance`, { waitUntil: "domcontentloaded" })
    expect(res?.status() ?? 0).toBeLessThan(500)

    const report = page.locator('a[aria-label="Report (Admin Dashboard)"]')
    await expect(report).toBeVisible()
    await expect(report).toHaveAttribute("href", "/admin/dashboard")
  })

  test("refinance APIs exist and are not 404", async ({ request }) => {
    // eligibility endpoint should reject missing fields with 400 (not 404/500)
    const res = await request.post(`${BASE}/api/refinance/check-eligibility`, {
      data: {},
      headers: { "Content-Type": "application/json" },
    })
    expect([400, 429]).toContain(res.status())

    // record-redirect endpoint should reject missing leadId with 400 (not 404/500)
    const res2 = await request.post(`${BASE}/api/refinance/record-redirect`, {
      data: {},
      headers: { "Content-Type": "application/json" },
    })
    expect([400, 429]).toContain(res2.status())
  })
})
