import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

describe("Admin Buyer Detail Page", () => {
  describe("Route + Param Contract", () => {
    it("page file exists at app/admin/buyers/[buyerId]/page.tsx", () => {
      const filePath = path.resolve("app/admin/buyers/[buyerId]/page.tsx")
      expect(fs.existsSync(filePath)).toBe(true)
    })

    it("page uses params.buyerId (not params.id)", () => {
      const filePath = path.resolve("app/admin/buyers/[buyerId]/page.tsx")
      const content = fs.readFileSync(filePath, "utf-8")
      expect(content).toContain("buyerId")
      expect(content).toContain("params: Promise<{ buyerId: string }>")
      expect(content).not.toContain("params: Promise<{ id: string }>")
    })

    it("page is a client component", () => {
      const filePath = path.resolve("app/admin/buyers/[buyerId]/page.tsx")
      const content = fs.readFileSync(filePath, "utf-8")
      expect(content).toContain('"use client"')
    })
  })

  describe("API Route RBAC", () => {
    const apiRouteFile = "app/api/admin/buyers/[buyerId]/route.ts"

    it("API route exists at app/api/admin/buyers/[buyerId]/route.ts", () => {
      const filePath = path.resolve(apiRouteFile)
      expect(fs.existsSync(filePath)).toBe(true)
    })

    it("API route imports isAdminRole for RBAC", () => {
      const content = fs.readFileSync(path.resolve(apiRouteFile), "utf-8")
      expect(content).toContain("isAdminRole")
    })

    it("API route checks for admin role before proceeding", () => {
      const content = fs.readFileSync(path.resolve(apiRouteFile), "utf-8")
      expect(content).toContain("!isAdminRole(user.role)")
    })

    it("API route returns 401 for unauthorized users", () => {
      const content = fs.readFileSync(path.resolve(apiRouteFile), "utf-8")
      expect(content).toContain("status: 401")
    })

    it("API route uses buyerId param (not id)", () => {
      const content = fs.readFileSync(path.resolve(apiRouteFile), "utf-8")
      expect(content).toContain("params: Promise<{ buyerId: string }>")
      expect(content).not.toContain("params: Promise<{ id: string }>")
    })
  })

  describe("Workspace Isolation", () => {
    it("API route scopes queries by workspaceId", () => {
      const content = fs.readFileSync(
        path.resolve("app/api/admin/buyers/[buyerId]/route.ts"),
        "utf-8",
      )
      expect(content).toContain("workspaceId")
      expect(content).toContain('eq("workspaceId"')
    })

    it("API route supports test workspace mock data", () => {
      const content = fs.readFileSync(
        path.resolve("app/api/admin/buyers/[buyerId]/route.ts"),
        "utf-8",
      )
      expect(content).toContain("isTestWorkspace")
    })

    it("status API route scopes queries by workspaceId", () => {
      const content = fs.readFileSync(
        path.resolve("app/api/admin/buyers/[buyerId]/status/route.ts"),
        "utf-8",
      )
      expect(content).toContain("workspaceId")
    })
  })

  describe("Error Handling", () => {
    it("API route includes correlationId on 500 errors", () => {
      const content = fs.readFileSync(
        path.resolve("app/api/admin/buyers/[buyerId]/route.ts"),
        "utf-8",
      )
      expect(content).toContain("correlationId")
    })

    it("status API route includes correlationId on 500 errors", () => {
      const content = fs.readFileSync(
        path.resolve("app/api/admin/buyers/[buyerId]/status/route.ts"),
        "utf-8",
      )
      expect(content).toContain("correlationId")
    })
  })

  describe("Page Tabs & Content", () => {
    it("page has all required tabs", () => {
      const content = fs.readFileSync(
        path.resolve("app/admin/buyers/[buyerId]/page.tsx"),
        "utf-8",
      )
      expect(content).toContain('value="overview"')
      expect(content).toContain('value="prequal"')
      expect(content).toContain('value="auctions"')
      expect(content).toContain('value="deals"')
      expect(content).toContain('value="payments"')
      expect(content).toContain('value="documents"')
      expect(content).toContain('value="affiliate"')
      expect(content).toContain('value="compliance"')
    })

    it("page has back button to buyers list", () => {
      const content = fs.readFileSync(
        path.resolve("app/admin/buyers/[buyerId]/page.tsx"),
        "utf-8",
      )
      expect(content).toContain('href="/admin/buyers"')
    })

    it("page has status badges", () => {
      const content = fs.readFileSync(
        path.resolve("app/admin/buyers/[buyerId]/page.tsx"),
        "utf-8",
      )
      expect(content).toContain("SUSPENDED")
      expect(content).toContain("ACTIVE")
    })

    it("page has suspend/reactivate action buttons", () => {
      const content = fs.readFileSync(
        path.resolve("app/admin/buyers/[buyerId]/page.tsx"),
        "utf-8",
      )
      expect(content).toContain("Suspend Account")
      expect(content).toContain("Reactivate Account")
    })
  })
})
