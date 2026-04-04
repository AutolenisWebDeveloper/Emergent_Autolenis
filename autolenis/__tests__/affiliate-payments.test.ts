import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"
import { mockSelectors } from "@/lib/mocks/mockStore"

describe("Affiliate Payments", () => {
  describe("RBAC - API routes use isAdminRole (not hardcoded ADMIN)", () => {
    const apiDir = path.resolve("app/api/admin/affiliates/payments")

    function walkDir(dir: string): string[] {
      const files: string[] = []
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          files.push(...walkDir(fullPath))
        } else if (entry.name.endsWith(".ts")) {
          files.push(fullPath)
        }
      }
      return files
    }

    it("all payment API routes import and use isAdminRole", () => {
      const files = walkDir(apiDir)
      expect(files.length).toBeGreaterThan(0)

      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8")
        expect(content).toContain("isAdminRole")
      }
    })

    it("no payment API route uses hardcoded ADMIN-only role check", () => {
      const files = walkDir(apiDir)
      const issues: string[] = []

      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8")
        const lines = content.split("\n")
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue
          if (/\.role\s*!==\s*"ADMIN"/.test(trimmed) && !trimmed.includes("SUPER_ADMIN")) {
            issues.push(path.relative(apiDir, file))
            break
          }
        }
      }
      expect(issues).toEqual([])
    })

    it("all payment API routes check for unauthorized access (401)", () => {
      const files = walkDir(apiDir)
      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8")
        expect(content).toContain("401")
      }
    })
  })

  describe("Workspace isolation - API routes enforce workspace scoping", () => {
    const apiDir = path.resolve("app/api/admin/affiliates/payments")

    function getAllRouteFiles(dir: string): string[] {
      const files: string[] = []
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          files.push(...getAllRouteFiles(fullPath))
        } else if (entry.name === "route.ts") {
          files.push(fullPath)
        }
      }
      return files
    }

    it("all route handlers reference workspace_id for scoping", () => {
      const files = getAllRouteFiles(apiDir)
      expect(files.length).toBeGreaterThan(0)

      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8")
        expect(content).toContain("workspace_id")
      }
    })

    it("GET route uses workspaceId in query filter", () => {
      const content = fs.readFileSync(path.join(apiDir, "route.ts"), "utf-8")
      expect(content).toContain("workspaceId")
      expect(content).toContain("workspace_id")
    })

    it("POST initiate route sets workspaceId on inserted record", () => {
      const content = fs.readFileSync(path.join(apiDir, "initiate/route.ts"), "utf-8")
      expect(content).toContain("workspaceId")
      expect(content).toContain("workspace_id")
    })

    it("PATCH route scopes update by workspaceId", () => {
      const paymentIdDir = fs
        .readdirSync(apiDir, { withFileTypes: true })
        .find((d) => d.isDirectory() && d.name === "[paymentId]")
      expect(paymentIdDir).toBeDefined()
      const content = fs.readFileSync(path.join(apiDir, "[paymentId]", "route.ts"), "utf-8")
      expect(content).toContain("workspaceId")
      expect(content).toContain("workspace_id")
    })
  })

  describe("correlationId on server errors", () => {
    const apiDir = path.resolve("app/api/admin/affiliates/payments")

    function getAllRouteFiles(dir: string): string[] {
      const files: string[] = []
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          files.push(...getAllRouteFiles(fullPath))
        } else if (entry.name === "route.ts") {
          files.push(fullPath)
        }
      }
      return files
    }

    it("all route handlers return correlationId on 500 errors", () => {
      const files = getAllRouteFiles(apiDir)
      expect(files.length).toBeGreaterThan(0)

      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8")
        expect(content).toContain("correlationId")
        expect(content).toContain("randomUUID")
      }
    })
  })

  describe("Mock data - adminAffiliatePayments selector (backed by Payout)", () => {
    it("returns payment records", () => {
      const result = mockSelectors.adminAffiliatePayments({})
      expect(result.payments).toBeDefined()
      expect(result.payments.length).toBeGreaterThan(0)
      expect(result.pagination).toBeDefined()
    })

    it("each payment has required fields", () => {
      const result = mockSelectors.adminAffiliatePayments({})
      for (const payment of result.payments) {
        expect(payment.id).toBeTruthy()
        expect(payment.affiliateId).toBeTruthy()
        expect(typeof payment.amount).toBe("number")
        expect(payment.status).toBeTruthy()
        expect(payment.createdAt).toBeTruthy()
        // method is optional (null when not set on Payout)
        expect(payment.method === null || typeof payment.method === "string").toBe(true)
      }
    })

    it("payments include affiliate details with referral code", () => {
      const result = mockSelectors.adminAffiliatePayments({})
      const withAffiliate = result.payments.filter((p: any) => p.affiliate)
      expect(withAffiliate.length).toBeGreaterThan(0)
      expect(withAffiliate[0]?.affiliate?.referralCode).toBeTruthy()
    })

    it("returns all when status is 'all'", () => {
      const all = mockSelectors.adminAffiliatePayments({ status: "all" })
      expect(all.payments.length).toBeGreaterThanOrEqual(2)
    })

    it("supports pagination", () => {
      const page1 = mockSelectors.adminAffiliatePayments({ page: 1, limit: 1 })
      expect(page1.payments.length).toBe(1)
      expect(page1.pagination.totalPages).toBeGreaterThanOrEqual(2)
    })
  })

  describe("Payment status values", () => {
    it("PATCH route defines valid statuses including INITIATED, PROCESSING, PAID, FAILED, CANCELED", () => {
      const content = fs.readFileSync(
        path.resolve("app/api/admin/affiliates/payments/[paymentId]/route.ts"),
        "utf-8"
      )
      expect(content).toContain("INITIATED")
      expect(content).toContain("PROCESSING")
      expect(content).toContain("PAID")
      expect(content).toContain("FAILED")
      expect(content).toContain("CANCELED")
    })
  })
})
