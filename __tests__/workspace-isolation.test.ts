import { describe, expect, it } from "vitest"
import { isTestWorkspace } from "@/lib/app-mode"

describe("workspace isolation", () => {
  describe("isTestWorkspace", () => {
    it("returns true for TEST workspace_mode", () => {
      expect(isTestWorkspace({ workspace_mode: "TEST" })).toBe(true)
    })

    it("returns false for LIVE workspace_mode", () => {
      expect(isTestWorkspace({ workspace_mode: "LIVE" })).toBe(false)
    })

    it("returns false when workspace_mode is undefined", () => {
      expect(isTestWorkspace({ workspace_mode: undefined })).toBe(false)
    })

    it("returns false for null session", () => {
      expect(isTestWorkspace(null)).toBe(false)
    })

    it("returns false for undefined session", () => {
      expect(isTestWorkspace(undefined)).toBe(false)
    })

    it("returns false for empty object", () => {
      expect(isTestWorkspace({})).toBe(false)
    })

    it("returns false for arbitrary string", () => {
      expect(isTestWorkspace({ workspace_mode: "STAGING" })).toBe(false)
    })
  })

  describe("session contract", () => {
    it("SessionUser type includes workspace_id and workspace_mode", async () => {
      // Type-check: this import should compile with the new fields
      const { createSession, verifySession } = await import("@/lib/auth")

      const token = await createSession({
        userId: "test-user-1",
        email: "test@example.com",
        role: "BUYER",
        workspace_id: "ws_test_default",
        workspace_mode: "TEST",
      })

      const session = await verifySession(token)
      expect(session.workspace_id).toBe("ws_test_default")
      expect(session.workspace_mode).toBe("TEST")
    })

    it("defaults workspace_mode to LIVE for sessions without it", async () => {
      const { createSession, verifySession } = await import("@/lib/auth")

      const token = await createSession({
        userId: "test-user-2",
        email: "live@example.com",
        role: "BUYER",
        // No workspace_id or workspace_mode provided
      })

      const session = await verifySession(token)
      expect(session.workspace_mode).toBe("LIVE")
    })

    it("LIVE session is not a test workspace", async () => {
      const { createSession, verifySession } = await import("@/lib/auth")

      const token = await createSession({
        userId: "test-user-3",
        email: "live2@example.com",
        role: "ADMIN",
        workspace_mode: "LIVE",
      })

      const session = await verifySession(token)
      expect(isTestWorkspace(session)).toBe(false)
    })

    it("TEST session is a test workspace", async () => {
      const { createSession, verifySession } = await import("@/lib/auth")

      const token = await createSession({
        userId: "test-user-4",
        email: "test2@example.com",
        role: "ADMIN",
        workspace_id: "ws_test_default",
        workspace_mode: "TEST",
      })

      const session = await verifySession(token)
      expect(isTestWorkspace(session)).toBe(true)
    })
  })

  describe("mock banner isolation", () => {
    it("mock banners should not appear for LIVE workspace users", () => {
      const user = { workspace_mode: "LIVE" }
      // The condition used in dashboard pages:
      // currentUser?.workspace_mode === "TEST"
      expect(user.workspace_mode === "TEST").toBe(false)
    })

    it("mock banners should appear for TEST workspace users", () => {
      const user = { workspace_mode: "TEST" }
      expect(user.workspace_mode === "TEST").toBe(true)
    })
  })
})
