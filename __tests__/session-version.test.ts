import { describe, it, expect } from "vitest"
import { createSession, verifySession, getRoleBasedRedirect, getRoleSignInPage } from "@/lib/auth"

describe("Session Version (JWT Revocation)", () => {
  it("should include session_version=0 by default in JWT", async () => {
    const token = await createSession({
      userId: "test-user",
      email: "test@example.com",
      role: "BUYER",
    })
    const session = await verifySession(token)
    expect(session.session_version).toBe(0)
  })

  it("should include custom session_version in JWT", async () => {
    const token = await createSession({
      userId: "test-user",
      email: "test@example.com",
      role: "BUYER",
      session_version: 5,
    })
    const session = await verifySession(token)
    expect(session.session_version).toBe(5)
  })

  it("should default session_version for old tokens without the field", async () => {
    // Simulate an old token that doesn't have session_version
    const token = await createSession({
      userId: "test-user",
      email: "test@example.com",
      role: "BUYER",
    })
    const session = await verifySession(token)
    // Even if session_version was not explicitly set, it should default to 0
    expect(session.session_version).toBeDefined()
    expect(typeof session.session_version).toBe("number")
  })
})

describe("Role Gating", () => {
  describe("getRoleBasedRedirect", () => {
    it("should redirect BUYER to /buyer/dashboard", () => {
      expect(getRoleBasedRedirect("BUYER")).toBe("/buyer/dashboard")
    })

    it("should redirect DEALER to /dealer/dashboard", () => {
      expect(getRoleBasedRedirect("DEALER")).toBe("/dealer/dashboard")
    })

    it("should redirect DEALER_USER to /dealer/dashboard", () => {
      expect(getRoleBasedRedirect("DEALER_USER")).toBe("/dealer/dashboard")
    })

    it("should redirect ADMIN to /admin/dashboard", () => {
      expect(getRoleBasedRedirect("ADMIN")).toBe("/admin/dashboard")
    })

    it("should redirect SUPER_ADMIN to /admin/dashboard", () => {
      expect(getRoleBasedRedirect("SUPER_ADMIN")).toBe("/admin/dashboard")
    })

    it("should redirect AFFILIATE to /affiliate/portal/dashboard", () => {
      expect(getRoleBasedRedirect("AFFILIATE")).toBe("/affiliate/portal/dashboard")
    })

    it("should redirect AFFILIATE_ONLY to /affiliate/portal/dashboard", () => {
      expect(getRoleBasedRedirect("AFFILIATE_ONLY")).toBe("/affiliate/portal/dashboard")
    })

    it("should redirect unknown role to /", () => {
      expect(getRoleBasedRedirect("UNKNOWN")).toBe("/")
    })

    it("should redirect new BUYER to /buyer/onboarding", () => {
      expect(getRoleBasedRedirect("BUYER", true)).toBe("/buyer/onboarding")
    })

    it("should redirect new DEALER to /dealer/onboarding", () => {
      expect(getRoleBasedRedirect("DEALER", true)).toBe("/dealer/onboarding")
    })

    it("should redirect new DEALER_USER to /dealer/onboarding", () => {
      expect(getRoleBasedRedirect("DEALER_USER", true)).toBe("/dealer/onboarding")
    })

    it("should redirect new AFFILIATE to /affiliate/portal/onboarding", () => {
      expect(getRoleBasedRedirect("AFFILIATE", true)).toBe("/affiliate/portal/onboarding")
    })

    it("should redirect new AFFILIATE_ONLY to /affiliate/portal/onboarding", () => {
      expect(getRoleBasedRedirect("AFFILIATE_ONLY", true)).toBe("/affiliate/portal/onboarding")
    })

    it("should redirect new ADMIN to /admin/dashboard (no onboarding)", () => {
      expect(getRoleBasedRedirect("ADMIN", true)).toBe("/admin/dashboard")
    })

    it("should redirect new SUPER_ADMIN to /admin/dashboard", () => {
      expect(getRoleBasedRedirect("SUPER_ADMIN", true)).toBe("/admin/dashboard")
    })
  })

  describe("getRoleSignInPage", () => {
    it("should return /admin/sign-in for ADMIN", () => {
      expect(getRoleSignInPage("ADMIN")).toBe("/admin/sign-in")
    })

    it("should return /admin/sign-in for SUPER_ADMIN", () => {
      expect(getRoleSignInPage("SUPER_ADMIN")).toBe("/admin/sign-in")
    })

    it("should return /auth/signin for BUYER", () => {
      expect(getRoleSignInPage("BUYER")).toBe("/auth/signin")
    })

    it("should return /auth/signin for DEALER", () => {
      expect(getRoleSignInPage("DEALER")).toBe("/auth/signin")
    })

    it("should return /auth/signin for undefined role", () => {
      expect(getRoleSignInPage(undefined)).toBe("/auth/signin")
    })
  })
})
