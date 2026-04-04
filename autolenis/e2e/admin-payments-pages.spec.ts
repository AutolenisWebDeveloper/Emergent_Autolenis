import { test, expect } from "@playwright/test"

test.describe("Admin Payments Sub-Pages", () => {
  test("admin deposits page exists (no 500)", async ({ page }) => {
    const response = await page.goto("/admin/payments/deposits", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("admin concierge-fees page exists (no 500)", async ({ page }) => {
    const response = await page.goto("/admin/payments/concierge-fees", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("admin refunds page exists (no 500)", async ({ page }) => {
    const response = await page.goto("/admin/payments/refunds", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("admin payments hub page exists (no 500)", async ({ page }) => {
    const response = await page.goto("/admin/payments", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("deposits API requires authentication", async ({ request }) => {
    const response = await request.get("/api/admin/payments/deposits")
    expect([401, 403]).toContain(response.status())
  })

  test("concierge-fees API requires authentication", async ({ request }) => {
    const response = await request.get("/api/admin/payments/concierge-fees")
    expect([401, 403]).toContain(response.status())
  })

  test("refunds API requires authentication", async ({ request }) => {
    const response = await request.get("/api/admin/payments/refunds")
    expect([401, 403]).toContain(response.status())
  })

  test("deposit request API requires authentication", async ({ request }) => {
    const response = await request.post("/api/admin/payments/deposits/request", {
      data: { buyerId: "test", amount: 9900 },
    })
    expect([401, 403]).toContain(response.status())
  })

  test("concierge fee request API requires authentication", async ({ request }) => {
    const response = await request.post("/api/admin/payments/concierge-fees/request", {
      data: { buyerId: "test", dealId: "test", amount: 49900 },
    })
    expect([401, 403]).toContain(response.status())
  })

  test("refund initiate API requires authentication", async ({ request }) => {
    const response = await request.post("/api/admin/payments/refunds/initiate", {
      data: { buyerId: "test", amount: 9900, reason: "test" },
    })
    expect([401, 403]).toContain(response.status())
  })
})
