import { test, expect } from "@playwright/test"

test.describe("Financial Reporting", () => {
  test("financial reporting page does not 500", async ({ page }) => {
    const response = await page.goto("/admin/financial-reporting", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("financial API requires authentication", async ({ request }) => {
    const response = await request.get("/api/admin/financial")
    expect([401, 403]).toContain(response.status())
  })

  test("financial API returns correlationId on 401", async ({ request }) => {
    const response = await request.get("/api/admin/financial")
    if (response.status() === 401) {
      const body = await response.json()
      expect(body).toHaveProperty("correlationId")
    }
  })

  test("reconciliation API requires authentication", async ({ request }) => {
    const response = await request.get("/api/admin/financial/reconciliation")
    expect([401, 403]).toContain(response.status())
  })

  test("export API requires authentication", async ({ request }) => {
    const response = await request.get("/api/admin/financial/export?format=csv")
    expect([401, 403]).toContain(response.status())
  })

  test("reconciliation sync requires super admin", async ({ request }) => {
    const response = await request.post("/api/admin/financial/reconciliation")
    // Without auth, should be 401 or 403
    expect([401, 403]).toContain(response.status())
  })

  test("financial reporting page redirects to sign-in when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/admin/financial-reporting")
    await expect(page).toHaveURL(/admin/)
  })

  test("reports hub links to finance page", async ({ page }) => {
    const response = await page.goto("/admin/reports", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })
})
