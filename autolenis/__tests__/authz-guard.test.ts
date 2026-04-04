import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the auth-server module
vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}))

// Mock the CSRF module
vi.mock("@/lib/middleware/csrf", () => ({
  validateCsrf: vi.fn(),
}))

import { withAuth, type AuthContext } from "@/lib/authz/guard"
import { getSession } from "@/lib/auth-server"
import { validateCsrf } from "@/lib/middleware/csrf"
import { NextRequest, NextResponse } from "next/server"
import { ADMIN_ROLES, DEALER_ROLES, BUYER_ROLES } from "@/lib/authz/roles"

function createRequest(method = "GET", url = "/api/test") {
  return new NextRequest(new URL(url, "http://localhost:3000"), { method })
}

function isErrorResponse(result: AuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}

describe("withAuth guard", () => {
  beforeEach(() => {
    vi.mocked(getSession).mockReset()
    vi.mocked(validateCsrf).mockReset()
    vi.mocked(validateCsrf).mockReturnValue(null) // no CSRF error by default
  })

  it("returns 401 when no session exists", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const result = await withAuth(createRequest())
    expect(isErrorResponse(result)).toBe(true)
    if (isErrorResponse(result)) {
      expect(result.status).toBe(401)
      const body = await result.json()
      expect(body.error.code).toBe("UNAUTHENTICATED")
      expect(body.correlationId).toBeDefined()
    }
  })

  it("returns 403 when role does not match", async () => {
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "buyer@test.com",
      role: "BUYER",
    })
    const result = await withAuth(createRequest(), { roles: ADMIN_ROLES })
    expect(isErrorResponse(result)).toBe(true)
    if (isErrorResponse(result)) {
      expect(result.status).toBe(403)
      const body = await result.json()
      expect(body.error.code).toBe("FORBIDDEN")
    }
  })

  it("returns AuthContext when role matches", async () => {
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "admin@test.com",
      role: "ADMIN",
      workspace_id: "ws1",
      session_version: 3,
    })
    const result = await withAuth(createRequest(), { roles: ADMIN_ROLES })
    expect(isErrorResponse(result)).toBe(false)
    if (!isErrorResponse(result)) {
      expect(result.userId).toBe("u1")
      expect(result.email).toBe("admin@test.com")
      expect(result.role).toBe("ADMIN")
      expect(result.workspaceId).toBe("ws1")
      expect(result.correlationId).toBeDefined()
    }
  })

  it("allows any authenticated user when no roles specified", async () => {
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "user@test.com",
      role: "BUYER",
    })
    const result = await withAuth(createRequest())
    expect(isErrorResponse(result)).toBe(false)
  })

  it("returns 403 when CSRF validation fails", async () => {
    vi.mocked(validateCsrf).mockReturnValue("Missing CSRF token")
    const result = await withAuth(createRequest("POST", "/api/test"))
    expect(isErrorResponse(result)).toBe(true)
    if (isErrorResponse(result)) {
      expect(result.status).toBe(403)
      const body = await result.json()
      expect(body.error.code).toBe("CSRF_INVALID")
    }
  })

  it("skips CSRF when csrf option is false", async () => {
    vi.mocked(validateCsrf).mockReturnValue("Missing CSRF token")
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "user@test.com",
      role: "BUYER",
    })
    const result = await withAuth(createRequest("POST", "/api/test"), { csrf: false })
    expect(isErrorResponse(result)).toBe(false)
  })

  it("DEALER role is blocked from buyer-only endpoints", async () => {
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "dealer@test.com",
      role: "DEALER",
    })
    const result = await withAuth(createRequest(), { roles: BUYER_ROLES })
    expect(isErrorResponse(result)).toBe(true)
    if (isErrorResponse(result)) {
      expect(result.status).toBe(403)
    }
  })

  it("BUYER role is blocked from dealer-only endpoints", async () => {
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "buyer@test.com",
      role: "BUYER",
    })
    const result = await withAuth(createRequest(), { roles: DEALER_ROLES })
    expect(isErrorResponse(result)).toBe(true)
    if (isErrorResponse(result)) {
      expect(result.status).toBe(403)
    }
  })

  it("SUPER_ADMIN is treated as admin", async () => {
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "super@test.com",
      role: "SUPER_ADMIN",
    })
    const result = await withAuth(createRequest(), { roles: ADMIN_ROLES })
    expect(isErrorResponse(result)).toBe(false)
  })

  // ─── MFA enforcement ─────────────────────────────────────────────────────

  it("returns 403 MFA_REQUIRED when requireMfa is set and admin session lacks mfa_verified", async () => {
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "admin@test.com",
      role: "ADMIN",
      mfa_verified: false,
    })
    const result = await withAuth(createRequest(), { roles: ADMIN_ROLES, requireMfa: true })
    expect(isErrorResponse(result)).toBe(true)
    if (isErrorResponse(result)) {
      expect(result.status).toBe(403)
      const body = await result.json()
      expect(body.error.code).toBe("MFA_REQUIRED")
    }
  })

  it("returns 403 MFA_REQUIRED when requireMfa is set and admin session has no mfa_verified field", async () => {
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "admin@test.com",
      role: "ADMIN",
    })
    const result = await withAuth(createRequest(), { roles: ADMIN_ROLES, requireMfa: true })
    expect(isErrorResponse(result)).toBe(true)
    if (isErrorResponse(result)) {
      expect(result.status).toBe(403)
      const body = await result.json()
      expect(body.error.code).toBe("MFA_REQUIRED")
    }
  })

  it("allows admin with mfa_verified=true on requireMfa routes", async () => {
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "admin@test.com",
      role: "ADMIN",
      mfa_verified: true,
    })
    const result = await withAuth(createRequest(), { roles: ADMIN_ROLES, requireMfa: true })
    expect(isErrorResponse(result)).toBe(false)
    if (!isErrorResponse(result)) {
      expect(result.userId).toBe("u1")
      expect(result.role).toBe("ADMIN")
    }
  })

  it("allows SUPER_ADMIN with mfa_verified=true on requireMfa routes", async () => {
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "super@test.com",
      role: "SUPER_ADMIN",
      mfa_verified: true,
    })
    const result = await withAuth(createRequest(), { roles: ADMIN_ROLES, requireMfa: true })
    expect(isErrorResponse(result)).toBe(false)
  })

  it("does not enforce MFA on non-admin roles even when requireMfa is set", async () => {
    vi.mocked(getSession).mockResolvedValue({
      id: "u1",
      userId: "u1",
      email: "buyer@test.com",
      role: "BUYER",
    })
    const result = await withAuth(createRequest(), { requireMfa: true })
    expect(isErrorResponse(result)).toBe(false)
  })
})
