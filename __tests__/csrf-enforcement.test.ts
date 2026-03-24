import { describe, it, expect } from "vitest"
import { generateCsrfToken, validateCsrf, ensureCsrfCookie } from "@/lib/middleware/csrf"
import { NextRequest, NextResponse } from "next/server"

function createRequest(
  method: string,
  url: string,
  opts?: { cookies?: Record<string, string>; headers?: Record<string, string> },
) {
  const req = new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers: opts?.headers ? new Headers(opts.headers) : new Headers(),
  })
  if (opts?.cookies) {
    for (const [name, value] of Object.entries(opts.cookies)) {
      req.cookies.set(name, value)
    }
  }
  return req
}

describe("CSRF Middleware", () => {
  describe("generateCsrfToken", () => {
    it("generates a 64-character hex string", () => {
      const token = generateCsrfToken()
      expect(token).toMatch(/^[0-9a-f]{64}$/)
    })

    it("generates unique tokens", () => {
      const a = generateCsrfToken()
      const b = generateCsrfToken()
      expect(a).not.toBe(b)
    })
  })

  describe("validateCsrf", () => {
    it("skips GET requests", () => {
      const req = createRequest("GET", "/api/users")
      expect(validateCsrf(req)).toBeNull()
    })

    it("skips requests without session cookie", () => {
      const req = createRequest("POST", "/api/users")
      expect(validateCsrf(req)).toBeNull()
    })

    it("skips webhook paths", () => {
      const req = createRequest("POST", "/api/webhooks/stripe", {
        cookies: { session: "abc" },
      })
      expect(validateCsrf(req)).toBeNull()
    })

    it("skips cron paths", () => {
      const req = createRequest("POST", "/api/cron/daily", {
        cookies: { session: "abc" },
      })
      expect(validateCsrf(req)).toBeNull()
    })

    it("skips /api/auth/signin path", () => {
      const req = createRequest("POST", "/api/auth/signin", {
        cookies: { session: "abc" },
      })
      expect(validateCsrf(req)).toBeNull()
    })

    it("skips /api/auth/signup path", () => {
      const req = createRequest("POST", "/api/auth/signup", {
        cookies: { session: "abc" },
      })
      expect(validateCsrf(req)).toBeNull()
    })

    it("skips /api/auth/signout path", () => {
      const req = createRequest("POST", "/api/auth/signout", {
        cookies: { session: "abc" },
      })
      expect(validateCsrf(req)).toBeNull()
    })

    it("skips /api/admin/auth/ paths", () => {
      const req = createRequest("POST", "/api/admin/auth/signin", {
        cookies: { session: "abc" },
      })
      expect(validateCsrf(req)).toBeNull()
    })

    it("returns error when CSRF token is missing", () => {
      const req = createRequest("POST", "/api/users", {
        cookies: { session: "abc" },
      })
      expect(validateCsrf(req)).toBe("Missing CSRF token")
    })

    it("returns error when tokens do not match", () => {
      const req = createRequest("POST", "/api/users", {
        cookies: { session: "abc", csrf_token: "aaaa" },
        headers: { "x-csrf-token": "bbbb" },
      })
      expect(validateCsrf(req)).toBe("Invalid CSRF token")
    })

    it("returns error for different-length tokens", () => {
      const req = createRequest("POST", "/api/users", {
        cookies: { session: "abc", csrf_token: "short" },
        headers: { "x-csrf-token": "longer_value" },
      })
      expect(validateCsrf(req)).toBe("Invalid CSRF token")
    })

    it("returns null when tokens match", () => {
      const token = generateCsrfToken()
      const req = createRequest("POST", "/api/users", {
        cookies: { session: "abc", csrf_token: token },
        headers: { "x-csrf-token": token },
      })
      expect(validateCsrf(req)).toBeNull()
    })

    it("validates for PUT method", () => {
      const token = generateCsrfToken()
      const req = createRequest("PUT", "/api/users/1", {
        cookies: { session: "abc", csrf_token: token },
        headers: { "x-csrf-token": token },
      })
      expect(validateCsrf(req)).toBeNull()
    })

    it("validates for DELETE method", () => {
      const token = generateCsrfToken()
      const req = createRequest("DELETE", "/api/users/1", {
        cookies: { session: "abc", csrf_token: token },
        headers: { "x-csrf-token": token },
      })
      expect(validateCsrf(req)).toBeNull()
    })

    it("validates for PATCH method", () => {
      const token = generateCsrfToken()
      const req = createRequest("PATCH", "/api/users/1", {
        cookies: { session: "abc", csrf_token: token },
        headers: { "x-csrf-token": token },
      })
      expect(validateCsrf(req)).toBeNull()
    })
  })

  describe("ensureCsrfCookie", () => {
    it("sets csrf_token cookie when not present", () => {
      const req = createRequest("GET", "/")
      const res = NextResponse.next()
      const result = ensureCsrfCookie(req, res)
      const cookie = result.cookies.get("csrf_token")
      expect(cookie).toBeDefined()
      expect(cookie?.value).toMatch(/^[0-9a-f]{64}$/)
    })

    it("does not overwrite existing csrf_token cookie", () => {
      const existing = "existing_csrf_token_value_for_testing_do_not_change"
      const req = createRequest("GET", "/", { cookies: { csrf_token: existing } })
      const res = NextResponse.next()
      const result = ensureCsrfCookie(req, res)
      // Should not have set a new cookie (existing one preserved)
      const cookie = result.cookies.get("csrf_token")
      // If the cookie was not re-set, it should be undefined on the response
      // (it's only on the request)
      expect(cookie).toBeUndefined()
    })
  })
})
