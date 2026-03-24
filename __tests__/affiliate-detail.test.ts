import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"
import { mockSelectors } from "@/lib/mocks/mockStore"

describe("Affiliate Detail Page", () => {
  describe("Route + Param Contract", () => {
    it("page exists at app/admin/affiliates/[affiliateId]/page.tsx", () => {
      const pagePath = path.resolve("app/admin/affiliates/[affiliateId]/page.tsx")
      expect(fs.existsSync(pagePath)).toBe(true)
    })

    it("page uses params.affiliateId (matches folder name)", () => {
      const pagePath = path.resolve("app/admin/affiliates/[affiliateId]/page.tsx")
      const content = fs.readFileSync(pagePath, "utf-8")
      // Must use affiliateId param (not id, slug, or other names)
      expect(content).toContain('affiliateId')
      expect(content).toContain('params')
    })

    it("API route uses affiliateId param from folder name", () => {
      const routePath = path.resolve("app/api/admin/affiliates/[affiliateId]/route.ts")
      expect(fs.existsSync(routePath)).toBe(true)
      const content = fs.readFileSync(routePath, "utf-8")
      expect(content).toContain("affiliateId")
    })
  })

  describe("RBAC - API route uses isAdminRole", () => {
    it("affiliate detail API imports and uses isAdminRole", () => {
      const routePath = path.resolve("app/api/admin/affiliates/[affiliateId]/route.ts")
      const content = fs.readFileSync(routePath, "utf-8")
      expect(content).toContain("isAdminRole")
    })

    it("affiliate detail API returns 401 for unauthorized access", () => {
      const routePath = path.resolve("app/api/admin/affiliates/[affiliateId]/route.ts")
      const content = fs.readFileSync(routePath, "utf-8")
      expect(content).toContain("401")
    })

    it("no hardcoded ADMIN-only role check in detail API", () => {
      const routePath = path.resolve("app/api/admin/affiliates/[affiliateId]/route.ts")
      const content = fs.readFileSync(routePath, "utf-8")
      const lines = content.split("\n")
      const issues: string[] = []
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue
        if (/\.role\s*!==\s*"ADMIN"/.test(trimmed) && !trimmed.includes("SUPER_ADMIN")) {
          issues.push(trimmed)
          break
        }
      }
      expect(issues).toEqual([])
    })
  })

  describe("Workspace isolation - API enforces workspace scoping", () => {
    it("affiliate detail API references workspace_id for scoping", () => {
      const routePath = path.resolve("app/api/admin/affiliates/[affiliateId]/route.ts")
      const content = fs.readFileSync(routePath, "utf-8")
      expect(content).toContain("workspace_id")
    })

    it("affiliate detail API uses workspaceId in query filter", () => {
      const routePath = path.resolve("app/api/admin/affiliates/[affiliateId]/route.ts")
      const content = fs.readFileSync(routePath, "utf-8")
      expect(content).toContain("workspaceId")
      expect(content).toContain(".eq")
    })

    it("affiliate detail API includes correlationId on 500 errors", () => {
      const routePath = path.resolve("app/api/admin/affiliates/[affiliateId]/route.ts")
      const content = fs.readFileSync(routePath, "utf-8")
      expect(content).toContain("correlationId")
      expect(content).toContain("randomUUID")
    })
  })

  describe("Mock data - adminAffiliateDetail selector", () => {
    it("returns detail data for known affiliate", () => {
      const result = mockSelectors.adminAffiliateDetail("affiliate_gold_001")
      expect(result).not.toBeNull()
      expect(result?.affiliate.id).toBe("affiliate_gold_001")
      expect(result?.affiliate.referralCode).toBeTruthy()
    })

    it("returns null for unknown affiliate", () => {
      const result = mockSelectors.adminAffiliateDetail("nonexistent")
      expect(result).toBeNull()
    })

    it("includes clicks data", () => {
      const result = mockSelectors.adminAffiliateDetail("affiliate_gold_001")
      expect(result?.clicks).toBeDefined()
      expect(result?.clicks.length).toBeGreaterThan(0)
    })

    it("includes payouts data", () => {
      const result = mockSelectors.adminAffiliateDetail("affiliate_gold_001")
      expect(result?.payouts).toBeDefined()
      expect(result?.payouts.length).toBeGreaterThan(0)
    })

    it("includes documents data", () => {
      const result = mockSelectors.adminAffiliateDetail("affiliate_gold_001")
      expect(result?.documents).toBeDefined()
      expect(result?.documents.length).toBeGreaterThan(0)
    })

    it("includes audit logs data", () => {
      const result = mockSelectors.adminAffiliateDetail("affiliate_gold_001")
      expect(result?.auditLogs).toBeDefined()
      expect(result?.auditLogs.length).toBeGreaterThan(0)
    })

    it("includes conversion rate", () => {
      const result = mockSelectors.adminAffiliateDetail("affiliate_gold_001")
      expect(result?.affiliate.totalClicks).toBeDefined()
      expect(result?.affiliate.conversionRate).toBeDefined()
      expect(typeof result?.affiliate.conversionRate).toBe("number")
    })
  })

  describe("Page layout", () => {
    it("page has all required tabs", () => {
      const pagePath = path.resolve("app/admin/affiliates/[affiliateId]/page.tsx")
      const content = fs.readFileSync(pagePath, "utf-8")
      expect(content).toContain('"overview"')
      expect(content).toContain('"referrals"')
      expect(content).toContain('"clicks"')
      expect(content).toContain('"commissions"')
      expect(content).toContain('"payouts"')
      expect(content).toContain('"documents"')
      expect(content).toContain('"audit"')
    })

    it("page includes back button linking to affiliates list", () => {
      const pagePath = path.resolve("app/admin/affiliates/[affiliateId]/page.tsx")
      const content = fs.readFileSync(pagePath, "utf-8")
      expect(content).toContain('href="/admin/affiliates"')
      expect(content).toContain("ArrowLeft")
    })

    it("page includes status change dropdown", () => {
      const pagePath = path.resolve("app/admin/affiliates/[affiliateId]/page.tsx")
      const content = fs.readFileSync(pagePath, "utf-8")
      expect(content).toContain("handleStatusChange")
      expect(content).toContain("ACTIVE")
      expect(content).toContain("SUSPENDED")
    })

    it("page includes Initiate Payment action button", () => {
      const pagePath = path.resolve("app/admin/affiliates/[affiliateId]/page.tsx")
      const content = fs.readFileSync(pagePath, "utf-8")
      expect(content).toContain("handleInitiatePayment")
      expect(content).toContain("Initiate Payment")
    })

    it("page displays conversion rate", () => {
      const pagePath = path.resolve("app/admin/affiliates/[affiliateId]/page.tsx")
      const content = fs.readFileSync(pagePath, "utf-8")
      expect(content).toContain("Conversion Rate")
      expect(content).toContain("conversionRate")
    })

    it("page has copy referral link button in header", () => {
      const pagePath = path.resolve("app/admin/affiliates/[affiliateId]/page.tsx")
      const content = fs.readFileSync(pagePath, "utf-8")
      expect(content).toContain("Copy Link")
      expect(content).toContain("copyReferralLink")
    })

    it("page displays total earned stats card", () => {
      const pagePath = path.resolve("app/admin/affiliates/[affiliateId]/page.tsx")
      const content = fs.readFileSync(pagePath, "utf-8")
      expect(content).toContain("Total Earned")
      expect(content).toContain("totalEarnings")
    })

    it("page displays total paid out stats card", () => {
      const pagePath = path.resolve("app/admin/affiliates/[affiliateId]/page.tsx")
      const content = fs.readFileSync(pagePath, "utf-8")
      expect(content).toContain("Total Paid Out")
      expect(content).toContain("paidEarnings")
    })

    it("page displays total clicks stats card", () => {
      const pagePath = path.resolve("app/admin/affiliates/[affiliateId]/page.tsx")
      const content = fs.readFileSync(pagePath, "utf-8")
      expect(content).toContain("Total Clicks")
      expect(content).toContain("totalClicks")
    })

    it("referrals tab shows level and deal link columns", () => {
      const pagePath = path.resolve("app/admin/affiliates/[affiliateId]/page.tsx")
      const content = fs.readFileSync(pagePath, "utf-8")
      // Referrals tab should include Level and Deal columns
      expect(content).toContain("Level")
      expect(content).toContain("Attributed At")
      expect(content).toContain("ref.dealId")
      expect(content).toContain("ref.level")
    })

    it("commissions tab shows deal, level, rate, base amount columns", () => {
      const pagePath = path.resolve("app/admin/affiliates/[affiliateId]/page.tsx")
      const content = fs.readFileSync(pagePath, "utf-8")
      // Commissions tab should include Deal, Rate, Base Amount columns
      expect(content).toContain("comm.dealId")
      expect(content).toContain("comm.level")
      expect(content).toContain("comm.commissionRate")
      expect(content).toContain("comm.baseAmount")
      expect(content).toContain("Base Amount")
      expect(content).toContain("Rate")
    })

    it("payouts tab shows providerRef column", () => {
      const pagePath = path.resolve("app/admin/affiliates/[affiliateId]/page.tsx")
      const content = fs.readFileSync(pagePath, "utf-8")
      expect(content).toContain("Provider Ref")
      expect(content).toContain("payout.providerRef")
    })

    it("clicks tab shows user agent column", () => {
      const pagePath = path.resolve("app/admin/affiliates/[affiliateId]/page.tsx")
      const content = fs.readFileSync(pagePath, "utf-8")
      expect(content).toContain("User Agent")
      expect(content).toContain("click.userAgent")
    })
  })

  describe("Mock data enrichment", () => {
    it("referrals include level and dealId fields", () => {
      const result = mockSelectors.adminAffiliateDetail("affiliate_gold_001")
      expect(result).not.toBeNull()
      const referral = result?.referrals[0]
      expect(referral?.level).toBeDefined()
      expect(typeof referral?.level).toBe("number")
      expect(referral?.dealId).toBeDefined()
    })

    it("referrals include attributedAt field", () => {
      const result = mockSelectors.adminAffiliateDetail("affiliate_gold_001")
      const referral = result?.referrals[0]
      expect(referral?.attributedAt).toBeDefined()
    })

    it("commissions include level, commissionRate, baseAmount, dealId", () => {
      const result = mockSelectors.adminAffiliateDetail("affiliate_gold_001")
      const commission = result?.commissions[0]
      expect(commission).toBeDefined()
      expect(commission?.level).toBeDefined()
      expect(typeof commission?.commissionRate).toBe("number")
      expect(typeof commission?.baseAmount).toBe("number")
      expect(commission?.dealId).toBeDefined()
    })
  })
})
