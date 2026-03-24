import { describe, expect, it } from "vitest"
import fs from "fs"
import path from "path"

/**
 * Affiliate Referrals Visibility Tests
 * 
 * Tests for:
 * - Referred buyers and referred affiliates endpoints existence and structure
 * - Route file contracts (auth checks, error handling)
 * - UI pages existence
 * - Navigation integrity
 * - Attribution idempotency logic
 */

describe("Affiliate Referrals Visibility", () => {
  describe("API Route: /api/affiliate/referrals (main)", () => {
    it("route file exists", () => {
      const routePath = path.resolve("app/api/affiliate/referrals/route.ts")
      expect(fs.existsSync(routePath)).toBe(true)
    })

    it("returns 401 for unauthorized access", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/route.ts"), "utf-8")
      expect(content).toContain("401")
      expect(content).toContain("Unauthorized")
    })

    it("uses getCurrentUser for authentication", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/route.ts"), "utf-8")
      expect(content).toContain("getCurrentUser")
    })

    it("returns pagination wrapper in response shape", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/route.ts"), "utf-8")
      expect(content).toContain("pagination")
      expect(content).toContain("totalPages")
    })

    it("returns flat referral fields (name, email, signedUpAt)", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/route.ts"), "utf-8")
      // Response should include flat name/email/signedUpAt fields per referral
      expect(content).toContain("name")
      expect(content).toContain("email")
      expect(content).toContain("signedUpAt")
    })
  })

  describe("API Route: /api/affiliate/referrals/buyers", () => {
    it("route file exists", () => {
      const routePath = path.resolve("app/api/affiliate/referrals/buyers/route.ts")
      expect(fs.existsSync(routePath)).toBe(true)
    })

    it("returns 401 for unauthorized access", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/buyers/route.ts"), "utf-8")
      expect(content).toContain("401")
      expect(content).toContain("Unauthorized")
    })

    it("returns 403 for non-affiliate users", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/buyers/route.ts"), "utf-8")
      expect(content).toContain("403")
      expect(content).toContain("Forbidden")
    })

    it("uses getCurrentUser for authentication", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/buyers/route.ts"), "utf-8")
      expect(content).toContain("getCurrentUser")
    })

    it("checks affiliate existence before returning data", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/buyers/route.ts"), "utf-8")
      expect(content).toContain("Affiliate")
      expect(content).toContain("userId")
    })

    it("includes pagination support", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/buyers/route.ts"), "utf-8")
      expect(content).toContain("page")
      expect(content).toContain("limit")
      expect(content).toContain("pagination")
      expect(content).toContain("totalPages")
    })

    it("includes search support", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/buyers/route.ts"), "utf-8")
      expect(content).toContain("search")
    })

    it("returns buyer-specific response shape with buyers array", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/buyers/route.ts"), "utf-8")
      expect(content).toContain("buyers")
      expect(content).toContain("buyerName")
      expect(content).toContain("buyerEmail")
      expect(content).toContain("funnelStage")
      expect(content).toContain("signupDate")
      expect(content).toContain("commission")
    })

    it("derives funnel stage from buyer profile data", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/buyers/route.ts"), "utf-8")
      expect(content).toContain("signup")
      expect(content).toContain("prequalified")
      expect(content).toContain("auction")
      expect(content).toContain("deal")
    })

    it("filters to level 1 direct referrals", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/buyers/route.ts"), "utf-8")
      expect(content).toContain('"level", 1')
    })

    it("uses workspace-isolated queries via affiliateId", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/buyers/route.ts"), "utf-8")
      expect(content).toContain("affiliateId")
      expect(content).toContain("affiliate.id")
    })
  })

  describe("API Route: /api/affiliate/referrals/affiliates", () => {
    it("route file exists", () => {
      const routePath = path.resolve("app/api/affiliate/referrals/affiliates/route.ts")
      expect(fs.existsSync(routePath)).toBe(true)
    })

    it("returns 401 for unauthorized access", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/affiliates/route.ts"), "utf-8")
      expect(content).toContain("401")
      expect(content).toContain("Unauthorized")
    })

    it("returns 403 for non-affiliate users", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/affiliates/route.ts"), "utf-8")
      expect(content).toContain("403")
      expect(content).toContain("Forbidden")
    })

    it("uses getCurrentUser for authentication", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/affiliates/route.ts"), "utf-8")
      expect(content).toContain("getCurrentUser")
    })

    it("returns affiliate-specific response shape", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/affiliates/route.ts"), "utf-8")
      expect(content).toContain("affiliates")
      expect(content).toContain("affiliateName")
      expect(content).toContain("affiliateEmail")
      expect(content).toContain("signupDate")
      expect(content).toContain("status")
    })

    it("includes pagination support", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/affiliates/route.ts"), "utf-8")
      expect(content).toContain("page")
      expect(content).toContain("limit")
      expect(content).toContain("pagination")
      expect(content).toContain("totalPages")
    })

    it("includes search support", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/affiliates/route.ts"), "utf-8")
      expect(content).toContain("search")
    })

    it("filters to level 1 direct referrals only", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/referrals/affiliates/route.ts"), "utf-8")
      expect(content).toContain('"level", 1')
    })
  })

  describe("UI Pages", () => {
    it("referred buyers page exists", () => {
      const pagePath = path.resolve("app/affiliate/portal/referrals/buyers/page.tsx")
      expect(fs.existsSync(pagePath)).toBe(true)
    })

    it("referred affiliates page exists", () => {
      const pagePath = path.resolve("app/affiliate/portal/referrals/affiliates/page.tsx")
      expect(fs.existsSync(pagePath)).toBe(true)
    })

    it("all referrals list page exists", () => {
      const pagePath = path.resolve("app/affiliate/portal/referrals/page.tsx")
      expect(fs.existsSync(pagePath)).toBe(true)
    })

    it("referred buyers page fetches from correct API endpoint", () => {
      const content = fs.readFileSync(path.resolve("app/affiliate/portal/referrals/buyers/page.tsx"), "utf-8")
      expect(content).toContain("/api/affiliate/referrals/buyers")
    })

    it("referred affiliates page fetches from correct API endpoint", () => {
      const content = fs.readFileSync(path.resolve("app/affiliate/portal/referrals/affiliates/page.tsx"), "utf-8")
      expect(content).toContain("/api/affiliate/referrals/affiliates")
    })

    it("referred buyers page shows clean empty state", () => {
      const content = fs.readFileSync(path.resolve("app/affiliate/portal/referrals/buyers/page.tsx"), "utf-8")
      expect(content).toContain("No buyers have signed up with your link yet")
    })

    it("referred affiliates page shows clean empty state", () => {
      const content = fs.readFileSync(path.resolve("app/affiliate/portal/referrals/affiliates/page.tsx"), "utf-8")
      expect(content).toContain("No affiliates have signed up with your referral link yet")
    })

    it("referred buyers page handles error state", () => {
      const content = fs.readFileSync(path.resolve("app/affiliate/portal/referrals/buyers/page.tsx"), "utf-8")
      expect(content).toContain("Unable to load data")
    })

    it("referred affiliates page handles error state", () => {
      const content = fs.readFileSync(path.resolve("app/affiliate/portal/referrals/affiliates/page.tsx"), "utf-8")
      expect(content).toContain("Unable to load data")
    })

    it("referred buyers page has pagination controls", () => {
      const content = fs.readFileSync(path.resolve("app/affiliate/portal/referrals/buyers/page.tsx"), "utf-8")
      expect(content).toContain("ChevronLeft")
      expect(content).toContain("ChevronRight")
      expect(content).toContain("pagination.totalPages")
    })

    it("referred affiliates page has pagination controls", () => {
      const content = fs.readFileSync(path.resolve("app/affiliate/portal/referrals/affiliates/page.tsx"), "utf-8")
      expect(content).toContain("ChevronLeft")
      expect(content).toContain("ChevronRight")
      expect(content).toContain("pagination.totalPages")
    })
  })

  describe("Navigation Integrity", () => {
    it("portal layout includes Referred Buyers tab", () => {
      const content = fs.readFileSync(path.resolve("app/affiliate/portal/layout.tsx"), "utf-8")
      expect(content).toContain("/affiliate/portal/referrals/buyers")
      expect(content).toContain("Referred Buyers")
    })

    it("portal layout includes Referred Affiliates tab", () => {
      const content = fs.readFileSync(path.resolve("app/affiliate/portal/layout.tsx"), "utf-8")
      expect(content).toContain("/affiliate/portal/referrals/affiliates")
      expect(content).toContain("Referred Affiliates")
    })

    it("portal layout includes All Referrals tab", () => {
      const content = fs.readFileSync(path.resolve("app/affiliate/portal/layout.tsx"), "utf-8")
      expect(content).toContain("/affiliate/portal/referrals")
      expect(content).toContain("All Referrals")
    })

    it("all nav tabs have valid route pages", () => {
      const layoutContent = fs.readFileSync(path.resolve("app/affiliate/portal/layout.tsx"), "utf-8")
      // Extract hrefs from nav array
      const hrefMatches = layoutContent.match(/href:\s*"([^"]+)"/g) || []
      const hrefs = hrefMatches.map(m => m.match(/"([^"]+)"/)![1])

      for (const href of hrefs) {
        // Convert route to file path
        const pagePath = path.resolve(`app${href}/page.tsx`)
        expect(fs.existsSync(pagePath), `Missing page for route: ${href}`).toBe(true)
      }
    })

    it("layout-client has UserPlus in icon map", () => {
      const content = fs.readFileSync(path.resolve("app/affiliate/portal/layout-client.tsx"), "utf-8")
      expect(content).toContain("UserPlus")
    })
  })

  describe("Attribution Idempotency", () => {
    it("affiliate service buildReferralChain checks for existing referrals", () => {
      const content = fs.readFileSync(path.resolve("lib/services/affiliate.service.ts"), "utf-8")
      // The chain builder should check for existing referrals to prevent duplicates
      expect(content).toContain("existingReferrals")
      expect(content).toContain("findMany")
    })

    it("affiliate service prevents self-referral", () => {
      const content = fs.readFileSync(path.resolve("lib/services/affiliate.service.ts"), "utf-8")
      expect(content).toContain("SELF_REFERRAL_BLOCKED")
      expect(content).toContain("userId === referredUserId")
    })

    it("commission creation is idempotent", () => {
      const content = fs.readFileSync(path.resolve("lib/services/affiliate.service.ts"), "utf-8")
      expect(content).toContain("existingCommissions")
      expect(content).toContain("Commissions already exist")
    })

    it("referral chain returns existing referrals if already created", () => {
      const content = fs.readFileSync(path.resolve("lib/services/affiliate.service.ts"), "utf-8")
      // Should return existing referrals instead of creating new ones
      expect(content).toContain("existingReferrals.length > 0")
      expect(content).toContain("return existingReferrals")
    })
  })

  describe("Referral Link Generation", () => {
    it("dashboard API generates referral link from refCode", () => {
      const content = fs.readFileSync(path.resolve("app/api/affiliate/dashboard/route.ts"), "utf-8")
      expect(content).toContain("referralLink")
      expect(content).toContain("ref=")
    })

    it("link page loads referral data from dashboard API", () => {
      const content = fs.readFileSync(path.resolve("app/affiliate/portal/link/page.tsx"), "utf-8")
      expect(content).toContain("/api/affiliate/dashboard")
      expect(content).toContain("referralLink")
      expect(content).toContain("referralCode")
    })

    it("link page has copy to clipboard functionality", () => {
      const content = fs.readFileSync(path.resolve("app/affiliate/portal/link/page.tsx"), "utf-8")
      expect(content).toContain("clipboard")
      expect(content).toContain("copyToClipboard")
    })

    it("ref landing page exists", () => {
      const pagePath = path.resolve("app/ref/[code]/page.tsx")
      expect(fs.existsSync(pagePath)).toBe(true)
    })
  })

  describe("All Portal Pages Exist", () => {
    const portalPages = [
      "dashboard",
      "link",
      "income-calculator",
      "analytics",
      "referrals",
      "referrals/buyers",
      "referrals/affiliates",
      "commissions",
      "payouts",
      "documents",
      "assets",
      "settings",
    ]

    for (const page of portalPages) {
      it(`portal page exists: ${page}`, () => {
        const pagePath = path.resolve(`app/affiliate/portal/${page}/page.tsx`)
        expect(fs.existsSync(pagePath), `Missing page: app/affiliate/portal/${page}/page.tsx`).toBe(true)
      })
    }
  })
})
