import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { default as proxy } from "../proxy"

// Mock the auth-edge module
vi.mock("@/lib/auth-edge", () => ({
  verifySessionEdge: vi.fn(),
}))

describe("Middleware - /test/* route guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return 404 for /test/* when workspace_mode is LIVE", async () => {
    const { verifySessionEdge } = await import("@/lib/auth-edge")
    vi.mocked(verifySessionEdge).mockResolvedValue({
      userId: "user-1",
      id: "user-1",
      email: "live@test.com",
      role: "ADMIN",
      is_affiliate: false,
      workspace_mode: "LIVE",
    })

    const request = new NextRequest(new URL("http://localhost:3000/test/dashboard"), {
      headers: { host: "localhost:3000" },
    })
    request.cookies.set("session", "valid-token")

    const response = await proxy(request)
    expect(response.status).toBe(404)
  })

  it("should return 404 for /test/* when workspace_mode is undefined (defaults to LIVE)", async () => {
    const { verifySessionEdge } = await import("@/lib/auth-edge")
    vi.mocked(verifySessionEdge).mockResolvedValue({
      userId: "user-2",
      id: "user-2",
      email: "old@test.com",
      role: "ADMIN",
      is_affiliate: false,
      // No workspace_mode - old session format
    })

    const request = new NextRequest(new URL("http://localhost:3000/test/dashboard"), {
      headers: { host: "localhost:3000" },
    })
    request.cookies.set("session", "valid-token")

    const response = await proxy(request)
    expect(response.status).toBe(404)
  })

  it("should allow /test/* when workspace_mode is TEST", async () => {
    const { verifySessionEdge } = await import("@/lib/auth-edge")
    vi.mocked(verifySessionEdge).mockResolvedValue({
      userId: "user-3",
      id: "user-3",
      email: "test@test.com",
      role: "SYSTEM_AGENT",
      is_affiliate: false,
      workspace_mode: "TEST",
    })

    const request = new NextRequest(new URL("http://localhost:3000/test/dashboard"), {
      headers: { host: "localhost:3000" },
    })
    request.cookies.set("session", "valid-token")

    const response = await proxy(request)
    expect(response.status).not.toBe(404)
    expect(response.status).not.toBe(403)
  })

  it("should redirect to signin for /test/* without session", async () => {
    const request = new NextRequest(new URL("http://localhost:3000/test/dashboard"), {
      headers: { host: "localhost:3000" },
    })
    // No session cookie

    const response = await proxy(request)
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/auth/signin")
  })

  it("should NOT bypass auth for any env-var-based mock mode", async () => {
    // Verify that even if someone sets a mock mode env var, auth is still required
    // (isMockMode/NEXT_PUBLIC_APP_MODE has been removed; this confirms no regression)

    // Without session, should still redirect to signin for protected routes
    const request = new NextRequest(new URL("http://localhost:3000/buyer/dashboard"), {
      headers: { host: "localhost:3000" },
    })

    const response = await proxy(request)
    // Should redirect to signin since auth is always required
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/auth/signin")
  })
})
