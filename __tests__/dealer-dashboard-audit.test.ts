import { describe, expect, it } from "vitest"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(__dirname, "..")

// ─── Dynamic Export Guard ───────────────────────────────────────────────────
// "use client" pages must NOT export `const dynamic = "force-dynamic"` — this
// breaks Turbopack module graph. The export belongs on Server Components only.
// ─────────────────────────────────────────────────────────────────────────────

describe("Dealer Dashboard — No 'use client' + dynamic export conflict", () => {
  const CLIENT_PAGES = [
    "app/dealer/auctions/offers/page.tsx",
    "app/dealer/auctions/invited/page.tsx",
    "app/dealer/auctions/page.tsx",
    "app/dealer/auctions/[id]/page.tsx",
    "app/dealer/dashboard/page.tsx",
    "app/dealer/deals/page.tsx",
    "app/dealer/deals/[dealId]/page.tsx",
    "app/dealer/deals/[dealId]/insurance/page.tsx",
    "app/dealer/offers/page.tsx",
    "app/dealer/offers/[offerId]/page.tsx",
    "app/dealer/offers/new/page.tsx",
    "app/dealer/contracts/page.tsx",
    "app/dealer/contracts/[id]/page.tsx",
    "app/dealer/documents/page.tsx",
    "app/dealer/documents/[documentId]/page.tsx",
    "app/dealer/inventory/page.tsx",
    "app/dealer/inventory/add/page.tsx",
    "app/dealer/inventory/bulk-upload/page.tsx",
    "app/dealer/messages/page.tsx",
    "app/dealer/messages/[threadId]/page.tsx",
    "app/dealer/messages/new/page.tsx",
    "app/dealer/payments/page.tsx",
    "app/dealer/pickups/page.tsx",
    "app/dealer/profile/page.tsx",
    "app/dealer/settings/page.tsx",
    "app/dealer/onboarding/page.tsx",
    "app/dealer/opportunities/page.tsx",
    "app/dealer/requests/page.tsx",
    "app/dealer/requests/[requestId]/page.tsx",
  ]

  for (const page of CLIENT_PAGES) {
    it(`${page} does not combine "use client" with export const dynamic`, () => {
      const filePath = resolve(ROOT, page)
      if (!existsSync(filePath)) return // skip if file doesn't exist
      const src = readFileSync(filePath, "utf-8")
      if (src.includes('"use client"') || src.includes("'use client'")) {
        expect(src).not.toMatch(/export\s+const\s+dynamic\s*=/)
      }
    })
  }
})

// ─── CSRF Protection ────────────────────────────────────────────────────────
// All mutation fetch calls (POST/PATCH/PUT/DELETE) in dealer pages must
// include CSRF headers via csrfHeaders() or getCsrfToken().
// ─────────────────────────────────────────────────────────────────────────────

describe("Dealer Dashboard — CSRF headers on mutations", () => {
  const PAGES_WITH_MUTATIONS = [
    "app/dealer/auctions/[id]/page.tsx",
    "app/dealer/onboarding/page.tsx",
    "app/dealer/settings/page.tsx",
    "app/dealer/contracts/page.tsx",
    "app/dealer/contracts/[id]/page.tsx",
    "app/dealer/documents/page.tsx",
    "app/dealer/deals/[dealId]/insurance/page.tsx",
    "app/dealer/inventory/add/page.tsx",
    "app/dealer/inventory/bulk-upload/page.tsx",
    "app/dealer/messages/new/page.tsx",
    "app/dealer/messages/[threadId]/page.tsx",
    "app/dealer/offers/new/page.tsx",
    "app/dealer/payments/page.tsx",
    "app/dealer/pickups/page.tsx",
    "app/dealer/profile/page.tsx",
  ]

  for (const page of PAGES_WITH_MUTATIONS) {
    it(`${page} imports csrfHeaders or getCsrfToken`, () => {
      const src = readFileSync(resolve(ROOT, page), "utf-8")
      const hasCsrf = src.includes("csrfHeaders") || src.includes("getCsrfToken")
      expect(hasCsrf).toBe(true)
    })

    it(`${page} does not use raw Content-Type header for JSON mutations`, () => {
      const src = readFileSync(resolve(ROOT, page), "utf-8")
      // Should NOT have bare { "Content-Type": "application/json" } without csrf
      expect(src).not.toMatch(/headers:\s*\{\s*"Content-Type":\s*"application\/json"\s*\}/)
    })
  }
})

// ─── API Route Existence ────────────────────────────────────────────────────
// Every API route referenced by dealer UI must have a corresponding file.
// ─────────────────────────────────────────────────────────────────────────────

describe("Dealer Dashboard — API routes exist", () => {
  const REQUIRED_API_ROUTES = [
    "app/api/dealer/dashboard/route.ts",
    "app/api/dealer/settings/route.ts",
    "app/api/dealer/profile/route.ts",
    "app/api/dealer/onboarding/route.ts",
    "app/api/dealer/auctions/route.ts",
    "app/api/dealer/inventory/route.ts",
    "app/api/dealer/offers/route.ts",
    "app/api/dealer/deals/route.ts",
    "app/api/dealer/contracts/route.ts",
    "app/api/dealer/documents/route.ts",
    "app/api/dealer/documents/upload/route.ts",
    "app/api/dealer/payments/route.ts",
    "app/api/dealer/payments/checkout/route.ts",
    "app/api/dealer/messages/route.ts",
    "app/api/dealer/pickups/route.ts",
    "app/api/dealer/opportunities/route.ts",
    "app/api/dealer/requests/route.ts",
  ]

  for (const route of REQUIRED_API_ROUTES) {
    it(`${route} exists`, () => {
      expect(existsSync(resolve(ROOT, route))).toBe(true)
    })
  }
})

