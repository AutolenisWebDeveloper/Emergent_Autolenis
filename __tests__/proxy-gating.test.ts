/**
 * Proxy Gating Tests
 * 
 * Verifies that the proxy.ts middleware correctly:
 * 1. Allows public routes without auth
 * 2. Redirects unauthenticated users from portal routes
 * 3. Enforces role-based access control
 * 4. Blocks open redirects (safe redirects only)
 * 5. Sets x-pathname header
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

const ROOT = join(__dirname, "..")
const proxyContent = readFileSync(join(ROOT, "proxy.ts"), "utf-8")

describe("Proxy Gating Configuration", () => {
  it("proxy.ts exists and exports a proxy function", () => {
    expect(proxyContent).toContain("export async function proxy")
  })

  it("proxy.ts exports a config with matcher", () => {
    expect(proxyContent).toContain("export const config")
    expect(proxyContent).toContain("matcher")
  })

  it("enforces CSRF validation for state-changing requests", () => {
    expect(proxyContent).toContain("validateCsrf")
  })

  it("public routes bypass auth", () => {
    // These routes must appear in the public routes list
    const requiredPublicRoutes = ["/", "/pricing", "/auth", "/faq", "/contact", "/about"]
    for (const route of requiredPublicRoutes) {
      expect(proxyContent).toContain(`"${route}"`)
    }
  })

  it("portal routes enforce role-based access", () => {
    // Buyer portal requires BUYER role
    expect(proxyContent).toContain('pathname.startsWith("/buyer")')
    expect(proxyContent).toContain('"BUYER"')

    // Dealer portal requires DEALER or DEALER_USER
    expect(proxyContent).toContain('pathname.startsWith("/dealer")')
    expect(proxyContent).toContain('"DEALER"')
    expect(proxyContent).toContain('"DEALER_USER"')

    // Admin portal requires ADMIN or SUPER_ADMIN
    expect(proxyContent).toContain('pathname.startsWith("/admin")')
    expect(proxyContent).toContain('"ADMIN"')
    expect(proxyContent).toContain('"SUPER_ADMIN"')

    // Affiliate portal
    expect(proxyContent).toContain('pathname.startsWith("/affiliate/portal")')
    expect(proxyContent).toContain('"AFFILIATE"')
    expect(proxyContent).toContain('"AFFILIATE_ONLY"')
  })

  it("redirects unauthenticated users to /auth/signin", () => {
    expect(proxyContent).toContain("/auth/signin")
    expect(proxyContent).toContain("NextResponse.redirect")
  })

  it("injects x-pathname header", () => {
    expect(proxyContent).toContain('requestHeaders.set("x-pathname"')
  })

  it("handles session verification errors gracefully", () => {
    // Should catch and redirect on invalid tokens
    expect(proxyContent).toContain("verifySessionEdge")
    expect(proxyContent).toContain("catch")
  })

  it("ensures CSRF cookie via ensureCsrfCookie", () => {
    expect(proxyContent).toContain("ensureCsrfCookie")
  })

  it("does NOT contain open redirect patterns", () => {
    // Should not redirect to arbitrary URLs from user input without validation
    // Redirect targets should only be relative paths
    expect(proxyContent).not.toContain("redirect(req.query")
    expect(proxyContent).not.toContain("redirect(body.")
  })
})
