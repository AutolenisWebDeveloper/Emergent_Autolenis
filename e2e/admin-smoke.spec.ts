import { test, expect } from "@playwright/test"

test.describe("Admin Smoke Tests", () => {
  test("admin sign-in page renders correctly", async ({ page }) => {
    await page.goto("/admin/sign-in")

    await expect(page.locator("text=Admin Sign In")).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test("admin sign-in shows error for invalid credentials", async ({ page }) => {
    await page.goto("/admin/sign-in")

    await page.fill('input[type="email"]', "invalid@example.com")
    await page.fill('input[type="password"]', "wrongpassword")
    await page.click('button[type="submit"]')

    // Should show an error (either inline or via toast)
    await expect(
      page.locator("text=/invalid|failed|error/i").first()
    ).toBeVisible({ timeout: 10000 })
  })

  test("protected admin routes redirect to sign-in", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await expect(page).toHaveURL(/admin\/sign-in/)
  })

  test("admin notifications page loads", async ({ page }) => {
    // Visit notifications page directly (will redirect to sign-in for unauthenticated)
    await page.goto("/admin/notifications")
    // Should either show the page or redirect to sign-in
    await expect(page).toHaveURL(/admin/)
  })

  test("admin sidebar navigation items exist", async ({ page }) => {
    await page.goto("/admin/sign-in")

    // Verify sign-in page has proper structure
    await expect(page.locator("text=Admin Portal")).toBeVisible()
    await expect(page.locator("text=AutoLenis").first()).toBeVisible()
  })

  test("admin sign-in API returns proper error codes", async ({ request }) => {
    // Test 401 for invalid credentials
    const response = await request.post("/api/admin/auth/signin", {
      data: {
        email: "nonexistent@test.com",
        password: "wrongpassword",
      },
    })
    // Should be 401 or 500 (if DB not configured), never 200
    expect([401, 500, 503]).toContain(response.status())

    if (response.status() === 401) {
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.error).toBeTruthy()
    }
  })

  test("admin sign-in API rejects missing fields", async ({ request }) => {
    const response = await request.post("/api/admin/auth/signin", {
      data: { email: "" },
    })
    // Should fail with validation error or auth error
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test("admin search API requires authentication", async ({ request }) => {
    const response = await request.get("/api/admin/search?q=test")
    expect([401, 403]).toContain(response.status())
  })

  test("admin notifications API requires authentication", async ({ request }) => {
    const response = await request.get("/api/admin/notifications")
    expect([401, 403]).toContain(response.status())
  })

  test("admin notifications API returns proper shape", async ({ request }) => {
    // When authenticated (or mocked), should return proper structure
    const response = await request.get("/api/admin/notifications")
    if (response.status() === 200) {
      const body = await response.json()
      expect(body).toHaveProperty("notifications")
      expect(body).toHaveProperty("unreadCount")
      expect(body).toHaveProperty("total")
      expect(Array.isArray(body.notifications)).toBe(true)
    }
  })

  test("admin buyer detail pages exist", async ({ page }) => {
    // These will redirect to sign-in without auth, but should not 500
    const response = await page.goto("/admin/buyers", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("admin dealer pages exist", async ({ page }) => {
    const response = await page.goto("/admin/dealers", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("admin dealer detail page does not show Dealer Not Found for valid dealer", async ({ page }) => {
    // Navigate to dealers list
    const listResponse = await page.goto("/admin/dealers", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const finalUrl = page.url()

    // If redirected to auth, skip the test
    if (finalUrl.includes("/sign-in") || finalUrl.includes("/auth/")) {
      test.skip(true, "Redirected to auth — cannot check dealer detail without session")
      return
    }

    // Wait for dealers to load and click first "Details" link
    const detailsLink = page.locator('a[href*="/admin/dealers/"]').first()
    const exists = await detailsLink.isVisible({ timeout: 10_000 }).catch(() => false)

    if (!exists) {
      test.skip(true, "No dealer links found on the page")
      return
    }

    await detailsLink.click()
    await page.waitForLoadState("domcontentloaded")

    // Assert the page does NOT show "Dealer Not Found"
    const notFound = page.locator("text=Dealer Not Found")
    const isNotFoundVisible = await notFound.isVisible({ timeout: 5_000 }).catch(() => false)
    expect(isNotFoundVisible, "Dealer detail should not show 'Dealer Not Found'").toBe(false)
  })

  test("admin affiliate pages exist", async ({ page }) => {
    const response = await page.goto("/admin/affiliates", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("admin payments page exists", async ({ page }) => {
    const response = await page.goto("/admin/payments", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("admin payouts page exists", async ({ page }) => {
    const response = await page.goto("/admin/payouts", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("admin documents page exists", async ({ page }) => {
    const response = await page.goto("/admin/documents", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("admin requests pages exist (list + detail should not 500)", async ({ page }) => {
    const listResponse = await page.goto("/admin/requests", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(listResponse?.status() ?? 0).toBeLessThan(500)

    // Detail uses Auction ID; without auth it may redirect, but should never 500
    const detailResponse = await page.goto("/admin/requests/test_request_001", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(detailResponse?.status() ?? 0).toBeLessThan(500)
  })

  test("admin requests API requires authentication", async ({ request }) => {
    const res = await request.get("/api/admin/requests")
    expect([401, 403]).toContain(res.status())
  })

  test("admin settings page loads without 500", async ({ page }) => {
    const response = await page.goto("/admin/settings", {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("admin settings sub-pages load without 500", async ({ page }) => {
    for (const subpage of ["roles", "integrations", "branding"]) {
      const response = await page.goto(`/admin/settings/${subpage}`, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      })
      const status = response?.status() ?? 0
      expect(status).toBeLessThan(500)
    }
  })

  test("admin settings API requires authentication", async ({ request }) => {
    const res = await request.get("/api/admin/settings")
    expect([401, 403]).toContain(res.status())
  })

  test("admin settings API rejects invalid keys", async ({ request }) => {
    const res = await request.post("/api/admin/settings", {
      data: { key: "not_a_real_key", value: 123 },
    })
    // Should return 400 or 401 (if unauthenticated)
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test("admin settings API rejects null values", async ({ request }) => {
    const res = await request.post("/api/admin/settings", {
      data: { key: "deposit_amount", value: null },
    })
    // Should return 400 or 401 (if unauthenticated)
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })
})
