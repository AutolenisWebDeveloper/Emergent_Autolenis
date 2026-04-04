import { describe, expect, it } from "vitest"
import { workspaceScope, workspaceFilter, workspaceInsert } from "@/lib/workspace-scope"

describe("workspace-scope helpers", () => {
  const testSession = {
    id: "user-1",
    userId: "user-1",
    email: "test@example.com",
    role: "BUYER" as const,
    workspace_id: "ws_test_default",
    workspace_mode: "TEST" as const,
  }

  const liveSession = {
    id: "user-2",
    userId: "user-2",
    email: "live@example.com",
    role: "BUYER" as const,
    workspace_id: "ws_live_default",
    workspace_mode: "LIVE" as const,
  }

  describe("workspaceScope", () => {
    it("returns workspaceId and isTest for TEST session", () => {
      const scope = workspaceScope(testSession)
      expect(scope.workspaceId).toBe("ws_test_default")
      expect(scope.isTest).toBe(true)
    })

    it("returns workspaceId and isTest=false for LIVE session", () => {
      const scope = workspaceScope(liveSession)
      expect(scope.workspaceId).toBe("ws_live_default")
      expect(scope.isTest).toBe(false)
    })

    it("throws when session is null", () => {
      expect(() => workspaceScope(null)).toThrow("session is required")
    })

    it("throws when session is undefined", () => {
      expect(() => workspaceScope(undefined)).toThrow("session is required")
    })

    it("throws when workspace_id is missing", () => {
      const noWs = { ...testSession, workspace_id: undefined }
      expect(() => workspaceScope(noWs as any)).toThrow("workspace_id is missing")
    })
  })

  describe("workspaceInsert", () => {
    it("returns an object with workspaceId for spreading into inserts", () => {
      const insert = workspaceInsert(testSession)
      expect(insert).toEqual({ workspaceId: "ws_test_default" })
    })

    it("returns LIVE workspaceId for live session", () => {
      const insert = workspaceInsert(liveSession)
      expect(insert).toEqual({ workspaceId: "ws_live_default" })
    })
  })

  describe("workspaceFilter", () => {
    it("applies workspaceId filter to a query-like object", () => {
      const filter = workspaceFilter(testSession)

      // Simulate a Supabase query builder with .eq()
      const calls: Array<{ col: string; val: string }> = []
      const mockQuery = {
        eq(col: string, val: string) {
          calls.push({ col, val })
          return mockQuery
        },
      }

      filter(mockQuery)
      expect(calls).toEqual([{ col: "workspaceId", val: "ws_test_default" }])
    })
  })
})
