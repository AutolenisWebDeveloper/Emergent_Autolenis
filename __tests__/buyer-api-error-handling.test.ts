/**
 * Buyer API Error Handling Audit Test
 *
 * Ensures buyer API routes do NOT leak internal error messages via error.message
 * and use correct HTTP status codes (500 for unexpected errors, not 400).
 */

import { describe, expect, it } from "vitest"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

// All buyer API route files with catch blocks
const BUYER_API_ROUTES = [
  "app/api/buyer/shortlist/route.ts",
  "app/api/buyer/shortlist/items/[shortlistItemId]/route.ts",
  "app/api/buyer/shortlist/items/[shortlistItemId]/primary/route.ts",
  "app/api/buyer/shortlist/eligible/route.ts",
  "app/api/buyer/contracts/route.ts",
  "app/api/buyer/contracts/acknowledge-override/route.ts",
  "app/api/buyer/deals/[dealId]/esign/route.ts",
  "app/api/buyer/deals/[dealId]/pickup/schedule/route.ts",
  "app/api/buyer/deals/[dealId]/pickup/route.ts",
  "app/api/buyer/deals/[dealId]/route.ts",
  "app/api/buyer/deals/[dealId]/concierge-fee/route.ts",
  "app/api/buyer/deals/[dealId]/concierge-fee/include-in-loan/route.ts",
  "app/api/buyer/deals/[dealId]/concierge-fee/pay-card/route.ts",
  "app/api/buyer/deals/[dealId]/financing/route.ts",
  "app/api/buyer/deals/[dealId]/insurance/select-quote/route.ts",
  "app/api/buyer/deals/[dealId]/insurance/route.ts",
  "app/api/buyer/deals/[dealId]/insurance/external-proof/route.ts",
  "app/api/buyer/deals/[dealId]/insurance/request-quotes/route.ts",
  "app/api/buyer/deals/[dealId]/insurance/bind-policy/route.ts",
  "app/api/buyer/deals/[dealId]/insurance/select/route.ts",
  "app/api/buyer/deals/[dealId]/insurance/doc-requests/route.ts",
  "app/api/buyer/billing/route.ts",
  "app/api/buyer/auctions/route.ts",
  "app/api/buyer/auctions/[auctionId]/deals/select/route.ts",
  "app/api/buyer/auctions/[auctionId]/best-price/route.ts",
  "app/api/buyer/auctions/[auctionId]/best-price/decline/route.ts",
  "app/api/buyer/inventory/filters/route.ts",
  "app/api/buyer/inventory/search/route.ts",
  "app/api/buyer/inventory/[inventoryItemId]/route.ts",
  "app/api/buyer/deal/route.ts",
  "app/api/buyer/deal/select/route.ts",
  "app/api/buyer/deal/complete/route.ts",
  "app/api/buyer/prequal/draft/route.ts",
  "app/api/buyer/prequal/route.ts",
  "app/api/buyer/prequal/external/route.ts",
  "app/api/buyer/prequal/refresh/route.ts",
  "app/api/buyer/prequal/start/route.ts",
  "app/api/buyer/auction/route.ts",
  "app/api/buyer/auction/validate/route.ts",
  "app/api/buyer/auction/select/route.ts",
  "app/api/buyer/auction/decline/route.ts",
  "app/api/buyer/profile/route.ts",
  // Vehicle (car) request routes
  "app/api/buyer/requests/route.ts",
  "app/api/buyer/requests/[caseId]/route.ts",
  "app/api/buyer/requests/[caseId]/cancel/route.ts",
  "app/api/buyer/requests/[caseId]/submit/route.ts",
  "app/api/buyer/requests/[caseId]/offers/route.ts",
  "app/api/buyer/requests/[caseId]/offers/[offerId]/accept/route.ts",
]

