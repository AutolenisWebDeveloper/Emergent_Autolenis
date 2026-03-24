import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest, NextResponse } from "next/server"
import { default as proxy, extractHostname, getCookieValue } from "../proxy"

// Mock the auth-edge module
vi.mock("@/lib/auth-edge", () => ({
  verifySessionEdge: vi.fn(),
}))

describe("Middleware - Admin Subdomain Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe("Admin subdomain rewriting", () => {
    it("should rewrite admin.autolenis.com/dashboard to /admin/dashboard for authenticated users", async () => {
      const { verifySessionEdge } = await import("@/lib/auth-edge")
      vi.mocked(verifySessionEdge).mockResolvedValue({
        id: "test-user-id",
        userId: "test-user-id",
        email: "admin@test.com",
        role: "ADMIN",
        is_affiliate: false,
      })

      const request = new NextRequest(
        new URL("https://admin.autolenis.com/dashboard"),
        {
          headers: {
            host: "admin.autolenis.com",
          },
        }
      )
      request.cookies.set("session", "valid-token")

      const response = await proxy(request)

      // Should rewrite (not redirect)
      expect(response.headers.get("x-middleware-rewrite")).toBeTruthy()
    })

    it("should redirect to /sign-in when accessing admin.autolenis.com/dashboard without token", async () => {
      const request = new NextRequest(
        new URL("https://admin.autolenis.com/dashboard"),
        {
          headers: {
            host: "admin.autolenis.com",
          },
        }
      )

      const response = await proxy(request)

      // Should redirect to sign-in
      expect(response.status).toBe(307) // Redirect status
      expect(response.headers.get("location")).toContain("/sign-in")
    })

    it("should rewrite admin.autolenis.com/sign-in to /admin/sign-in (public route)", async () => {
      const request = new NextRequest(
        new URL("https://admin.autolenis.com/sign-in"),
        {
          headers: {
            host: "admin.autolenis.com",
          },
        }
      )

      const response = await proxy(request)

      // Should rewrite (not redirect) since it's a public route
      expect(response.headers.get("x-middleware-rewrite")).toBeTruthy()
    })

    it("should redirect non-admin users to access denied when accessing admin routes", async () => {
      const { verifySessionEdge } = await import("@/lib/auth-edge")
      vi.mocked(verifySessionEdge).mockResolvedValue({
        id: "test-user-id",
        userId: "test-user-id",
        email: "buyer@test.com",
        role: "BUYER",
        is_affiliate: false,
      })

      const request = new NextRequest(
        new URL("https://admin.autolenis.com/dashboard"),
        {
          headers: {
            host: "admin.autolenis.com",
          },
        }
      )
      request.cookies.set("session", "valid-token")

      const response = await proxy(request)

      // Should redirect to access denied
      expect(response.status).toBe(307) // Redirect status
      expect(response.headers.get("location")).toContain("/access-denied")
    })

    it("should allow SUPER_ADMIN role to access admin routes", async () => {
      const { verifySessionEdge } = await import("@/lib/auth-edge")
      vi.mocked(verifySessionEdge).mockResolvedValue({
        id: "test-user-id",
        userId: "test-user-id",
        email: "superadmin@test.com",
        role: "SUPER_ADMIN",
        is_affiliate: false,
      })

      const request = new NextRequest(
        new URL("https://admin.autolenis.com/dashboard"),
        {
          headers: {
            host: "admin.autolenis.com",
          },
        }
      )
      request.cookies.set("session", "valid-token")

      const response = await proxy(request)

      // Should rewrite (not redirect)
      expect(response.headers.get("x-middleware-rewrite")).toBeTruthy()
    })
  })

  describe("Main domain admin route handling", () => {
    it("should redirect to admin subdomain in production when accessing /admin routes from main domain", async () => {
      vi.stubEnv("NODE_ENV", "production")
      vi.stubEnv("ADMIN_SUBDOMAIN_ENABLED", "true")

      const request = new NextRequest(
        new URL("https://autolenis.com/admin/dashboard"),
        {
          headers: {
            host: "autolenis.com",
          },
        }
      )

      const response = await proxy(request)

      // Should redirect to admin subdomain
      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toBe(
        "https://admin.autolenis.com/dashboard"
      )
    })

    it("should keep admin routes on the main domain when admin subdomain is disabled in production", async () => {
      vi.stubEnv("NODE_ENV", "production")
      vi.stubEnv("ADMIN_SUBDOMAIN_ENABLED", "false")

      const request = new NextRequest(
        new URL("https://autolenis.com/admin/dashboard"),
        {
          headers: {
            host: "autolenis.com",
          },
        }
      )

      const response = await proxy(request)

      // Should redirect to the main-domain admin sign-in instead of the subdomain
      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toContain("/admin/sign-in")
      expect(response.headers.get("location")).not.toContain("admin.autolenis.com")
    })

    it("should not redirect to admin subdomain in development", async () => {
      vi.stubEnv("NODE_ENV", "development")
      vi.stubEnv("ADMIN_SUBDOMAIN_ENABLED", "true")

      const { verifySessionEdge } = await import("@/lib/auth-edge")
      vi.mocked(verifySessionEdge).mockResolvedValue({
        id: "test-user-id",
        userId: "test-user-id",
        email: "admin@test.com",
        role: "ADMIN",
        is_affiliate: false,
      })

      const request = new NextRequest(
        new URL("http://localhost:3000/admin/dashboard"),
        {
          headers: {
            host: "localhost:3000",
          },
        }
      )
      request.cookies.set("session", "valid-token")

      const response = await proxy(request)

      // Should not redirect in development
      expect(response.status).not.toBe(307)
    })
  })

  describe("Middleware helpers", () => {
    it("should parse IPv6 and IPv4 hosts correctly", () => {
      expect(extractHostname("[::1]:3000")).toBe("::1")
      expect(extractHostname("localhost:3000")).toBe("localhost")
    })

    it("should pass through malformed host inputs unchanged", () => {
      expect(extractHostname("[::1")).toBe("[::1")
      expect(extractHostname("[::1]oops")).toBe("[::1]oops")
      expect(extractHostname("::1]")).toBe("::1]")
    })

    it("should parse cookie values with fallbacks", () => {
      expect(getCookieValue("theme=dark; session=valid-token ", "session")).toBe("valid-token")
      expect(getCookieValue("session=valid-token; theme=dark", "session")).toBe("valid-token")
      expect(getCookieValue("session=%20token", "session")).toBe(" token")
      expect(getCookieValue("session=%7Btoken%7D", "session")).toBe("{token}")
      expect(() => getCookieValue("session=%E0%A4%A", "session")).not.toThrow()
      expect(getCookieValue("session=%E0%A4%A", "session")).toBe("%E0%A4%A")
      expect(getCookieValue("theme=dark", "session")).toBeUndefined()
    })
  })
})
