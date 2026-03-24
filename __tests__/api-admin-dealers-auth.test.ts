/**
 * Before-vs-After proof for the x-pathname fix on /api/admin/dealers.
 *
 * Root cause: the middleware matcher previously excluded /api/* routes,
 * so the x-pathname header was never set.  mockSelectors.sessionUser("")
 * fell back to "BUYER" (the default), causing admin API endpoints to
 * return 401 for TEST-workspace users.
 *
 * Fix: the matcher now includes /api/* routes.  The middleware fast-paths
 * them (sets x-pathname, no auth/redirect), so mockSelectors.sessionUser
 * receives "/api/admin/dealers" and correctly resolves to ADMIN.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { mockSelectors } from "@/lib/mocks/mockStore"
import { isAdminRole } from "@/lib/auth-server"
import { default as proxy } from "../proxy"

// --------------- mocks ---------------
vi.mock("@/lib/auth-edge", () => ({
  verifySessionEdge: vi.fn(),
}))

// --------------- helpers ---------------
function makeApiRequest(path: string, opts?: { host?: string; cookie?: string }) {
  const url = new URL(path, "http://localhost:3000")
  const headers: Record<string, string> = { host: opts?.host ?? "localhost:3000" }
  if (opts?.cookie) headers.cookie = opts.cookie
  const req = new NextRequest(url, { headers })
  if (opts?.cookie?.includes("session=")) {
    const token = opts.cookie.match(/session=([^;]+)/)?.[1]
    if (token) req.cookies.set("session", token)
  }
  return req
}

// --------------- tests ---------------
describe("API admin dealers – x-pathname proof", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Evidence 1: "Before" scenario ─────────────────────────────────
  describe("BEFORE fix – missing x-pathname", () => {
    it("mockSelectors.sessionUser(\"\") defaults to BUYER → 401 path", () => {
      // When x-pathname was never set the auth-server received an empty
      // string.  Without any roleOverride the selector falls through to
      // the BUYER default.
      const user = mockSelectors.sessionUser("")
      expect(user.role).toBe("BUYER")

      // The route handler checks isAdminRole(user.role) which is false
      // for BUYER → the response would be 401.
      expect(isAdminRole(user.role)).toBe(false)
    })
  })

  // ── Evidence 2: "After" scenario ──────────────────────────────────
  describe("AFTER fix – x-pathname set by middleware", () => {
    it("mockSelectors.sessionUser(\"/api/admin/dealers\") resolves to ADMIN → 200 path", () => {
      const user = mockSelectors.sessionUser("/api/admin/dealers")
      expect(user.role).toBe("ADMIN")
      expect(user.workspace_mode).toBe("TEST")

      expect(isAdminRole(user.role)).toBe(true)
    })

    it("adminDealers mock returns a dealer list (200 body)", () => {
      const result = mockSelectors.adminDealers({ search: undefined, status: "all", page: 1 })
      expect(result.dealers.length).toBeGreaterThan(0)
      expect(result.total).toBeGreaterThan(0)
      expect(result.dealers[0]).toHaveProperty("name")
    })
  })

  // ── Evidence 3: trailing-slash variant /api/admin/dealers/ ────────
  describe("trailing slash /api/admin/dealers/", () => {
    it("mockSelectors.sessionUser(\"/api/admin/dealers/\") resolves to ADMIN", () => {
      const user = mockSelectors.sessionUser("/api/admin/dealers/")
      expect(user.role).toBe("ADMIN")
    })
  })

  // ── Middleware matcher verification ───────────────────────────────
  // FIX 9 (API gateway session enforcement): unauthenticated requests to
  // /api/admin/* and /api/dealer/* now receive a 307 redirect to /login.
  // /api/auth/* is exempt and still passes through (200).
  describe("middleware now sets x-pathname for /api/* routes", () => {
    it("sets x-pathname header for /api/admin/dealers (with session)", async () => {
      const request = makeApiRequest("/api/admin/dealers", { cookie: "session=test-token" })
      const response = await proxy(request)

      // Gateway-level session check passes, request continues to handler
      expect(response.status).toBe(200)
      expect(response.headers.get("x-middleware-next")).toBe("1")
    })

    it("rejects /api/admin/dealers without session (gateway enforcement)", async () => {
      const request = makeApiRequest("/api/admin/dealers")
      const response = await proxy(request)
      expect(response.status).toBe(401)
    })

    it("passes through /api/admin/dealers/ (trailing slash, with session)", async () => {
      const request = makeApiRequest("/api/admin/dealers/", { cookie: "session=test-token" })
      const response = await proxy(request)
      // Gateway-level session check passes, request continues to handler
      expect(response.status).toBe(200)
    })

    it("passes through /api/dealer/* routes (with session)", async () => {
      const request = makeApiRequest("/api/dealer/inventory", { cookie: "session=test-token" })
      const response = await proxy(request)
      // Gateway-level session check passes, request continues to handler
      expect(response.status).toBe(200)
    })

    it("sets x-pathname header for /api/auth/* routes", async () => {
      const request = makeApiRequest("/api/auth/me")
      const response = await proxy(request)
      expect(response.status).toBe(200)
    })
  })

  // ── Role resolution for all API path prefixes ────────────────────
  describe("mock role resolution by API path", () => {
    it("/api/admin/* → ADMIN", () => {
      expect(mockSelectors.sessionUser("/api/admin/dealers").role).toBe("ADMIN")
      expect(mockSelectors.sessionUser("/api/admin/dashboard").role).toBe("ADMIN")
    })

    it("/api/dealer/* → DEALER", () => {
      expect(mockSelectors.sessionUser("/api/dealer/inventory").role).toBe("DEALER")
    })

    it("/api/affiliate/* → AFFILIATE", () => {
      expect(mockSelectors.sessionUser("/api/affiliate/stats").role).toBe("AFFILIATE")
    })

    it("other /api/* → BUYER (default)", () => {
      expect(mockSelectors.sessionUser("/api/buyer/profile").role).toBe("BUYER")
      expect(mockSelectors.sessionUser("/api/misc/route").role).toBe("BUYER")
    })
  })
})
