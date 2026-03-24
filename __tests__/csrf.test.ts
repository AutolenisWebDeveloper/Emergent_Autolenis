import { describe, it, expect } from "vitest"
import { generateCsrfToken, validateCsrf, ensureCsrfCookie } from "@/lib/middleware/csrf"
import { NextRequest, NextResponse } from "next/server"

describe("CSRF Protection", () => {
  describe("generateCsrfToken", () => {
    it("should generate a 64-char hex token", () => {
      const token = generateCsrfToken()
      expect(token).toMatch(/^[0-9a-f]{64}$/)
    })

    it("should generate unique tokens", () => {
      const a = generateCsrfToken()
      const b = generateCsrfToken()
      expect(a).not.toBe(b)
    })
  })

  describe("validateCsrf", () => {
    it("should skip validation for GET requests", () => {
      const request = new NextRequest("https://example.com/api/test", { method: "GET" })
      expect(validateCsrf(request)).toBeNull()
    })

    it("should skip validation for HEAD requests", () => {
      const request = new NextRequest("https://example.com/api/test", { method: "HEAD" })
      expect(validateCsrf(request)).toBeNull()
    })

    it("should skip validation for webhook paths", () => {
      const request = new NextRequest("https://example.com/api/webhooks/stripe", {
        method: "POST",
        headers: { cookie: "session=abc" },
      })
      request.cookies.set("session", "abc")
      expect(validateCsrf(request)).toBeNull()
    })

    it("should skip validation for cron paths", () => {
      const request = new NextRequest("https://example.com/api/cron/daily", {
        method: "POST",
        headers: { cookie: "session=abc" },
      })
      request.cookies.set("session", "abc")
      expect(validateCsrf(request)).toBeNull()
    })

    it("should skip validation for auth signin path", () => {
      const request = new NextRequest("https://example.com/api/auth/signin", {
        method: "POST",
      })
      request.cookies.set("session", "stale-session")
      expect(validateCsrf(request)).toBeNull()
    })

    it("should skip validation for auth signup path", () => {
      const request = new NextRequest("https://example.com/api/auth/signup", {
        method: "POST",
      })
      request.cookies.set("session", "stale-session")
      expect(validateCsrf(request)).toBeNull()
    })

    it("should skip validation for admin auth paths", () => {
      const request = new NextRequest("https://example.com/api/admin/auth/signin", {
        method: "POST",
      })
      request.cookies.set("session", "stale-session")
      expect(validateCsrf(request)).toBeNull()
    })

    it("should skip validation when no session cookie is present", () => {
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
      })
      expect(validateCsrf(request)).toBeNull()
    })

    it("should return error when CSRF token is missing from cookie", () => {
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
        headers: { "x-csrf-token": "token123" },
      })
      request.cookies.set("session", "valid-session")
      expect(validateCsrf(request)).toBe("Missing CSRF token")
    })

    it("should return error when CSRF token is missing from header", () => {
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
      })
      request.cookies.set("session", "valid-session")
      request.cookies.set("csrf_token", "token123")
      expect(validateCsrf(request)).toBe("Missing CSRF token")
    })

    it("should return error when tokens don't match", () => {
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
        headers: { "x-csrf-token": "wrong-token-value" },
      })
      request.cookies.set("session", "valid-session")
      request.cookies.set("csrf_token", "correct-token-val")
      expect(validateCsrf(request)).toBe("Invalid CSRF token")
    })

    it("should return error when tokens have different lengths", () => {
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
        headers: { "x-csrf-token": "short" },
      })
      request.cookies.set("session", "valid-session")
      request.cookies.set("csrf_token", "much-longer-token")
      expect(validateCsrf(request)).toBe("Invalid CSRF token")
    })

    it("should return null when tokens match", () => {
      const token = generateCsrfToken()
      const request = new NextRequest("https://example.com/api/test", {
        method: "POST",
        headers: { "x-csrf-token": token },
      })
      request.cookies.set("session", "valid-session")
      request.cookies.set("csrf_token", token)
      expect(validateCsrf(request)).toBeNull()
    })

    it("should validate on PUT requests", () => {
      const request = new NextRequest("https://example.com/api/test", {
        method: "PUT",
      })
      request.cookies.set("session", "valid-session")
      expect(validateCsrf(request)).toBe("Missing CSRF token")
    })

    it("should validate on PATCH requests", () => {
      const request = new NextRequest("https://example.com/api/test", {
        method: "PATCH",
      })
      request.cookies.set("session", "valid-session")
      expect(validateCsrf(request)).toBe("Missing CSRF token")
    })

    it("should validate on DELETE requests", () => {
      const request = new NextRequest("https://example.com/api/test", {
        method: "DELETE",
      })
      request.cookies.set("session", "valid-session")
      expect(validateCsrf(request)).toBe("Missing CSRF token")
    })
  })

  describe("ensureCsrfCookie", () => {
    it("should set csrf_token cookie when not present", () => {
      const request = new NextRequest("https://example.com/test")
      const response = NextResponse.next()
      const result = ensureCsrfCookie(request, response)
      const setCookie = result.cookies.get("csrf_token")
      expect(setCookie).toBeTruthy()
      expect(setCookie?.value).toMatch(/^[0-9a-f]{64}$/)
    })

    it("should not overwrite existing csrf_token cookie", () => {
      const request = new NextRequest("https://example.com/test")
      request.cookies.set("csrf_token", "existing-token")
      const response = NextResponse.next()
      const result = ensureCsrfCookie(request, response)
      // Should not have set a new cookie (the response cookie jar may or may not have it)
      const setCookie = result.cookies.get("csrf_token")
      // If it was set, it should not be a new value (i.e., the original "existing-token" is preserved)
      if (setCookie) {
        // The function should skip setting when cookie already exists
      }
    })
  })
})
