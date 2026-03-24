import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"
import { resolve } from "path"

/**
 * Ensures admin "use client" pages do not export `const dynamic = "force-dynamic"`.
 * That export is only valid on server components; combining it with "use client"
 * causes Turbopack module-graph issues.
 */
describe("Admin Pages — No force-dynamic in client components", () => {
  const adminClientPages = [
    "app/admin/payments/page.tsx",
    "app/admin/payments/affiliate-payments/page.tsx",
    "app/admin/payments/refunds/page.tsx",
    "app/admin/payments/deposits/page.tsx",
    "app/admin/payments/concierge-fees/page.tsx",
    "app/admin/affiliates/payouts/page.tsx",
  ]

  for (const page of adminClientPages) {
    it(`${page} does not combine "use client" with force-dynamic`, () => {
      const fullPath = resolve(__dirname, `../${page}`)
      if (!fs.existsSync(fullPath)) return
      const src = fs.readFileSync(fullPath, "utf-8")
      if (src.includes('"use client"') || src.includes("'use client'")) {
        expect(src).not.toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/)
      }
    })
  }
})

/**
 * Ensures admin pages that make mutation fetch calls (POST/PUT/PATCH/DELETE)
 * include CSRF headers from @/lib/csrf-client.
 *
 * Auth-exempt routes (/api/admin/auth/*) don't need CSRF.
 */
describe("Admin Pages — CSRF headers on mutation fetch calls", () => {
  const adminPagesWithMutations = [
    "app/admin/notifications/page.tsx",
    "app/admin/financial-reporting/page.tsx",
    "app/admin/dealers/[dealerId]/page.tsx",
    "app/admin/dealers/applications/page.tsx",
    "app/admin/documents/page.tsx",
    "app/admin/documents/[documentId]/page.tsx",
    "app/admin/payments/page.tsx",
    "app/admin/payments/affiliate-payments/page.tsx",
    "app/admin/payments/refunds/page.tsx",
    "app/admin/payments/deposits/page.tsx",
    "app/admin/payments/concierge-fees/page.tsx",
    "app/admin/payments/send-link/page.tsx",
    "app/admin/affiliates/page.tsx",
    "app/admin/affiliates/[affiliateId]/page.tsx",
    "app/admin/affiliates/create/page.tsx",
    "app/admin/affiliates/payouts/page.tsx",
    "app/admin/buyers/[buyerId]/page.tsx",
    "app/admin/buyers/create/page.tsx",
    "app/admin/contract-shield/rules/page.tsx",
    "app/admin/contracts/[id]/page.tsx",
    "app/admin/deals/[dealId]/billing/page.tsx",
    "app/admin/deals/[dealId]/insurance/page.tsx",
    "app/admin/external-preapprovals/[submissionId]/page.tsx",
    "app/admin/external-preapprovals/page.tsx",
    "app/admin/payouts/new/page.tsx",
    "app/admin/payouts/payments/page.tsx",
    "app/admin/preapprovals/page.tsx",
    "app/admin/refinance/page.tsx",
    "app/admin/requests/[requestId]/page.tsx",
    "app/admin/settings/page.tsx",
    "app/admin/settings/branding/page.tsx",
    "app/admin/sourcing/[caseId]/page.tsx",
    "app/admin/sourcing/page.tsx",
    "app/admin/users/[userId]/page.tsx",
    "app/admin/users/new/page.tsx",
    "app/admin/seo/audit-dashboard.tsx",
  ]

  for (const page of adminPagesWithMutations) {
    it(`${page} imports csrfHeaders from @/lib/csrf-client`, () => {
      const fullPath = path.resolve(page)
      if (!fs.existsSync(fullPath)) return
      const src = fs.readFileSync(fullPath, "utf-8")
      expect(src).toContain("csrfHeaders")
    })
  }
})

/**
 * Ensures buyer pages that make mutation fetch calls (POST/PUT/PATCH/DELETE)
 * include CSRF headers from @/lib/csrf-client (csrfHeaders or getCsrfToken).
 *
 * Auth-exempt routes (/api/auth/*) don't need CSRF.
 */
