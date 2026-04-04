import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

/**
 * Tests for Dealers & Affiliates admin features:
 * - Left nav includes dealers + affiliates links
 * - APIs enforce isAdminRole
 * - Workspace scoping is applied in API routes
 * - correlationId is included in error responses
 */

describe("Admin Dealers & Affiliates", () => {
  describe("Left Navigation", () => {
    it("should include a Dealers nav item pointing to /admin/dealers", () => {
      const layoutFile = path.resolve("app/admin/layout.tsx")
      const content = fs.readFileSync(layoutFile, "utf-8")
      expect(content).toContain('href: "/admin/dealers"')
      expect(content).toMatch(/label:\s*"Dealers/)
    })

    it("should include an Affiliates nav item pointing to /admin/affiliates", () => {
      const layoutFile = path.resolve("app/admin/layout.tsx")
      const content = fs.readFileSync(layoutFile, "utf-8")
      expect(content).toContain('href: "/admin/affiliates"')
      expect(content).toMatch(/label:\s*"Affiliate/)
    })

    it("should have Buyers, Dealers, and Affiliates all in nav", () => {
      const layoutFile = path.resolve("app/admin/layout.tsx")
      const content = fs.readFileSync(layoutFile, "utf-8")
      expect(content).toContain('href: "/admin/buyers"')
      expect(content).toContain('href: "/admin/dealers"')
      expect(content).toContain('href: "/admin/affiliates"')
    })
  })

  describe("Dealers API - RBAC", () => {
    it("should use isAdminRole for authorization", () => {
      const routeFile = path.resolve("app/api/admin/dealers/route.ts")
      const content = fs.readFileSync(routeFile, "utf-8")
      expect(content).toContain("isAdminRole")
      expect(content).toContain("getSessionUser")
    })

    it("should return 401 for unauthorized access", () => {
      const routeFile = path.resolve("app/api/admin/dealers/route.ts")
      const content = fs.readFileSync(routeFile, "utf-8")
      expect(content).toMatch(/status:\s*401/)
    })
  })

  describe("Dealers API - Workspace Scoping", () => {
    it("should pass workspace_id to dealer queries", () => {
      const routeFile = path.resolve("app/api/admin/dealers/route.ts")
      const content = fs.readFileSync(routeFile, "utf-8")
      expect(content).toContain("workspace_id")
    })

    it("should include workspaceId filter in admin service getAllDealers", () => {
      const serviceFile = path.resolve("lib/services/admin.service.ts")
      const content = fs.readFileSync(serviceFile, "utf-8")
      expect(content).toContain("workspaceId")
      // The service should accept and apply workspaceId filter
      expect(content).toMatch(/workspaceId.*filters/)
    })
  })

  describe("Dealers API - Error Handling", () => {
    it("should include correlationId in 500 error responses", () => {
      const routeFile = path.resolve("app/api/admin/dealers/route.ts")
      const content = fs.readFileSync(routeFile, "utf-8")
      expect(content).toContain("correlationId")
      expect(content).toContain("randomUUID")
    })
  })

  describe("Affiliates API - RBAC", () => {
    it("should use isAdminRole for authorization", () => {
      const routeFile = path.resolve("app/api/admin/affiliates/route.ts")
      const content = fs.readFileSync(routeFile, "utf-8")
      expect(content).toContain("isAdminRole")
      expect(content).toContain("getSessionUser")
    })

    it("should return 401 for unauthorized access", () => {
      const routeFile = path.resolve("app/api/admin/affiliates/route.ts")
      const content = fs.readFileSync(routeFile, "utf-8")
      expect(content).toMatch(/status:\s*401/)
    })
  })

  describe("Affiliates API - Workspace Scoping", () => {
    it("should apply workspace_id filter to affiliate queries", () => {
      const routeFile = path.resolve("app/api/admin/affiliates/route.ts")
      const content = fs.readFileSync(routeFile, "utf-8")
      // Main query and stats query should both be workspace-scoped
      expect(content).toContain('eq("workspaceId", user.workspace_id)')
    })

    it("should scope stats query to workspace", () => {
      const routeFile = path.resolve("app/api/admin/affiliates/route.ts")
      const content = fs.readFileSync(routeFile, "utf-8")
      // The stats query should also be workspace-scoped
      const statsSection = content.slice(content.indexOf("Calculate stats"))
      expect(statsSection).toContain("workspace_id")
    })
  })

  describe("Affiliates API - Error Handling", () => {
    it("should include correlationId in 500 error responses", () => {
      const routeFile = path.resolve("app/api/admin/affiliates/route.ts")
      const content = fs.readFileSync(routeFile, "utf-8")
      expect(content).toContain("correlationId")
      expect(content).toContain("randomUUID")
    })
  })

  describe("List Pages Exist", () => {
    it("should have a dealers list page at app/admin/dealers/page.tsx", () => {
      const pagePath = path.resolve("app/admin/dealers/page.tsx")
      expect(fs.existsSync(pagePath)).toBe(true)
    })

    it("should have an affiliates list page at app/admin/affiliates/page.tsx", () => {
      const pagePath = path.resolve("app/admin/affiliates/page.tsx")
      expect(fs.existsSync(pagePath)).toBe(true)
    })

    it("dealers page should have empty state message", () => {
      const content = fs.readFileSync(path.resolve("app/admin/dealers/page.tsx"), "utf-8")
      expect(content).toContain("No dealers found")
    })

    it("affiliates page should have empty state message", () => {
      const content = fs.readFileSync(path.resolve("app/admin/affiliates/page.tsx"), "utf-8")
      expect(content).toContain("No affiliates found")
    })
  })
})
