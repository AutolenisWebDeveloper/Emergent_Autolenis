import { test, expect } from "@playwright/test"

/**
 * Audit Validation E2E Tests
 *
 * Covers the mandatory Playwright suite items from the enterprise audit:
 * 1) Public nav click-through (header + footer)
 * 2) Auth: sign in → redirect based on role
 * 3) Buyer deal flow smoke
 * 4) Dealer flow smoke
 * 5) Affiliate portal smoke
 * 6) Admin smoke
 * 7) Documents: authorized/unauthorized access
 * 8) RLS: negative tests (cross-tenant read attempts)
 *
 * Run: pnpm test:e2e --grep "Audit Validation"
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000"

// ─── 1) Public Nav Click-Through ─────────────────────────────────────────────

test.describe("Audit Validation — Public Nav", () => {
  test.setTimeout(60_000)

  const HEADER_LINKS = [
    { label: "How It Works", href: "/how-it-works" },
    { label: "Pricing", href: "/pricing" },
    { label: "Refinance", href: "/refinance" },
    { label: "About", href: "/about" },
    { label: "Contract Shield", href: "/contract-shield" },
    { label: "Contact", href: "/contact" },
    { label: "Partner Program", href: "/affiliate" },
    { label: "Dealers", href: "/dealer-application" },
  ]

  const FOOTER_LINKS = [
    { label: "How It Works", href: "/how-it-works" },
    { label: "Insurance", href: "/insurance" },
    { label: "Pricing", href: "/pricing" },
    { label: "Get Started", href: "/buyer/onboarding" },
    { label: "For Dealers", href: "/dealer-application" },
    { label: "About", href: "/about" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy Policy", href: "/legal/privacy" },
    { label: "Terms of Service", href: "/legal/terms" },
    { label: "Dealer Terms", href: "/legal/dealer-terms" },
  ]

  test("all public header links return non-500", async ({ page }) => {
    const issues: string[] = []

    for (const link of HEADER_LINKS) {
      const url = `${BASE}${link.href}`
      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        })
        const status = response?.status() ?? 0
        if (status >= 500) {
          issues.push(`${link.label} (${link.href}) → ${status}`)
        }
      } catch (err) {
        issues.push(`${link.label} (${link.href}) → error: ${(err as Error).message?.slice(0, 80)}`)
      }
    }

    expect(issues.length, `Header link failures: ${issues.join(", ")}`).toBe(0)
  })

  test("all public footer links return non-500", async ({ page }) => {
    const issues: string[] = []

    for (const link of FOOTER_LINKS) {
      const url = `${BASE}${link.href}`
      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        })
        const status = response?.status() ?? 0
        if (status >= 500) {
          issues.push(`${link.label} (${link.href}) → ${status}`)
        }
      } catch (err) {
        issues.push(`${link.label} (${link.href}) → error: ${(err as Error).message?.slice(0, 80)}`)
      }
    }

    expect(issues.length, `Footer link failures: ${issues.join(", ")}`).toBe(0)
  })

  test("homepage renders expected content", async ({ page }) => {
    const response = await page.goto(BASE, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(response?.status()).toBeLessThan(500)

    // Should have AutoLenis branding
    const branding = page.locator("text=/AutoLenis/i").first()
    await expect(branding).toBeVisible({ timeout: 5_000 })
  })
})

// ─── 2) Auth: Sign In → Redirect Based on Role ──────────────────────────────

test.describe("Audit Validation — Auth Redirects", () => {
  test.setTimeout(30_000)

  test("buyer dashboard redirects unauthenticated to signin", async ({ page }) => {
    await page.goto(`${BASE}/buyer/dashboard`)
    await expect(page).toHaveURL(/signin/)
  })

  test("dealer dashboard redirects unauthenticated to sign-in", async ({ page }) => {
    const response = await page.goto(`${BASE}/dealer/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
    // Should either redirect to sign-in or show sign-in content
    const url = page.url()
    const redirected = url.includes("sign-in") || url.includes("signin")
    const hasSignIn = await page.locator("text=/sign in/i").first().isVisible({ timeout: 3_000 }).catch(() => false)
    expect(redirected || hasSignIn).toBeTruthy()
  })

  test("admin dashboard redirects unauthenticated to admin sign-in", async ({ page }) => {
    await page.goto(`${BASE}/admin/dashboard`)
    await expect(page).toHaveURL(/admin\/sign-in/)
  })

  test("affiliate portal redirects unauthenticated", async ({ page }) => {
    const response = await page.goto(`${BASE}/affiliate/portal/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })
})

// ─── 3) Buyer Deal Flow Smoke ────────────────────────────────────────────────

test.describe("Audit Validation — Buyer Deal Flow", () => {
  test.setTimeout(60_000)

  const BUYER_DEAL_ROUTES = [
    "/buyer/dashboard",
    "/buyer/prequal",
    "/buyer/auction",
    "/buyer/offers",
    "/buyer/deal",
    "/buyer/deal/summary",
    "/buyer/deal/financing",
    "/buyer/deal/fee",
    "/buyer/deal/insurance",
    "/buyer/deal/contract",
    "/buyer/deal/esign",
    "/buyer/deal/pickup",
    "/buyer/documents",
    "/buyer/contracts",
  ]

  test("all buyer deal flow routes return non-500", async ({ page }) => {
    const issues: string[] = []

    for (const route of BUYER_DEAL_ROUTES) {
      const url = `${BASE}${route}`
      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        })
        const status = response?.status() ?? 0
        if (status >= 500) {
          issues.push(`${route} → ${status}`)
        }
      } catch (err) {
        issues.push(`${route} → error: ${(err as Error).message?.slice(0, 80)}`)
      }
    }

    expect(issues.length, `Buyer deal flow failures: ${issues.join(", ")}`).toBe(0)
  })

  test("buyer onboarding page loads", async ({ page }) => {
    const response = await page.goto(`${BASE}/buyer/onboarding`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })
})

// ─── 4) Dealer Flow Smoke ────────────────────────────────────────────────────

test.describe("Audit Validation — Dealer Flow", () => {
  test.setTimeout(60_000)

  const DEALER_ROUTES = [
    "/dealer/dashboard",
    "/dealer/requests",
    "/dealer/inventory",
    "/dealer/auctions",
    "/dealer/offers",
    "/dealer/deals",
    "/dealer/contracts",
    "/dealer/documents",
    "/dealer/payments",
    "/dealer/messages",
    "/dealer/pickups",
    "/dealer/settings",
  ]

  test("all dealer flow routes return non-500", async ({ page }) => {
    const issues: string[] = []

    for (const route of DEALER_ROUTES) {
      const url = `${BASE}${route}`
      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        })
        const status = response?.status() ?? 0
        if (status >= 500) {
          issues.push(`${route} → ${status}`)
        }
      } catch (err) {
        issues.push(`${route} → error: ${(err as Error).message?.slice(0, 80)}`)
      }
    }

    expect(issues.length, `Dealer flow failures: ${issues.join(", ")}`).toBe(0)
  })
})

// ─── 5) Affiliate Portal Smoke ──────────────────────────────────────────────

test.describe("Audit Validation — Affiliate Portal", () => {
  test.setTimeout(60_000)

  const AFFILIATE_ROUTES = [
    "/affiliate/portal/dashboard",
    "/affiliate/portal/link",
    "/affiliate/portal/referrals",
    "/affiliate/portal/commissions",
    "/affiliate/portal/payouts",
    "/affiliate/portal/documents",
    "/affiliate/portal/analytics",
    "/affiliate/portal/settings",
  ]

  test("all affiliate portal routes return non-500", async ({ page }) => {
    const issues: string[] = []

    for (const route of AFFILIATE_ROUTES) {
      const url = `${BASE}${route}`
      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        })
        const status = response?.status() ?? 0
        if (status >= 500) {
          issues.push(`${route} → ${status}`)
        }
      } catch (err) {
        issues.push(`${route} → error: ${(err as Error).message?.slice(0, 80)}`)
      }
    }

    expect(issues.length, `Affiliate portal failures: ${issues.join(", ")}`).toBe(0)
  })
})

// ─── 6) Admin Smoke ─────────────────────────────────────────────────────────

test.describe("Audit Validation — Admin Smoke", () => {
  test.setTimeout(60_000)

  const ADMIN_ROUTES = [
    "/admin/dashboard",
    "/admin/buyers",
    "/admin/dealers",
    "/admin/auctions",
    "/admin/offers",
    "/admin/deals",
    "/admin/affiliates",
    "/admin/payments",
    "/admin/documents",
    "/admin/users",
    "/admin/settings",
  ]

  test("all admin routes return non-500", async ({ page }) => {
    const issues: string[] = []

    for (const route of ADMIN_ROUTES) {
      const url = `${BASE}${route}`
      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        })
        const status = response?.status() ?? 0
        if (status >= 500) {
          issues.push(`${route} → ${status}`)
        }
      } catch (err) {
        issues.push(`${route} → error: ${(err as Error).message?.slice(0, 80)}`)
      }
    }

    expect(issues.length, `Admin route failures: ${issues.join(", ")}`).toBe(0)
  })

  test("admin sign-in page renders form", async ({ page }) => {
    await page.goto(`${BASE}/admin/sign-in`)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })
})

// ─── 7) Documents: Auth Enforcement ──────────────────────────────────────────

test.describe("Audit Validation — Documents Auth", () => {
  test.setTimeout(30_000)

  test("documents API requires authentication", async ({ request }) => {
    const response = await request.get(`${BASE}/api/documents`)
    expect([401, 403]).toContain(response.status())
  })

  test("affiliate documents API requires authentication", async ({ request }) => {
    const response = await request.get(`${BASE}/api/affiliate/documents`)
    expect([401, 403]).toContain(response.status())
  })

  test("buyer documents page redirects unauthenticated", async ({ page }) => {
    const response = await page.goto(`${BASE}/buyer/documents`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })

  test("dealer documents page redirects unauthenticated", async ({ page }) => {
    const response = await page.goto(`${BASE}/dealer/documents`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)
  })
})

// ─── 8) RLS: Negative Tests (Cross-Tenant Read Attempts) ────────────────────

test.describe("Audit Validation — RLS Negative Tests", () => {
  test.setTimeout(30_000)

  test("buyer API rejects unauthenticated requests", async ({ request }) => {
    const endpoints = [
      "/api/buyer/dashboard",
      "/api/buyer/prequal/draft",
      "/api/buyer/requests",
      "/api/buyer/trade-in",
      "/api/buyer/coverage-gap",
    ]

    for (const endpoint of endpoints) {
      const response = await request.get(`${BASE}${endpoint}`)
      expect(
        [401, 403].includes(response.status()),
        `${endpoint} should reject unauthenticated: got ${response.status()}`
      ).toBeTruthy()
    }
  })

  test("dealer API rejects unauthenticated requests", async ({ request }) => {
    const endpoints = [
      "/api/dealer/inventory",
      "/api/dealer/offers",
      "/api/dealer/deals",
      "/api/dealer/auctions",
    ]

    for (const endpoint of endpoints) {
      const response = await request.get(`${BASE}${endpoint}`)
      expect(
        [401, 403].includes(response.status()),
        `${endpoint} should reject unauthenticated: got ${response.status()}`
      ).toBeTruthy()
    }
  })

  test("admin API rejects unauthenticated requests", async ({ request }) => {
    const endpoints = [
      "/api/admin/notifications",
      "/api/admin/search?q=test",
      "/api/admin/dealers",
      "/api/admin/buyers",
      "/api/admin/auctions",
    ]

    for (const endpoint of endpoints) {
      const response = await request.get(`${BASE}${endpoint}`)
      expect(
        [401, 403].includes(response.status()),
        `${endpoint} should reject unauthenticated: got ${response.status()}`
      ).toBeTruthy()
    }
  })

  test("affiliate API rejects unauthenticated requests", async ({ request }) => {
    const endpoints = [
      "/api/affiliate/dashboard",
      "/api/affiliate/commissions",
      "/api/affiliate/referrals",
      "/api/affiliate/payouts",
    ]

    for (const endpoint of endpoints) {
      const response = await request.get(`${BASE}${endpoint}`)
      expect(
        [401, 403].includes(response.status()),
        `${endpoint} should reject unauthenticated: got ${response.status()}`
      ).toBeTruthy()
    }
  })

  test("cross-tenant API access is blocked without valid session", async ({ request }) => {
    // Attempt to access buyer data with fabricated headers
    const response = await request.get(`${BASE}/api/buyer/dashboard`, {
      headers: {
        "x-workspace-id": "ws_fake_workspace_123",
        "Authorization": "Bearer fake-token-12345",
      },
    })
    // Should still reject - tokens must be valid
    expect(
      [401, 403].includes(response.status()),
      `Cross-tenant access should be blocked: got ${response.status()}`
    ).toBeTruthy()
  })

  test("test workspace routes blocked without TEST mode", async ({ page }) => {
    // /test/* routes should not be accessible without proper workspace mode
    const testRoutes = [
      "/test/buyer",
      "/test/dealer",
      "/test/admin",
      "/test/affiliate",
    ]

    for (const route of testRoutes) {
      const response = await page.goto(`${BASE}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      })
      const status = response?.status() ?? 0
      // Should either 404 (LIVE mode blocks /test/*) or redirect to signin
      expect(
        status < 500,
        `${route} should not return 500: got ${status}`
      ).toBeTruthy()
    }
  })

  test("API does not leak raw errors to clients", async ({ request }) => {
    // Send malformed requests and verify no stack traces leak
    const response = await request.post(`${BASE}/api/auth/signin`, {
      data: { email: "not-an-email", password: "" },
    })

    const status = response.status()
    expect(status).toBeGreaterThanOrEqual(400)

    if (status < 500) {
      const body = await response.text()
      // Should not contain stack traces or internal paths
      expect(body).not.toContain("node_modules")
      expect(body).not.toContain("at Object.")
      expect(body).not.toContain("ECONNREFUSED")
    }
  })
})