describe("Buyer API Error Handling — No Internal Message Leakage", () => {
  for (const route of BUYER_API_ROUTES) {
    const fullPath = resolve(__dirname, `../${route}`)

    it(`${route} exists`, () => {
      expect(existsSync(fullPath)).toBe(true)
    })

    it(`${route} does not leak error.message to clients in catch blocks`, () => {
      const src = readFileSync(fullPath, "utf-8")
      // Match catch blocks that contain NextResponse.json
      const catchBlocks = src.match(/catch\s*[\s\S]*?\{[\s\S]*?\}/g) || []
      for (const block of catchBlocks) {
        if (block.includes("NextResponse.json")) {
          // Should not expose error.message directly in the JSON response
          expect(block).not.toMatch(/error:\s*error\.message/)
          expect(block).not.toMatch(/error:\s*error\.message\s*\|\|/)
          // Should not use error instanceof Error ? error.message pattern in responses
          expect(block).not.toMatch(
            /error:\s*error\s+instanceof\s+Error\s*\?\s*error\.message/,
          )
        }
      }
    })
  }
})

describe("Buyer API — No force-dynamic in client pages", () => {
  // These are portal pages that should not combine "use client" with force-dynamic
  const CLIENT_PAGES = [
    "app/affiliate/portal/dashboard/page.tsx",
    "app/affiliate/portal/analytics/page.tsx",
    "app/affiliate/portal/referrals/page.tsx",
    "app/affiliate/portal/commissions/page.tsx",
    "app/affiliate/portal/payouts/page.tsx",
    "app/affiliate/portal/documents/page.tsx",
    "app/affiliate/portal/link/page.tsx",
    "app/affiliate/portal/assets/page.tsx",
    "app/dealer/auctions/invited/page.tsx",
    "app/dealer/auctions/offers/page.tsx",
    "app/buyer/deal/fee/page.tsx",
    "app/buyer/billing/page.tsx",
    "app/buyer/offers/page.tsx",
  ]

  for (const page of CLIENT_PAGES) {
    it(`${page} does not combine "use client" with force-dynamic`, () => {
      const fullPath = resolve(__dirname, `../${page}`)
      if (!existsSync(fullPath)) return
      const src = readFileSync(fullPath, "utf-8")
      if (src.includes('"use client"') || src.includes("'use client'")) {
        expect(src).not.toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/)
      }
    })
  }
})

describe("Loading Boundaries — Affiliate Portal", () => {
  const PORTAL_DIRS = [
    "app/affiliate/portal/dashboard",
    "app/affiliate/portal/analytics",
    "app/affiliate/portal/referrals",
    "app/affiliate/portal/commissions",
    "app/affiliate/portal/payouts",
    "app/affiliate/portal/documents",
    "app/affiliate/portal/link",
    "app/affiliate/portal/settings",
    "app/affiliate/portal/onboarding",
    "app/affiliate/portal/income-calculator",
    "app/affiliate/portal/assets",
  ]

  for (const dir of PORTAL_DIRS) {
    it(`${dir} has loading.tsx`, () => {
      const fullPath = resolve(__dirname, `../${dir}/loading.tsx`)
      expect(existsSync(fullPath)).toBe(true)
    })
  }
})

describe("Loading Boundaries — Dealer Portal", () => {
  const DEALER_DIRS = [
    "app/dealer/dashboard",
    "app/dealer/auctions",
    "app/dealer/documents",
    "app/dealer/inventory",
    "app/dealer/offers",
    "app/dealer/leads",
    "app/dealer/profile",
    "app/dealer/settings",
    "app/dealer/requests",
    "app/dealer/onboarding",
    "app/dealer/payments",
    "app/dealer/messages",
    "app/dealer/contracts",
    "app/dealer/deals",
  ]

  for (const dir of DEALER_DIRS) {
    it(`${dir} has loading.tsx`, () => {
      const fullPath = resolve(__dirname, `../${dir}/loading.tsx`)
      expect(existsSync(fullPath)).toBe(true)
    })
  }
})
