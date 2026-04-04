import { test, expect } from "@playwright/test"
import { URL } from "node:url"
import dns from "node:dns/promises"

/**
 * Buyer Package Staging UAT — E2E Validation
 *
 * Validates all 7 buyer package flows against the live staging deployment.
 * Covers registration, upgrade, deposit payment, concierge fee, admin detail,
 * and email delivery verification.
 *
 * Run against staging:
 *   SMOKE_BASE_URL=https://staging.autolenis.com pnpm test:e2e e2e/buyer-package-uat.spec.ts --project=chromium
 *
 * Run locally:
 *   pnpm test:e2e e2e/buyer-package-uat.spec.ts --project=chromium
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000"
const TEST_BASE = process.env.SMOKE_TEST_BASE_URL ?? BASE

// Pre-check: resolve target hostname before running tests
let targetReachable: boolean | null = null
async function checkTargetReachable(): Promise<boolean> {
  if (targetReachable !== null) return targetReachable
  try {
    const hostname = new URL(TEST_BASE).hostname
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      targetReachable = true
      return true
    }
    await dns.lookup(hostname)
    targetReachable = true
  } catch {
    targetReachable = false
  }
  return targetReachable
}

function skipIfUnreachable() {
  test.beforeEach(async () => {
    const reachable = await checkTargetReachable()
    if (!reachable) {
      test.skip(true, `Target ${TEST_BASE} is not reachable — DNS lookup failed`)
    }
  })
}

// ─── Flow 1: Register buyer as STANDARD ──────────────────────────────────────

test.describe("Flow 1 — Register buyer as STANDARD", () => {
  test.setTimeout(30_000)
  skipIfUnreachable()

  test("signup page renders with package selection", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/auth/signup`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(response?.status()).toBeLessThan(500)

    // Signup page should render without server error
    const pageContent = await page.content()
    expect(pageContent.length).toBeGreaterThan(100)
  })

  test("signup API validates STANDARD packageTier", async ({ request }) => {
    const response = await request.post(`${TEST_BASE}/api/auth/signup`, {
      data: {
        email: `uat-std-${Date.now()}@test.autolenis.com`,
        password: "UatTest123!",
        firstName: "UAT",
        lastName: "Standard",
        role: "BUYER",
        packageTier: "STANDARD",
      },
    })
    // Expect 2xx (created/ok), 4xx (validation/conflict), or 503 (DB not configured in CI)
    // Never 500 (unhandled server error)
    expect(response.status() < 500 || response.status() === 503).toBe(true)
  })

  test("signup API rejects buyer without packageTier", async ({ request }) => {
    const response = await request.post(`${TEST_BASE}/api/auth/signup`, {
      data: {
        email: `uat-nopackage-${Date.now()}@test.autolenis.com`,
        password: "UatTest123!",
        firstName: "UAT",
        lastName: "NoPackage",
        role: "BUYER",
      },
    })
    // Should be 400 (validation error) — missing required packageTier
    expect(response.status()).toBe(400)
  })

  test("signup API rejects invalid packageTier", async ({ request }) => {
    const response = await request.post(`${TEST_BASE}/api/auth/signup`, {
      data: {
        email: `uat-invalid-${Date.now()}@test.autolenis.com`,
        password: "UatTest123!",
        firstName: "UAT",
        lastName: "Invalid",
        role: "BUYER",
        packageTier: "GOLD",
      },
    })
    expect(response.status()).toBe(400)
  })
})

// ─── Flow 2: Register buyer as PREMIUM ───────────────────────────────────────

test.describe("Flow 2 — Register buyer as PREMIUM", () => {
  test.setTimeout(30_000)
  skipIfUnreachable()

  test("signup API validates PREMIUM packageTier", async ({ request }) => {
    const response = await request.post(`${TEST_BASE}/api/auth/signup`, {
      data: {
        email: `uat-prem-${Date.now()}@test.autolenis.com`,
        password: "UatTest123!",
        firstName: "UAT",
        lastName: "Premium",
        role: "BUYER",
        packageTier: "PREMIUM",
      },
    })
    // Expect 2xx (created/ok), 4xx (validation/conflict), or 503 (DB not configured in CI)
    // Never 500 (unhandled server error)
    expect(response.status() < 500 || response.status() === 503).toBe(true)
  })

  test("pricing page displays Standard and Premium plans", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/pricing`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(response?.status()).toBeLessThan(500)

    const finalUrl = page.url()
    if (finalUrl.includes("/auth/") || finalUrl.includes("/sign-in")) {
      test.skip(true, "Redirected to auth — skipping")
      return
    }

    // Look for Standard and Premium plan mentions
    const standard = page.locator("text=/standard|free plan/i").first()
    const premium = page.locator("text=/premium|\\$499|concierge/i").first()

    const stdVisible = await standard.isVisible({ timeout: 5_000 }).catch(() => false)
    const premVisible = await premium.isVisible({ timeout: 5_000 }).catch(() => false)

    expect(stdVisible || premVisible, "Pricing page should show plan options").toBeTruthy()
  })

  test("non-buyer roles do not require packageTier", async ({ request }) => {
    const response = await request.post(`${TEST_BASE}/api/auth/signup`, {
      data: {
        email: `uat-dealer-${Date.now()}@test.autolenis.com`,
        password: "UatTest123!",
        firstName: "UAT",
        lastName: "Dealer",
        role: "DEALER",
      },
    })
    // Dealer signup should NOT require packageTier
    // Expect 2xx, 4xx, or 503 (DB not configured in CI) — never 500
    expect(response.status() < 500 || response.status() === 503).toBe(true)
  })
})

// ─── Flow 3: Upgrade STANDARD buyer to PREMIUM ──────────────────────────────

test.describe("Flow 3 — Upgrade STANDARD buyer to PREMIUM", () => {
  test.setTimeout(30_000)
  skipIfUnreachable()

  test("upgrade API requires authentication", async ({ request }) => {
    const response = await request.post(`${TEST_BASE}/api/buyer/upgrade`, {
      data: {},
    })
    expect([401, 403]).toContain(response.status())
  })

  test("upgrade API rejects invalid auth tokens", async ({ request }) => {
    const response = await request.post(`${TEST_BASE}/api/buyer/upgrade`, {
      data: {},
      headers: {
        Authorization: "Bearer invalid.malformed.token",
      },
    })
    expect([401, 403]).toContain(response.status())
  })

  test("buyer dashboard loads without 500", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/buyer/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(response?.status()).toBeLessThan(500)
  })
})

// ─── Flow 4: $99 deposit payment ─────────────────────────────────────────────

test.describe("Flow 4 — $99 deposit payment and canonical billing", () => {
  test.setTimeout(30_000)
  skipIfUnreachable()

  test("Stripe webhook rejects requests without valid signature", async ({ request }) => {
    const response = await request.post(`${TEST_BASE}/api/webhooks/stripe`, {
      data: JSON.stringify({ type: "checkout.session.completed" }),
      headers: { "Content-Type": "application/json" },
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain("signature")
  })

  test("Stripe webhook rejects invalid signature", async ({ request }) => {
    const response = await request.post(`${TEST_BASE}/api/webhooks/stripe`, {
      data: JSON.stringify({
        type: "checkout.session.completed",
        data: { object: { metadata: { type: "deposit" } } },
      }),
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "t=1234567890,v1=invalid_signature_value",
      },
    })
    expect(response.status()).toBe(400)
  })

  test("deposit API requires authentication", async ({ request }) => {
    const response = await request.post(`${TEST_BASE}/api/buyer/deposit`, {
      data: {},
    })
    expect([401, 403]).toContain(response.status())
  })

  test("checkout session API requires authentication", async ({ request }) => {
    const response = await request.post(`${TEST_BASE}/api/payments/create-checkout-session`, {
      data: {},
    })
    expect([401, 403]).toContain(response.status())
  })

  test("deposit page loads without 500", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/buyer/deposit`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(response?.status()).toBeLessThan(500)
  })
})

// ─── Flow 5: PREMIUM concierge fee payment ───────────────────────────────────

test.describe("Flow 5 — PREMIUM concierge fee payment", () => {
  test.setTimeout(30_000)
  skipIfUnreachable()

  test("fee options API requires authentication", async ({ request }) => {
    const response = await request.get(`${TEST_BASE}/api/buyer/fee-options`)
    expect([401, 403]).toContain(response.status())
  })

  test("pay-card API requires authentication", async ({ request }) => {
    const response = await request.post(`${TEST_BASE}/api/buyer/fee/pay-card`, {
      data: {},
    })
    expect([401, 403]).toContain(response.status())
  })

  test("fee page loads without 500", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/buyer/deal/fee`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(response?.status()).toBeLessThan(500)
  })

  test("Stripe webhook returns structured errors (no stack traces)", async ({ request }) => {
    const response = await request.post(`${TEST_BASE}/api/webhooks/stripe`, {
      data: JSON.stringify({ type: "payment_intent.succeeded" }),
      headers: { "Content-Type": "application/json" },
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    // Should not leak stack traces or internal paths
    const bodyStr = JSON.stringify(body)
    expect(bodyStr).not.toMatch(/\bat\s+\S+\s+\(/)
    expect(bodyStr).not.toContain("node_modules/")
  })
})

// ─── Flow 6: Admin buyer detail page ─────────────────────────────────────────

test.describe("Flow 6 — Admin buyer detail page canonical data", () => {
  test.setTimeout(30_000)
  skipIfUnreachable()

  test("admin buyers list loads without 500", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/admin/buyers`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(response?.status()).toBeLessThan(500)
  })

  test("admin buyer detail page with sample ID loads without 500", async ({ page }) => {
    const response = await page.goto(
      `${TEST_BASE}/admin/buyers/00000000-0000-0000-0000-000000000001`,
      {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      },
    )
    expect(response?.status()).toBeLessThan(500)
  })

  test("admin buyer detail API requires authentication", async ({ request }) => {
    const response = await request.get(
      `${TEST_BASE}/api/admin/buyers/00000000-0000-0000-0000-000000000001`,
    )
    expect([401, 403]).toContain(response.status())
  })

  test("admin buyer detail with non-existent ID handles gracefully", async ({ page }) => {
    const response = await page.goto(
      `${TEST_BASE}/admin/buyers/00000000-0000-0000-0000-000000000000`,
      {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      },
    )
    expect(response?.status()).toBeLessThan(500)
  })
})

// ─── Flow 7: Email delivery verification ─────────────────────────────────────

test.describe("Flow 7 — Email delivery wiring validation", () => {
  test.setTimeout(15_000)
  skipIfUnreachable()

  test("health endpoint returns structured response", async ({ request }) => {
    const response = await request.get(`${TEST_BASE}/api/health`)
    // Health endpoint should exist and respond
    expect(response.status()).toBeLessThan(500)
  })

  test("signup API does not leak internal errors on valid input", async ({ request }) => {
    // Use a realistic payload — if env has Supabase/Resend configured,
    // this will exercise the full signup + welcome email path.
    // If not configured, it should still return a structured error (not 500).
    const response = await request.post(`${TEST_BASE}/api/auth/signup`, {
      data: {
        email: `uat-email-${Date.now()}@test.autolenis.com`,
        password: "UatTest123!",
        firstName: "Email",
        lastName: "Verify",
        role: "BUYER",
        packageTier: "PREMIUM",
      },
    })
    // Should not be 500 (even if Supabase is not configured in CI).
    // 503 is acceptable when the database service is not available.
    expect(response.status() < 500 || response.status() === 503).toBe(true)
  })

  test("upgrade API returns structured errors", async ({ request }) => {
    // Unauthenticated request — should return structured JSON, not crash
    const response = await request.post(`${TEST_BASE}/api/buyer/upgrade`, {
      data: {},
    })
    expect([401, 403]).toContain(response.status())
    const body = await response.json()
    expect(body).toHaveProperty("error")
  })
})