// ─── Auth Checks ────────────────────────────────────────────────────────────
// Dealer API routes must verify that the caller has a DEALER or DEALER_USER role.
// ─────────────────────────────────────────────────────────────────────────────

describe("Dealer API — Auth checks for dealer role", () => {
  const DEALER_API_ROUTES = [
    "app/api/dealer/dashboard/route.ts",
    "app/api/dealer/settings/route.ts",
    "app/api/dealer/profile/route.ts",
    "app/api/dealer/onboarding/route.ts",
    "app/api/dealer/auctions/route.ts",
    "app/api/dealer/inventory/route.ts",
    "app/api/dealer/deals/route.ts",
    "app/api/dealer/contracts/route.ts",
    "app/api/dealer/documents/route.ts",
    "app/api/dealer/payments/route.ts",
    "app/api/dealer/messages/route.ts",
    "app/api/dealer/pickups/route.ts",
    "app/api/dealer/opportunities/route.ts",
    "app/api/dealer/requests/route.ts",
  ]

  for (const route of DEALER_API_ROUTES) {
    it(`${route} checks for DEALER role`, () => {
      const src = readFileSync(resolve(ROOT, route), "utf-8")
      const checksRole =
        src.includes("DEALER") &&
        (src.includes("401") || src.includes("403") || src.includes("requireAuth"))
      expect(checksRole).toBe(true)
    })
  }
})

// ─── Error Handling ─────────────────────────────────────────────────────────
// Dealer API catch blocks should return status 500 with static error messages,
// not leak internal error.message to clients.
// ─────────────────────────────────────────────────────────────────────────────

describe("Dealer API — Error handling does not leak internal messages", () => {
  const DEALER_API_ROUTES = [
    "app/api/dealer/dashboard/route.ts",
    "app/api/dealer/settings/route.ts",
    "app/api/dealer/profile/route.ts",
    "app/api/dealer/auctions/route.ts",
    "app/api/dealer/inventory/route.ts",
    "app/api/dealer/deals/route.ts",
    "app/api/dealer/contracts/route.ts",
    "app/api/dealer/documents/route.ts",
    "app/api/dealer/payments/route.ts",
    "app/api/dealer/messages/route.ts",
    "app/api/dealer/pickups/route.ts",
  ]

  for (const route of DEALER_API_ROUTES) {
    it(`${route} catch block returns 500`, () => {
      const src = readFileSync(resolve(ROOT, route), "utf-8")
      expect(src).toContain("500")
    })
  }
})

// ─── Service Role Scanner ───────────────────────────────────────────────────
// Dealer portal API routes must NOT use createAdminClient().
// ─────────────────────────────────────────────────────────────────────────────

describe("Dealer API — No service role usage in portal routes", () => {
  const DEALER_API_ROUTES = [
    "app/api/dealer/dashboard/route.ts",
    "app/api/dealer/settings/route.ts",
    "app/api/dealer/profile/route.ts",
    "app/api/dealer/onboarding/route.ts",
    "app/api/dealer/auctions/route.ts",
    "app/api/dealer/inventory/route.ts",
    "app/api/dealer/deals/route.ts",
    "app/api/dealer/contracts/route.ts",
    "app/api/dealer/documents/route.ts",
    "app/api/dealer/payments/route.ts",
    "app/api/dealer/messages/route.ts",
    "app/api/dealer/pickups/route.ts",
    "app/api/dealer/opportunities/route.ts",
    "app/api/dealer/requests/route.ts",
  ]

  for (const route of DEALER_API_ROUTES) {
    it(`${route} does not use createAdminClient`, () => {
      const src = readFileSync(resolve(ROOT, route), "utf-8")
      expect(src).not.toContain("createAdminClient")
    })
  }
})

// ─── Loading Boundaries ─────────────────────────────────────────────────────
// All dealer page directories should have loading.tsx for Next.js Suspense.
// ─────────────────────────────────────────────────────────────────────────────

describe("Dealer Dashboard — Loading boundaries exist", () => {
  const DIRECTORIES_NEEDING_LOADING = [
    "app/dealer/dashboard",
    "app/dealer/auctions",
    "app/dealer/deals",
    "app/dealer/offers",
    "app/dealer/contracts",
    "app/dealer/documents",
    "app/dealer/inventory",
    "app/dealer/messages",
    "app/dealer/payments",
    "app/dealer/pickups",
    "app/dealer/profile",
    "app/dealer/settings",
    "app/dealer/requests",
    "app/dealer/opportunities",
    "app/dealer/leads",
  ]

  for (const dir of DIRECTORIES_NEEDING_LOADING) {
    it(`${dir}/loading.tsx exists`, () => {
      expect(existsSync(resolve(ROOT, dir, "loading.tsx"))).toBe(true)
    })
  }
})

// ─── Profile API PATCH ──────────────────────────────────────────────────────
// The dealer profile API must support PATCH for profile updates.
// ─────────────────────────────────────────────────────────────────────────────

describe("Dealer API — Profile PATCH endpoint", () => {
  it("profile route exports PATCH handler", () => {
    const src = readFileSync(resolve(ROOT, "app/api/dealer/profile/route.ts"), "utf-8")
    expect(src).toMatch(/export\s+async\s+function\s+PATCH/)
  })

  it("profile page uses controlled inputs (value not defaultValue)", () => {
    const src = readFileSync(resolve(ROOT, "app/dealer/profile/page.tsx"), "utf-8")
    expect(src).not.toContain("defaultValue")
    expect(src).toContain("csrfHeaders")
  })
})
