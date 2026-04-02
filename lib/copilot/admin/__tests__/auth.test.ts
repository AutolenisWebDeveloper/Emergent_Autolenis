import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock admin-auth to control session
vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: vi.fn(),
}))

// Mock rate limiter
vi.mock("@/lib/middleware/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue(null),
}))

// Mock orchestrator
vi.mock("@/lib/copilot/admin/orchestrator", () => ({
  runAdminOrchestrator: vi.fn().mockResolvedValue({
    renderState: "text_response",
    text: "Admin response",
    intent: "FALLBACK",
  }),
}))

import { getAdminSession } from "@/lib/admin-auth"
import { POST } from "@/app/api/copilot/admin/route"

const mockGetAdminSession = getAdminSession as ReturnType<typeof vi.fn>

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/copilot/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

const validBody = {
  message: "Look up deal",
  context: {
    variant: "admin",
    route: "/admin",
    sessionId: "session-123",
  },
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(vi.fn()).mockResolvedValue(null)
})

describe("Admin Copilot Auth — standard JWT alone is insufficient", () => {
  it("returns 401 when no admin session exists", async () => {
    mockGetAdminSession.mockResolvedValue(null)

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe("UNAUTHORIZED")
  })
})

describe("Admin Copilot Auth — MFA-unconfirmed session rejected 401", () => {
  it("returns 401 when mfaVerified is false", async () => {
    mockGetAdminSession.mockResolvedValue({
      userId: "admin-001",
      email: "admin@test.com",
      role: "ADMIN",
      mfaVerified: false,
      mfaEnrolled: true,
      requiresPasswordReset: false,
    })

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
    const body = await res.json() as { error: { code: string } }
    expect(body.error.code).toBe("MFA_REQUIRED")
  })
})

describe("Admin Copilot Auth — valid admin session accepted", () => {
  it("returns 200 when session is valid and MFA verified", async () => {
    mockGetAdminSession.mockResolvedValue({
      userId: "admin-001",
      email: "admin@test.com",
      role: "ADMIN",
      mfaVerified: true,
      mfaEnrolled: true,
      requiresPasswordReset: false,
    })

    const { rateLimit } = await import("@/lib/middleware/rate-limit")
    vi.mocked(rateLimit).mockResolvedValue(null)

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(true)
  })
})

describe("Admin Copilot Auth — validation errors", () => {
  it("returns 400 for missing message", async () => {
    mockGetAdminSession.mockResolvedValue({
      userId: "admin-001",
      email: "admin@test.com",
      role: "ADMIN",
      mfaVerified: true,
      mfaEnrolled: true,
      requiresPasswordReset: false,
    })

    const res = await POST(
      makeRequest({
        context: { variant: "admin", route: "/admin", sessionId: "s1" },
      }),
    )
    expect(res.status).toBe(400)
  })
})
