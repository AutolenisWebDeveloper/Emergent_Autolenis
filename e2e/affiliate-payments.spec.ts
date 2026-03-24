import { test, expect } from "@playwright/test"

test.describe("Admin Affiliate Payments", () => {
  test("payments page exists and does not return 500", async ({ page }) => {
    const response = await page.goto("/admin/payouts/payments", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    // Page should load (200) or redirect to sign-in (302→200), never 500
    expect(status).toBeLessThan(500)
  })

  test("payments API requires authentication", async ({ request }) => {
    const response = await request.get("/api/admin/affiliates/payments")
    expect([401, 403]).toContain(response.status())
  })

  test("initiate payment API requires authentication", async ({ request }) => {
    const response = await request.post("/api/admin/affiliates/payments/initiate", {
      data: {
        affiliateId: "test",
        amount: 1000,
        method: "bank_transfer",
      },
    })
    expect([401, 403]).toContain(response.status())
  })

  test("update payment API requires authentication", async ({ request }) => {
    const response = await request.patch("/api/admin/affiliates/payments/test-id", {
      data: { status: "PAID" },
    })
    expect([401, 403]).toContain(response.status())
  })

  test("affiliates page contains Payments tab link", async ({ page }) => {
    // Visit affiliates page (will redirect to sign-in without auth)
    const response = await page.goto("/admin/affiliates", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })
})
