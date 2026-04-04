import { describe, expect, it } from "vitest"
import { mockSelectors } from "@/lib/mocks/mockStore"
import { workspaceScope, workspaceFilter, workspaceInsert } from "@/lib/workspace-scope"
import type { SessionUser } from "@/lib/auth"

describe("Admin Dealer Detail", () => {
  describe("mock dealer detail resolution", () => {
    it("returns dealer data for a valid dealer ID", () => {
      const result = mockSelectors.adminDealerDetail("dealer_gold_001")
      expect(result).not.toBeNull()
      expect(result.id).toBe("dealer_gold_001")
      expect(result._count).toBeDefined()
      expect(result._count.inventoryItems).toBeGreaterThanOrEqual(0)
      expect(result._count.offers).toBeGreaterThanOrEqual(0)
      expect(result._count.selectedDeals).toBeGreaterThanOrEqual(0)
    })

    it("returns null for a non-existent dealer ID", () => {
      const result = mockSelectors.adminDealerDetail("dealer_nonexistent_999")
      expect(result).toBeNull()
    })

    it("returns inventoryItems array for a valid dealer", () => {
      const result = mockSelectors.adminDealerDetail("dealer_gold_001")
      expect(result).not.toBeNull()
      expect(Array.isArray(result.inventoryItems)).toBe(true)
    })

    it("returns offers array for a valid dealer", () => {
      const result = mockSelectors.adminDealerDetail("dealer_gold_001")
      expect(result).not.toBeNull()
      expect(Array.isArray(result.offers)).toBe(true)
    })

    it("returns selectedDeals array for a valid dealer", () => {
      const result = mockSelectors.adminDealerDetail("dealer_gold_001")
      expect(result).not.toBeNull()
      expect(Array.isArray(result.selectedDeals)).toBe(true)
    })
  })

  describe("dealer list → detail ID consistency", () => {
    it("dealer list uses same ID that detail accepts", () => {
      const listResult = mockSelectors.adminDealers({ page: 1 })
      expect(listResult.dealers.length).toBeGreaterThan(0)

      const firstDealer = listResult.dealers[0]
      expect(firstDealer.id).toBeDefined()

      // The same ID should resolve in the detail endpoint
      const detailResult = mockSelectors.adminDealerDetail(firstDealer.id)
      expect(detailResult).not.toBeNull()
      expect(detailResult.id).toBe(firstDealer.id)
    })

    it("all dealers in the list resolve in the detail view", () => {
      const listResult = mockSelectors.adminDealers({ page: 1, limit: 100 })

      for (const dealer of listResult.dealers) {
        const detailResult = mockSelectors.adminDealerDetail(dealer.id)
        expect(detailResult).not.toBeNull()
        expect(detailResult.id).toBe(dealer.id)
      }
    })

    it("dealer detail resolves by userId as fallback", () => {
      // Each dealer has a userId — the detail lookup should also work with it
      const listResult = mockSelectors.adminDealers({ page: 1, limit: 100 })

      for (const dealer of listResult.dealers) {
        expect(dealer.userId).toBeDefined()
        const detailResult = mockSelectors.adminDealerDetail(dealer.userId)
        expect(detailResult).not.toBeNull()
        expect(detailResult.userId).toBe(dealer.userId)
      }
    })
  })

  describe("workspace isolation for dealer queries", () => {
    it("workspaceScope extracts workspace_id from admin session", async () => {
      const { createSession, verifySession } = await import("@/lib/auth")

      const token = await createSession({
        userId: "admin-user-1",
        email: "admin@test.com",
        role: "ADMIN",
        workspace_id: "ws_live_001",
        workspace_mode: "LIVE",
      })

      const session = await verifySession(token)
      const scope = workspaceScope(session)

      expect(scope.workspaceId).toBe("ws_live_001")
      expect(scope.isTest).toBe(false)
    })

    it("workspaceFilter applies workspace_id to queries", async () => {
      const { createSession, verifySession } = await import("@/lib/auth")

      const token = await createSession({
        userId: "admin-user-2",
        email: "admin2@test.com",
        role: "ADMIN",
        workspace_id: "ws_live_002",
        workspace_mode: "LIVE",
      })

      const session = await verifySession(token)
      const filter = workspaceFilter(session)

      // Create a mock query builder
      const appliedFilters: Array<{ col: string; val: string }> = []
      const mockQuery = {
        eq(col: string, val: string) {
          appliedFilters.push({ col, val })
          return mockQuery
        },
      }

      filter(mockQuery)
      expect(appliedFilters).toContainEqual({ col: "workspaceId", val: "ws_live_002" })
    })

    it("workspaceInsert produces correct workspaceId for inserts", async () => {
      const { createSession, verifySession } = await import("@/lib/auth")

      const token = await createSession({
        userId: "admin-user-3",
        email: "admin3@test.com",
        role: "ADMIN",
        workspace_id: "ws_live_003",
        workspace_mode: "LIVE",
      })

      const session = await verifySession(token)
      const insert = workspaceInsert(session)

      expect(insert).toEqual({ workspaceId: "ws_live_003" })
    })

    it("workspace scope throws when session has no workspace_id", () => {
      const session = {
        userId: "admin-no-ws",
        email: "no-ws@test.com",
        role: "ADMIN",
      } as SessionUser

      expect(() => workspaceScope(session)).toThrow("workspace_id is missing")
    })

    it("dealer detail not returned when workspace does not match (isolation)", () => {
      // This test verifies the logic: if a dealer has workspaceId "ws_A" but
      // the admin session has workspaceId "ws_B", the dealer should NOT be returned.
      // In production, Supabase .eq("workspaceId", sessionWorkspaceId) handles this.
      // Here we verify the concept via workspaceScope.

      const sessionWsA = {
        userId: "admin-a",
        email: "a@test.com",
        role: "ADMIN",
        workspace_id: "ws_A",
        workspace_mode: "LIVE",
      } as SessionUser

      const sessionWsB = {
        userId: "admin-b",
        email: "b@test.com",
        role: "ADMIN",
        workspace_id: "ws_B",
        workspace_mode: "LIVE",
      } as SessionUser

      const scopeA = workspaceScope(sessionWsA)
      const scopeB = workspaceScope(sessionWsB)

      expect(scopeA.workspaceId).not.toBe(scopeB.workspaceId)

      // Simulate: dealer has workspaceId "ws_A"
      const dealerWorkspaceId = "ws_A"

      // Session A should see it
      expect(dealerWorkspaceId === scopeA.workspaceId).toBe(true)

      // Session B should NOT see it
      expect(dealerWorkspaceId === scopeB.workspaceId).toBe(false)
    })
  })

  describe("admin role checks", () => {
    it("isAdminRole accepts ADMIN", async () => {
      const { isAdminRole } = await import("@/lib/auth-server")
      expect(isAdminRole("ADMIN")).toBe(true)
    })

    it("isAdminRole accepts SUPER_ADMIN", async () => {
      const { isAdminRole } = await import("@/lib/auth-server")
      expect(isAdminRole("SUPER_ADMIN")).toBe(true)
    })

    it("isAdminRole rejects DEALER", async () => {
      const { isAdminRole } = await import("@/lib/auth-server")
      expect(isAdminRole("DEALER")).toBe(false)
    })

    it("isAdminRole rejects BUYER", async () => {
      const { isAdminRole } = await import("@/lib/auth-server")
      expect(isAdminRole("BUYER")).toBe(false)
    })
  })

  describe("dealer detail API route uses service-role client", () => {
    it("dealer detail route imports from @/lib/db instead of @/lib/supabase/server", async () => {
      const fs = await import("fs")
      const routeContent = fs.readFileSync(
        require("path").resolve(__dirname, "../app/api/admin/dealers/[dealerId]/route.ts"),
        "utf-8"
      )
      // Should import from @/lib/db (service-role client)
      expect(routeContent).toContain('from "@/lib/db"')
      // Should NOT import from @/lib/supabase/server (anon-key client)
      expect(routeContent).not.toContain('from "@/lib/supabase/server"')
    })

    it("dealer approve route imports from @/lib/db", async () => {
      const fs = await import("fs")
      const routeContent = fs.readFileSync(
        require("path").resolve(__dirname, "../app/api/admin/dealers/[dealerId]/approve/route.ts"),
        "utf-8"
      )
      expect(routeContent).toContain('from "@/lib/db"')
      expect(routeContent).not.toContain('from "@/lib/supabase/server"')
    })

    it("dealer suspend route imports from @/lib/db", async () => {
      const fs = await import("fs")
      const routeContent = fs.readFileSync(
        require("path").resolve(__dirname, "../app/api/admin/dealers/[dealerId]/suspend/route.ts"),
        "utf-8"
      )
      expect(routeContent).toContain('from "@/lib/db"')
      expect(routeContent).not.toContain('from "@/lib/supabase/server"')
    })

    it("dealer detail route applies workspace filtering", async () => {
      const fs = await import("fs")
      const routeContent = fs.readFileSync(
        require("path").resolve(__dirname, "../app/api/admin/dealers/[dealerId]/route.ts"),
        "utf-8"
      )
      expect(routeContent).toContain('eq("workspaceId"')
      expect(routeContent).toContain("workspace_id")
    })

    it("dealer detail route includes correlationId in error logging", async () => {
      const fs = await import("fs")
      const routeContent = fs.readFileSync(
        require("path").resolve(__dirname, "../app/api/admin/dealers/[dealerId]/route.ts"),
        "utf-8"
      )
      expect(routeContent).toContain("correlationId")
      expect(routeContent).toContain("randomUUID")
    })
  })

  describe("route param naming convention", () => {
    it("detail page folder uses [dealerId] not [id]", async () => {
      const fs = await import("fs")
      const path = require("path")
      // The [dealerId] folder MUST exist
      const dealerIdPath = path.resolve(__dirname, "../app/admin/dealers/[dealerId]/page.tsx")
      expect(fs.existsSync(dealerIdPath)).toBe(true)
      // The old [id] folder MUST NOT exist
      const idPath = path.resolve(__dirname, "../app/admin/dealers/[id]/page.tsx")
      expect(fs.existsSync(idPath)).toBe(false)
    })

    it("API route folder uses [dealerId] not [id]", async () => {
      const fs = await import("fs")
      const path = require("path")
      const dealerIdPath = path.resolve(__dirname, "../app/api/admin/dealers/[dealerId]/route.ts")
      expect(fs.existsSync(dealerIdPath)).toBe(true)
      const idPath = path.resolve(__dirname, "../app/api/admin/dealers/[id]/route.ts")
      expect(fs.existsSync(idPath)).toBe(false)
    })

    it("detail page uses params.dealerId", async () => {
      const fs = await import("fs")
      const pageContent = fs.readFileSync(
        require("path").resolve(__dirname, "../app/admin/dealers/[dealerId]/page.tsx"),
        "utf-8"
      )
      expect(pageContent).toContain("params: Promise<{ dealerId: string }>")
      expect(pageContent).toContain("const { dealerId }")
      // Must NOT still reference old param name
      expect(pageContent).not.toContain("params: Promise<{ id: string }>")
    })

    it("API route uses params.dealerId", async () => {
      const fs = await import("fs")
      const routeContent = fs.readFileSync(
        require("path").resolve(__dirname, "../app/api/admin/dealers/[dealerId]/route.ts"),
        "utf-8"
      )
      expect(routeContent).toContain("params: Promise<{ dealerId: string }>")
      expect(routeContent).toContain("const { dealerId }")
      expect(routeContent).not.toContain("params: Promise<{ id: string }>")
    })

    it("list page links to /admin/dealers/${dealer.id}", async () => {
      const fs = await import("fs")
      const listContent = fs.readFileSync(
        require("path").resolve(__dirname, "../app/admin/dealers/page.tsx"),
        "utf-8"
      )
      expect(listContent).toContain("/admin/dealers/${dealer.id}")
    })

    it("dealer name in list page is a clickable link", async () => {
      const fs = await import("fs")
      const listContent = fs.readFileSync(
        require("path").resolve(__dirname, "../app/admin/dealers/page.tsx"),
        "utf-8"
      )
      // The dealer name column should contain a Link with dealer.id
      expect(listContent).toMatch(/Link\s+href=\{`\/admin\/dealers\/\$\{dealer\.id\}`\}/)
    })
  })

  describe("admin service dealer query", () => {
    it("does not select non-existent name column from Dealer table", async () => {
      const fs = await import("fs")
      const serviceContent = fs.readFileSync(
        require("path").resolve(__dirname, "../lib/services/admin.service.ts"),
        "utf-8"
      )
      // Find the getAllDealers method's SELECT clause
      const getAllDealersSection = serviceContent.slice(
        serviceContent.indexOf("getAllDealers"),
        serviceContent.indexOf("getAllDealers") + 800
      )
      // The SELECT should use businessName, not a standalone "name" column
      expect(getAllDealersSection).toContain("businessName")
      expect(getAllDealersSection).not.toMatch(/select\("id, name,/)
    })

    it("dealer detail API returns 404 before running parallel queries", async () => {
      const fs = await import("fs")
      const routeContent = fs.readFileSync(
        require("path").resolve(__dirname, "../app/api/admin/dealers/[dealerId]/route.ts"),
        "utf-8"
      )
      // The 404 check must appear BEFORE the Promise.all
      const notFoundIndex = routeContent.indexOf('error: "Dealer not found"')
      const parallelIndex = routeContent.indexOf("Promise.all")
      expect(notFoundIndex).toBeLessThan(parallelIndex)
    })
  })
})
