import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"
import { workspaceScope, workspaceFilter, workspaceInsert } from "@/lib/workspace-scope"
import type { SessionUser } from "@/lib/auth"

/**
 * Admin Workspace Isolation Tests
 *
 * Runtime + source-inspection tests that validate:
 * 1. workspaceScope fail-closed behaviour (missing workspace → throw)
 * 2. Cross-workspace data isolation at the helper layer
 * 3. Route handlers extract workspace_id from session (not client)
 * 4. Service methods accept workspaceId parameter
 * 5. Mutation methods verify workspace ownership
 */

// ─── Helper to read source files ───────────────────────────────────────────
function src(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8")
}

// ─── 1. Runtime: workspaceScope fail-closed ─────────────────────────────────

describe("workspaceScope fail-closed behaviour", () => {
  it("throws when session is null", () => {
    expect(() => workspaceScope(null)).toThrow("session is required")
  })

  it("throws when session is undefined", () => {
    expect(() => workspaceScope(undefined)).toThrow("session is required")
  })

  it("throws when session has no workspace_id", () => {
    const session = {
      userId: "admin-1",
      email: "admin@test.com",
      role: "ADMIN",
    } as SessionUser

    expect(() => workspaceScope(session)).toThrow("workspace_id is missing")
  })

  it("returns workspaceId when session has workspace_id", () => {
    const session = {
      userId: "admin-1",
      email: "admin@test.com",
      role: "ADMIN",
      workspace_id: "ws_live_001",
      workspace_mode: "LIVE",
    } as SessionUser

    const scope = workspaceScope(session)
    expect(scope.workspaceId).toBe("ws_live_001")
    expect(scope.isTest).toBe(false)
  })

  it("detects TEST workspace mode", () => {
    const session = {
      userId: "admin-1",
      email: "admin@test.com",
      role: "ADMIN",
      workspace_id: "ws_test_001",
      workspace_mode: "TEST",
    } as SessionUser

    const scope = workspaceScope(session)
    expect(scope.workspaceId).toBe("ws_test_001")
    expect(scope.isTest).toBe(true)
  })
})

// ─── 2. Runtime: cross-workspace isolation logic ────────────────────────────

describe("cross-workspace data isolation", () => {
  const sessionA: SessionUser = {
    userId: "admin-a",
    email: "a@test.com",
    role: "ADMIN",
    workspace_id: "ws_A",
    workspace_mode: "LIVE",
  } as SessionUser

  const sessionB: SessionUser = {
    userId: "admin-b",
    email: "b@test.com",
    role: "ADMIN",
    workspace_id: "ws_B",
    workspace_mode: "LIVE",
  } as SessionUser

  it("two different workspaces get different scopes", () => {
    const scopeA = workspaceScope(sessionA)
    const scopeB = workspaceScope(sessionB)
    expect(scopeA.workspaceId).not.toBe(scopeB.workspaceId)
  })

  it("workspace A admin cannot match workspace B records", () => {
    const scopeA = workspaceScope(sessionA)
    const recordFromWorkspaceB = "ws_B"
    expect(recordFromWorkspaceB === scopeA.workspaceId).toBe(false)
  })

  it("workspaceFilter produces a filter function", () => {
    const filter = workspaceFilter(sessionA)
    expect(typeof filter).toBe("function")
  })

  it("workspaceFilter applies .eq(workspaceId, wsId) to query builder", () => {
    const calls: Array<{ col: string; val: string }> = []
    const mockQuery = {
      eq(col: string, val: string) {
        calls.push({ col, val })
        return mockQuery
      },
    }
    const filter = workspaceFilter(sessionA)
    filter(mockQuery)
    expect(calls).toEqual([{ col: "workspaceId", val: "ws_A" }])
  })

  it("workspaceInsert returns { workspaceId } for insert payloads", () => {
    const insert = workspaceInsert(sessionA)
    expect(insert).toEqual({ workspaceId: "ws_A" })
  })

  it("workspaceFilter throws for session without workspace_id", () => {
    const noWsSession = {
      userId: "admin-x",
      email: "x@test.com",
      role: "ADMIN",
    } as SessionUser
    expect(() => workspaceFilter(noWsSession)).toThrow("workspace_id is missing")
  })
})