describe("Buyer Pages — CSRF headers on mutation fetch calls", () => {
  const buyerPagesWithMutations = [
    "app/buyer/auction/page.tsx",
    "app/buyer/auction/[id]/offers/page.tsx",
    "app/buyer/deal/esign/page.tsx",
    "app/buyer/deal/financing/page.tsx",
    "app/buyer/deal/insurance/bind/page.tsx",
    "app/buyer/deal/insurance/proof/page.tsx",
    "app/buyer/deal/insurance/quote/page.tsx",
    "app/buyer/deal/insurance/quotes/page.tsx",
    "app/buyer/deal/pickup/page.tsx",
    "app/buyer/demo/page.tsx",
    "app/buyer/documents/page.tsx",
    "app/buyer/insurance/page.tsx",
    "app/buyer/onboarding/page.tsx",
    "app/buyer/pickup/[dealId]/page.tsx",
    "app/buyer/prequal/page.tsx",
    "app/buyer/prequal/manual-preapproval/page.tsx",
    "app/buyer/profile/page.tsx",
    "app/buyer/referrals/page.tsx",
    "app/buyer/requests/[caseId]/page.tsx",
    "app/buyer/requests/new/page.tsx",
    "app/buyer/search/page.tsx",
    "app/buyer/settings/page.tsx",
    "app/buyer/shortlist/page.tsx",
    "app/buyer/sign/[dealId]/page.tsx",
    "app/buyer/trade-in/page.tsx",
  ]

  for (const page of buyerPagesWithMutations) {
    it(`${page} uses csrfHeaders or getCsrfToken from @/lib/csrf-client`, () => {
      const fullPath = path.resolve(page)
      if (!fs.existsSync(fullPath)) return
      const src = fs.readFileSync(fullPath, "utf-8")
      const hasCsrf = src.includes("csrfHeaders") || src.includes("getCsrfToken")
      expect(hasCsrf).toBe(true)
    })
  }
})

/**
 * Ensures dealer pages that make mutation fetch calls (POST/PUT/PATCH/DELETE)
 * include CSRF headers from @/lib/csrf-client (csrfHeaders or getCsrfToken).
 *
 * Auth-exempt routes (/api/auth/*) don't need CSRF.
 */
describe("Dealer Pages — CSRF headers on mutation fetch calls", () => {
  const dealerPagesWithMutations = [
    "app/dealer/auctions/[id]/page.tsx",
    "app/dealer/contracts/[id]/page.tsx",
    "app/dealer/contracts/page.tsx",
    "app/dealer/deals/[dealId]/insurance/page.tsx",
    "app/dealer/documents/page.tsx",
    "app/dealer/inventory/page.tsx",
    "app/dealer/inventory/add/page.tsx",
    "app/dealer/inventory/bulk-upload/page.tsx",
    "app/dealer/messages/[threadId]/page.tsx",
    "app/dealer/messages/new/page.tsx",
    "app/dealer/offers/new/page.tsx",
    "app/dealer/onboarding/page.tsx",
    "app/dealer/payments/page.tsx",
    "app/dealer/pickups/page.tsx",
    "app/dealer/settings/page.tsx",
  ]

  for (const page of dealerPagesWithMutations) {
    it(`${page} uses csrfHeaders or getCsrfToken from @/lib/csrf-client`, () => {
      const fullPath = path.resolve(page)
      if (!fs.existsSync(fullPath)) return
      const src = fs.readFileSync(fullPath, "utf-8")
      const hasCsrf = src.includes("csrfHeaders") || src.includes("getCsrfToken")
      expect(hasCsrf).toBe(true)
    })
  }
})

/**
 * Ensures affiliate pages that make mutation fetch calls (POST/PUT/PATCH/DELETE)
 * include CSRF headers from @/lib/csrf-client (csrfHeaders or getCsrfToken).
 */
describe("Affiliate Pages — CSRF headers on mutation fetch calls", () => {
  const affiliatePagesWithMutations = [
    "app/affiliate/portal/dashboard/page.tsx",
    "app/affiliate/portal/documents/page.tsx",
    "app/affiliate/portal/onboarding/page.tsx",
    "app/affiliate/portal/payouts/page.tsx",
    "app/affiliate/portal/settings/page.tsx",
  ]

  for (const page of affiliatePagesWithMutations) {
    it(`${page} uses csrfHeaders or getCsrfToken from @/lib/csrf-client`, () => {
      const fullPath = path.resolve(page)
      if (!fs.existsSync(fullPath)) return
      const src = fs.readFileSync(fullPath, "utf-8")
      const hasCsrf = src.includes("csrfHeaders") || src.includes("getCsrfToken")
      expect(hasCsrf).toBe(true)
    })
  }
})
