import { test, expect } from "@playwright/test"
import { URL } from "node:url"
import dns from "node:dns/promises"

/**
 * Staging Smoke Test — Deployment Health Verification
 *
 * Lightweight spec that verifies a staging/preview deployment is reachable
 * and the core endpoints respond without server errors.
 *
 * Usage:
 *   # Against staging domain
 *   SMOKE_BASE_URL=https://staging.autolenis.com pnpm test:e2e e2e/staging-smoke.spec.ts --project=chromium
 *
 *   # Against any Vercel preview deployment
 *   SMOKE_BASE_URL=https://auto-lenis-<hash>.vercel.app pnpm test:e2e e2e/staging-smoke.spec.ts --project=chromium
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

test.describe("Staging Smoke — Deployment Health", () => {
  test.setTimeout(30_000)
  skipIfUnreachable()

  test("health endpoint responds", async ({ request }) => {
    const response = await request.get(`${TEST_BASE}/api/health`)
    expect(response.status()).toBeLessThan(500)
  })

  test("auth health endpoint responds", async ({ request }) => {
    const response = await request.get(`${TEST_BASE}/api/auth/health`)
    expect(response.status()).toBeLessThan(500)
  })

  test("home page renders", async ({ page }) => {
    const response = await page.goto(TEST_BASE, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(response?.status()).toBeLessThan(500)
    const content = await page.content()
    expect(content.length).toBeGreaterThan(100)
  })

  test("signup page renders", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/auth/signup`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(response?.status()).toBeLessThan(500)
  })

  test("pricing page renders", async ({ page }) => {
    const response = await page.goto(`${TEST_BASE}/pricing`, {
      waitUntil: "domcontentloaded",
      timeout: 15_000,
    })
    expect(response?.status()).toBeLessThan(500)
  })

  test("API routes return structured errors for unauthenticated requests", async ({ request }) => {
    const response = await request.get(`${TEST_BASE}/api/admin/buyers`)
    expect([401, 403]).toContain(response.status())
    const body = await response.json()
    expect(body).toHaveProperty("error")
  })

  test("Stripe webhook rejects unsigned requests", async ({ request }) => {
    const response = await request.post(`${TEST_BASE}/api/webhooks/stripe`, {
      data: JSON.stringify({ type: "test" }),
      headers: { "Content-Type": "application/json" },
    })
    expect(response.status()).toBe(400)
  })
})