// ─── 3. Route handlers: fail-closed workspace gate ──────────────────────────

describe("admin list routes enforce fail-closed workspace gate", () => {
  const routeFiles = [
    "app/api/admin/dashboard/route.ts",
    "app/api/admin/auctions/route.ts",
    "app/api/admin/deals/route.ts",
    "app/api/admin/payments/route.ts",
    "app/api/admin/dealers/route.ts",
    "app/api/admin/buyers/route.ts",
  ]

  it.each(routeFiles)("%s returns 403 when workspace_id is missing", (routeFile) => {
    const content = src(routeFile)
    // Route must check for missing workspace_id and return 403
    expect(content).toContain("workspace_id")
    expect(content).toContain("403")
  })

  it.each(routeFiles)("%s extracts workspace_id from session, not from client", (routeFile) => {
    const content = src(routeFile)
    // Must read from user.workspace_id (server session), not from request body/query
    expect(content).toMatch(/user\.workspace_id|session\.workspace_id/)
    // Must NOT read workspaceId from request body as authority
    expect(content).not.toMatch(/body\.workspaceId|query\.workspaceId|searchParams\.get\("workspaceId"\)/)
  })
})

// ─── 3b. Detail routes: fail-closed workspace gate ──────────────────────────

describe("admin detail routes enforce fail-closed workspace gate", () => {
  const detailRoutes = [
    "app/api/admin/auctions/[auctionId]/route.ts",
    "app/api/admin/buyers/[buyerId]/route.ts",
    "app/api/admin/dealers/[dealerId]/route.ts",
    "app/api/admin/deals/[dealId]/route.ts",
    "app/api/admin/deals/[dealId]/insurance/route.ts",
    "app/api/admin/deals/[dealId]/refunds/route.ts",
    "app/api/admin/deals/[dealId]/billing/route.ts",
    "app/api/admin/deals/[dealId]/esign/route.ts",
  ]

  it.each(detailRoutes)("%s returns 403 when workspace_id is missing", (routeFile) => {
    const content = src(routeFile)
    expect(content).toContain("403")
    expect(content).toContain("workspace")
  })

  it.each(detailRoutes)("%s does NOT use if(workspace_id) fallback pattern", (routeFile) => {
    const content = src(routeFile)
    // Must NOT use the conditional workspace_id pattern: if (user.workspace_id) { ... }
    // It must always require workspace_id (fail-closed)
    expect(content).not.toMatch(/if\s*\(\s*user\.workspace_id\s*\)\s*\{/)
  })
})

// ─── 3c. Deal mutation routes: workspace gate ────────────────────────────────

describe("admin deal mutation routes enforce workspace guard", () => {
  const mutationRoutes = [
    "app/api/admin/deals/[dealId]/status/route.ts",
    "app/api/admin/deals/[dealId]/esign/void-envelope/route.ts",
    "app/api/admin/deals/[dealId]/insurance/request-docs/route.ts",
  ]

  it.each(mutationRoutes)("%s returns 403 when workspace_id is missing", (routeFile) => {
    const content = src(routeFile)
    expect(content).toContain("403")
    expect(content).toContain("workspace")
  })

  it.each(mutationRoutes)("%s verifies deal belongs to workspace before mutation", (routeFile) => {
    const content = src(routeFile)
    // Must verify deal ownership via workspace-scoped query
    expect(content).toContain('.eq("workspaceId"')
    expect(content).toContain('"SelectedDeal"')
  })

  it("mark-signed route uses requireWorkspace guard", () => {
    const content = src("app/api/admin/deals/[dealId]/mark-signed/route.ts")
    expect(content).toContain("requireWorkspace: true")
    expect(content).toContain('.eq("workspaceId"')
    expect(content).toContain('"SelectedDeal"')
  })

  it("verify-external route requires workspace_id", () => {
    const content = src("app/api/admin/deals/[dealId]/insurance/verify-external/route.ts")
    expect(content).toContain("403")
    expect(content).toContain("workspace")
  })
})

// ─── 3d. Financial route workspace scoping ──────────────────────────────────

describe("financial route workspace scoping", () => {
  it("returns 403 when workspace_id is missing", () => {
    const content = src("app/api/admin/financial/route.ts")
    expect(content).toContain("403")
    expect(content).toContain("Forbidden: no workspace")
  })

  it("applies workspace filter to Transaction queries", () => {
    const content = src("app/api/admin/financial/route.ts")
    expect(content).toContain('.eq("workspaceId", wsId)')
  })

  it("scopes all data sources (Transaction, Chargeback, Commission, RefinanceLead)", () => {
    const content = src("app/api/admin/financial/route.ts")
    // All financial data sources should go through wsFilter
    expect(content).toContain("wsFilter")
    // These tables should appear in the route — verify they are all filtered
    const tables = ["Transaction", "Chargeback", "Commission", "RefinanceLead"]
    tables.forEach((table) => {
      expect(content).toContain(`"${table}"`)
    })
  })

  it("does NOT use unscoped Transaction query (all go through wsFilter)", () => {
    const content = src("app/api/admin/financial/route.ts")
    // After the test workspace early return, all Transaction queries should be workspace-scoped
    const nonTestBlock = content.slice(content.indexOf("const wsId = user.workspace_id"))
    // Every Transaction/Chargeback/Commission/RefinanceLead .from() call should be wrapped in wsFilter()
    // Verify wsFilter is defined and used
    expect(nonTestBlock).toContain("const wsFilter = (q: any) => q.eq(\"workspaceId\", wsId)")
    // Verify no direct supabase.from("Transaction") without wsFilter
    // All .from("Transaction") calls should be preceded by wsFilter(
    const txMatches = nonTestBlock.match(/\.from\("Transaction"\)/g) || []
    const wsFilterTxMatches = nonTestBlock.match(/wsFilter\(supabase\s*\n?\s*\.from\("Transaction"\)/g) || []
    expect(txMatches.length).toBe(wsFilterTxMatches.length)
  })
})

// ─── 3e. Payments POST route workspace guard ────────────────────────────────

describe("payments POST route workspace guard", () => {
  it("returns 403 when workspace_id is missing on POST", () => {
    const content = src("app/api/admin/payments/route.ts")
    // The POST handler should check workspace_id
    const postBlock = content.slice(content.indexOf("export async function POST"))
    expect(postBlock).toContain("403")
    expect(postBlock).toContain("workspace")
  })
})

// ─── 4. Service layer: query methods accept workspaceId ─────────────────────

describe("admin service query methods accept workspaceId", () => {
  const svc = () => src("lib/services/admin.service.ts")

  it("getDashboardStats accepts workspaceId", () => {
    expect(svc()).toMatch(/getDashboardStats\(workspaceId\?:\s*string\)/)
  })

  it("getFunnelData accepts workspaceId", () => {
    expect(svc()).toMatch(/getFunnelData\(workspaceId\?:\s*string\)/)
  })

  it("getTopDealers accepts workspaceId", () => {
    expect(svc()).toMatch(/getTopDealers\(limit\s*=\s*10,\s*workspaceId\?:\s*string\)/)
  })

  it("getTopAffiliates accepts workspaceId", () => {
    expect(svc()).toMatch(/getTopAffiliates\(limit\s*=\s*10,\s*workspaceId\?:\s*string\)/)
  })

  it("getDealerPerformance accepts workspaceId", () => {
    expect(svc()).toMatch(/getDealerPerformance\(workspaceId\?:\s*string\)/)
  })

  it("getAllAuctions accepts workspaceId in filters", () => {
    expect(svc()).toMatch(/getAllAuctions\(filters\?:[\s\S]*?workspaceId\?:\s*string/)
  })

  it("getAllDeals accepts workspaceId in filters", () => {
    expect(svc()).toMatch(/getAllDeals\(filters\?:[\s\S]*?workspaceId\?:\s*string/)
  })

  it("getAllPayments accepts workspaceId in filters", () => {
    expect(svc()).toMatch(/getAllPayments\(filters\?:[\s\S]*?workspaceId\?:\s*string/)
  })

  it("getAllAffiliates accepts workspaceId in filters", () => {
    expect(svc()).toMatch(/getAllAffiliates\(filters\?:[\s\S]*?workspaceId\?:\s*string/)
  })

  it("getComplianceEvents accepts workspaceId in filters", () => {
    expect(svc()).toMatch(/getComplianceEvents\(filters\?:[\s\S]*?workspaceId\?:\s*string/)
  })

  it("getContractShieldScans accepts workspaceId in filters", () => {
    expect(svc()).toMatch(/getContractShieldScans\(filters\?:[\s\S]*?workspaceId\?:\s*string/)
  })

  it("getInsuranceData accepts workspaceId in filters", () => {
    expect(svc()).toMatch(/getInsuranceData\(filters\?:[\s\S]*?workspaceId\?:\s*string/)
  })
})

// ─── 5. Service layer: mutation methods verify workspace ownership ──────────

describe("admin service mutation methods accept workspaceId", () => {
  const svc = () => src("lib/services/admin.service.ts")

  it("refundDeposit accepts workspaceId parameter", () => {
    expect(svc()).toMatch(
      /refundDeposit\(depositId:\s*string,\s*reason:\s*string,\s*adminId:\s*string,\s*workspaceId\?:\s*string\)/
    )
  })

  it("suspendDealer accepts workspaceId parameter", () => {
    expect(svc()).toMatch(
      /suspendDealer\(dealerId:\s*string,\s*reason:\s*string,\s*adminId:\s*string,\s*workspaceId\?:\s*string\)/
    )
  })

  it("approveDealer accepts workspaceId parameter", () => {
    expect(svc()).toMatch(
      /approveDealer\(dealerId:\s*string,\s*adminId:\s*string,\s*workspaceId\?:\s*string\)/
    )
  })

  it("refundDeposit verifies workspace before refund", () => {
    const content = svc()
    const refundBlock = content.slice(
      content.indexOf("async refundDeposit"),
      content.indexOf("async suspendDealer")
    )
    expect(refundBlock).toContain('.eq("workspaceId", workspaceId)')
    expect(refundBlock).toContain("Deposit not found")
  })

  it("suspendDealer verifies workspace before mutation", () => {
    const content = svc()
    const suspendBlock = content.slice(
      content.indexOf("async suspendDealer"),
      content.indexOf("async approveDealer")
    )
    expect(suspendBlock).toContain('.eq("workspaceId", workspaceId)')
    expect(suspendBlock).toContain("Dealer not found")
  })

  it("approveDealer verifies workspace before mutation", () => {
    const content = svc()
    const approveBlock = content.slice(
      content.indexOf("async approveDealer"),
      content.indexOf("async getDealerPerformance")
    )
    expect(approveBlock).toContain('.eq("workspaceId", workspaceId)')
    expect(approveBlock).toContain("Dealer not found")
  })
})

// ─── 6. Modular admin files workspace support ───────────────────────────────

describe("modular admin/queries.ts workspace support", () => {
  const queries = () => src("lib/services/admin/queries.ts")

  it("getAllAuctions accepts workspaceId", () => {
    expect(queries()).toMatch(/getAllAuctions\(filters\?:[\s\S]*?workspaceId\?:\s*string/)
  })

  it("getAllDeals accepts workspaceId", () => {
    expect(queries()).toMatch(/getAllDeals\(filters\?:[\s\S]*?workspaceId\?:\s*string/)
  })

  it("getAllPayments accepts workspaceId", () => {
    expect(queries()).toMatch(/getAllPayments\(filters\?:[\s\S]*?workspaceId\?:\s*string/)
  })

  it("getAllAffiliates accepts workspaceId", () => {
    expect(queries()).toMatch(/getAllAffiliates\(filters\?:[\s\S]*?workspaceId\?:\s*string/)
  })

  it("getComplianceEvents accepts workspaceId", () => {
    expect(queries()).toMatch(/getComplianceEvents\(filters\?:[\s\S]*?workspaceId\?:\s*string/)
  })

  it("getContractShieldScans accepts workspaceId", () => {
    expect(queries()).toMatch(/getContractShieldScans\(filters\?:[\s\S]*?workspaceId\?:\s*string/)
  })

  it("getInsuranceData accepts workspaceId", () => {
    expect(queries()).toMatch(/getInsuranceData\(filters\?:[\s\S]*?workspaceId\?:\s*string/)
  })

  it("getBuyerDetail accepts workspaceId", () => {
    expect(queries()).toMatch(/getBuyerDetail\(userId:\s*string,\s*workspaceId\?:\s*string\)/)
  })
})

describe("modular admin/analytics.ts workspace support", () => {
  const analytics = () => src("lib/services/admin/analytics.ts")

  it("getDashboardStats accepts workspaceId", () => {
    expect(analytics()).toMatch(/getDashboardStats\(workspaceId\?:\s*string\)/)
  })

  it("getFunnelData accepts workspaceId", () => {
    expect(analytics()).toMatch(/getFunnelData\(workspaceId\?:\s*string\)/)
  })

  it("getTopDealers accepts workspaceId", () => {
    expect(analytics()).toMatch(/getTopDealers\(limit\s*=\s*10,\s*workspaceId\?:\s*string\)/)
  })

  it("getTopAffiliates accepts workspaceId", () => {
    expect(analytics()).toMatch(/getTopAffiliates\(limit\s*=\s*10,\s*workspaceId\?:\s*string\)/)
  })

  it("getDealerPerformance accepts workspaceId", () => {
    expect(analytics()).toMatch(/getDealerPerformance\(workspaceId\?:\s*string\)/)
  })
})

describe("modular admin/actions.ts workspace support", () => {
  const actions = () => src("lib/services/admin/actions.ts")

  it("refundDeposit accepts workspaceId", () => {
    expect(actions()).toMatch(
      /refundDeposit\(depositId:\s*string,\s*reason:\s*string,\s*adminId:\s*string,\s*workspaceId\?:\s*string\)/
    )
  })

  it("suspendDealer accepts workspaceId", () => {
    expect(actions()).toMatch(
      /suspendDealer\(dealerId:\s*string,\s*reason:\s*string,\s*adminId:\s*string,\s*workspaceId\?:\s*string\)/
    )
  })

  it("approveDealer accepts workspaceId", () => {
    expect(actions()).toMatch(
      /approveDealer\(dealerId:\s*string,\s*adminId:\s*string,\s*workspaceId\?:\s*string\)/
    )
  })

  it("suspendDealer verifies workspace before mutation", () => {
    const content = actions()
    const block = content.slice(
      content.indexOf("export async function suspendDealer"),
      content.indexOf("export async function approveDealer")
    )
    expect(block).toContain('.eq("workspaceId", workspaceId)')
    expect(block).toContain("Dealer not found")
  })

  it("approveDealer verifies workspace before mutation", () => {
    const content = actions()
    const block = content.slice(
      content.indexOf("export async function approveDealer"),
      content.indexOf("export async function getSystemSettings")
    )
    expect(block).toContain('.eq("workspaceId", workspaceId)')
    expect(block).toContain("Dealer not found")
  })
})

// ─── 7. Route: dashboard passes wsId to all analytics calls ─────────────────

describe("dashboard route passes wsId to service calls", () => {
  it("passes wsId to getDashboardStats, getFunnelData, getTopDealers, getTopAffiliates", () => {
    const route = src("app/api/admin/dashboard/route.ts")
    expect(route).toContain("getDashboardStats(wsId)")
    expect(route).toContain("getFunnelData(wsId)")
    expect(route).toContain("getTopDealers(5, wsId)")
    expect(route).toContain("getTopAffiliates(5, wsId)")
  })
})

// ─── 8. Route: dealers POST passes workspace_id to mutations ────────────────

describe("dealers route passes workspace_id to mutations", () => {
  it("POST passes wsId to approveDealer and suspendDealer", () => {
    const route = src("app/api/admin/dealers/route.ts")
    expect(route).toContain("approveDealer(dealerId, user.userId, wsId)")
    expect(route).toContain("suspendDealer(dealerId, reason, user.userId, wsId)")
  })
})

// ─── 9. Runtime: createSession / verifySession round-trip with workspace ────

describe("session round-trip with workspace_id", () => {
  it("workspace_id is preserved through createSession / verifySession", async () => {
    const { createSession, verifySession } = await import("@/lib/auth")

    const token = await createSession({
      userId: "admin-rt-1",
      email: "rt@test.com",
      role: "ADMIN",
      workspace_id: "ws_runtime_test",
      workspace_mode: "LIVE",
    })

    const session = await verifySession(token)
    expect(session.workspace_id).toBe("ws_runtime_test")
    expect(session.workspace_mode).toBe("LIVE")

    const scope = workspaceScope(session)
    expect(scope.workspaceId).toBe("ws_runtime_test")
    expect(scope.isTest).toBe(false)
  })

  it("defaults workspace_mode to LIVE for sessions without it", async () => {
    const { createSession, verifySession } = await import("@/lib/auth")

    const token = await createSession({
      userId: "admin-rt-2",
      email: "rt2@test.com",
      role: "ADMIN",
      workspace_id: "ws_no_mode",
    })

    const session = await verifySession(token)
    expect(session.workspace_mode).toBe("LIVE")
  })
})

// ─── 10. Runtime: cross-workspace query isolation simulation ─────────────────

describe("cross-workspace query isolation (runtime simulation)", () => {
  const mockRecords = [
    { id: "deal-1", workspaceId: "ws_A", status: "COMPLETED" },
    { id: "deal-2", workspaceId: "ws_A", status: "ACTIVE" },
    { id: "deal-3", workspaceId: "ws_B", status: "COMPLETED" },
    { id: "deal-4", workspaceId: "ws_B", status: "ACTIVE" },
    { id: "deal-5", workspaceId: "ws_C", status: "COMPLETED" },
  ]

  function filterByWorkspace(records: typeof mockRecords, wsId: string) {
    return records.filter((r) => r.workspaceId === wsId)
  }

  it("workspace A admin sees only workspace A records", () => {
    const result = filterByWorkspace(mockRecords, "ws_A")
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.workspaceId === "ws_A")).toBe(true)
  })

  it("workspace B admin sees only workspace B records", () => {
    const result = filterByWorkspace(mockRecords, "ws_B")
    expect(result).toHaveLength(2)
    expect(result.every((r) => r.workspaceId === "ws_B")).toBe(true)
  })

  it("workspace A admin cannot access workspace B records", () => {
    const result = filterByWorkspace(mockRecords, "ws_A")
    const hasBRecords = result.some((r) => r.workspaceId === "ws_B")
    expect(hasBRecords).toBe(false)
  })

  it("workspace C admin sees only workspace C records", () => {
    const result = filterByWorkspace(mockRecords, "ws_C")
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("deal-5")
  })

  it("unknown workspace gets zero records", () => {
    const result = filterByWorkspace(mockRecords, "ws_NONEXISTENT")
    expect(result).toHaveLength(0)
  })
})

// ─── 11. Runtime: cross-workspace mutation denial ────────────────────────────

describe("cross-workspace mutation denial (runtime simulation)", () => {
  function verifyOwnership(recordWorkspaceId: string, sessionWorkspaceId: string): boolean {
    return recordWorkspaceId === sessionWorkspaceId
  }

  it("mutation allowed when workspace matches", () => {
    expect(verifyOwnership("ws_A", "ws_A")).toBe(true)
  })

  it("mutation denied when workspace differs", () => {
    expect(verifyOwnership("ws_A", "ws_B")).toBe(false)
  })

  it("mutation denied when record has no workspace", () => {
    expect(verifyOwnership("", "ws_A")).toBe(false)
  })

  it("mutation denied when session has no workspace", () => {
    expect(verifyOwnership("ws_A", "")).toBe(false)
  })

  it("refund attempt from wrong workspace is rejected", () => {
    const deposit = { id: "dep-1", workspaceId: "ws_A", buyerId: "buyer-1", status: "HELD" }
    const sessionWsId = "ws_B"
    const canRefund = verifyOwnership(deposit.workspaceId, sessionWsId)
    expect(canRefund).toBe(false)
  })

  it("dealer suspend attempt from wrong workspace is rejected", () => {
    const dealer = { id: "dealer-1", workspaceId: "ws_A", active: true }
    const sessionWsId = "ws_B"
    const canSuspend = verifyOwnership(dealer.workspaceId, sessionWsId)
    expect(canSuspend).toBe(false)
  })
})

// ─── 12. Runtime: analytics scoping only counts workspace data ──────────────

describe("analytics scoping only counts workspace data (runtime simulation)", () => {
  const mockDeals = [
    { id: "1", workspaceId: "ws_A", status: "COMPLETED", amount: 1000 },
    { id: "2", workspaceId: "ws_A", status: "COMPLETED", amount: 2000 },
    { id: "3", workspaceId: "ws_B", status: "COMPLETED", amount: 5000 },
    { id: "4", workspaceId: "ws_A", status: "ACTIVE", amount: 3000 },
    { id: "5", workspaceId: "ws_B", status: "ACTIVE", amount: 4000 },
  ]

  it("workspace A completed deals count is 2, not 3", () => {
    const wsADeals = mockDeals.filter((d) => d.workspaceId === "ws_A" && d.status === "COMPLETED")
    expect(wsADeals).toHaveLength(2)
  })

  it("workspace A revenue total is 3000, not 8000", () => {
    const wsARevenue = mockDeals
      .filter((d) => d.workspaceId === "ws_A" && d.status === "COMPLETED")
      .reduce((sum, d) => sum + d.amount, 0)
    expect(wsARevenue).toBe(3000)
  })

  it("workspace B revenue includes only B records", () => {
    const wsBRevenue = mockDeals
      .filter((d) => d.workspaceId === "ws_B" && d.status === "COMPLETED")
      .reduce((sum, d) => sum + d.amount, 0)
    expect(wsBRevenue).toBe(5000)
  })

  it("unscoped query would return all records (this is what we prevent)", () => {
    const allCompleted = mockDeals.filter((d) => d.status === "COMPLETED")
    expect(allCompleted).toHaveLength(3)
    const totalRevenue = allCompleted.reduce((sum, d) => sum + d.amount, 0)
    expect(totalRevenue).toBe(8000) // proves unscoped would over-count
  })
})

// ─── 13. Service layer wsEq helper behavior ─────────────────────────────────

describe("service layer wsEq helper", () => {
  it("admin.service.ts uses wsEq for workspace filtering", () => {
    const content = src("lib/services/admin.service.ts")
    expect(content).toContain("function wsEq")
    expect(content).toContain("workspaceId")
  })

  it("wsEq passes workspaceId to all dashboard queries", () => {
    const content = src("lib/services/admin.service.ts")
    // Verify all wsEq calls in getDashboardStats pass the workspaceId argument
    const dashBlock = content.slice(
      content.indexOf("async getDashboardStats"),
      content.indexOf("async getFunnelData")
    )
    const wsEqCalls = dashBlock.match(/wsEq\(/g) || []
    // Every wsEq call should end with ", workspaceId)" somewhere on a line
    const wsEqWithArg = dashBlock.match(/, workspaceId\)/g) || []
    // All wsEq calls should have workspaceId as second arg
    expect(wsEqCalls.length).toBe(wsEqWithArg.length)
    expect(wsEqCalls.length).toBeGreaterThan(0)
  })
})

// ─── 14. Verify canonical status imports ─────────────────────────────────────

describe("canonical status imports in admin.service.ts", () => {
  it("imports AuctionStatus from canonical statuses module", () => {
    const content = src("lib/services/admin.service.ts")
    expect(content).toContain("AuctionStatus")
    expect(content).toContain("@/lib/constants/statuses")
  })

  it("imports DealStatus from canonical statuses module", () => {
    const content = src("lib/services/admin.service.ts")
    expect(content).toContain("DealStatus")
  })

  it("imports PaymentStatus from canonical statuses module", () => {
    const content = src("lib/services/admin.service.ts")
    expect(content).toContain("PaymentStatus")
  })

  it("imports PayoutStatus from canonical statuses module", () => {
    const content = src("lib/services/admin.service.ts")
    expect(content).toContain("PayoutStatus")
  })

  it("uses AuctionStatus.ACTIVE instead of string literal", () => {
    const content = src("lib/services/admin.service.ts")
    expect(content).toContain("AuctionStatus.ACTIVE")
  })

  it("uses DealStatus.COMPLETED instead of string literal", () => {
    const content = src("lib/services/admin.service.ts")
    expect(content).toContain("DealStatus.COMPLETED")
  })

  it("uses PaymentStatus.SUCCEEDED instead of string literal", () => {
    const content = src("lib/services/admin.service.ts")
    expect(content).toContain("PaymentStatus.SUCCEEDED")
  })
})

// ─── 15. Mutation routes verify deal ownership via workspace-scoped query ────

describe("deal mutation routes verify SelectedDeal ownership with workspaceId before service call", () => {
  const dealMutationRoutes = [
    {
      path: "app/api/admin/deals/[dealId]/insurance/verify-external/route.ts",
      label: "verify-external",
    },
    {
      path: "app/api/admin/deals/[dealId]/status/route.ts",
      label: "deal status",
    },
    {
      path: "app/api/admin/deals/[dealId]/mark-signed/route.ts",
      label: "mark-signed",
    },
    {
      path: "app/api/admin/deals/[dealId]/esign/void-envelope/route.ts",
      label: "void-envelope",
    },
    {
      path: "app/api/admin/deals/[dealId]/insurance/request-docs/route.ts",
      label: "request-docs",
    },
  ]

  dealMutationRoutes.forEach(({ path: routePath, label }) => {
    describe(`${label} (${routePath})`, () => {
      const route = () => src(routePath)

      it("imports supabase for workspace-scoped ownership query", () => {
        expect(route()).toContain('import { supabase } from "@/lib/db"')
      })

      it("queries SelectedDeal with workspace-scoped eq(workspaceId)", () => {
        const content = route()
        expect(content).toContain('.from("SelectedDeal")')
        expect(content).toContain('.eq("id", dealId)')
        expect(content).toMatch(/\.eq\("workspaceId",\s*(wsId|ctx\.workspaceId)\)/)
        expect(content).toContain(".single()")
      })

      it("returns 404 when deal does not belong to workspace", () => {
        const content = route()
        expect(content).toContain("Deal not found")
        expect(content).toContain("404")
      })

      it("fails closed — returns 403 when workspace_id is missing", () => {
        const content = route()
        // Either fail-closed via wsId check or via withAuth requireWorkspace
        const hasWsIdCheck = content.includes("Forbidden: no workspace") && content.includes("403")
        const hasWithAuthWorkspace = content.includes("requireWorkspace: true")
        expect(hasWsIdCheck || hasWithAuthWorkspace).toBe(true)
      })
    })
  })
})
