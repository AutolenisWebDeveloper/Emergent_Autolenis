import { test, expect } from "@playwright/test"

test.describe("Admin Affiliate Detail Page", () => {
  test("affiliate detail page exists and does not return 500", async ({ page }) => {
    // Use a known mock affiliate ID
    const response = await page.goto("/admin/affiliates/affiliate_gold_001", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    // Page should load (200) or redirect to sign-in (302→200), never 500
    expect(status).toBeLessThan(500)
  })

  test("affiliate detail API requires authentication", async ({ request }) => {
    const response = await request.get("/api/admin/affiliates/affiliate_gold_001")
    expect([401, 403]).toContain(response.status())
  })

  test("affiliate status API requires authentication", async ({ request }) => {
    const response = await request.patch("/api/admin/affiliates/affiliate_gold_001/status", {
      data: { status: "ACTIVE" },
    })
    expect([401, 403]).toContain(response.status())
  })

  test("affiliates list page loads without 500", async ({ page }) => {
    const response = await page.goto("/admin/affiliates", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("affiliate payouts page exists and does not return 500", async ({ page }) => {
    const response = await page.goto("/admin/affiliates/affiliate_gold_001/payouts", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })
})
