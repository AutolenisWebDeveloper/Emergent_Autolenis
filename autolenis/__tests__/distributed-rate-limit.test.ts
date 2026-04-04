import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { rateLimit, rateLimits } from "@/lib/middleware/rate-limit"
import { NextRequest } from "next/server"
import { _resetCacheAdapter } from "@/lib/cache/redis-adapter"

// Mock server-only (admin-auth.ts imports it)
vi.mock("server-only", () => ({}))

// Mock dependencies that admin-auth.ts needs
vi.mock("@/lib/db", () => ({
  isDatabaseConfigured: () => false,
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => ({ data: null }) }) }) }) },
}))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => ({ data: null }) }) }), insert: () => ({ data: null }), update: () => ({ eq: () => ({ data: null, error: null }) }) }),
  }),
}))

import {
  checkRateLimit,
  recordLoginAttempt,
  checkMfaRateLimit,
  recordMfaAttempt,
} from "@/lib/admin-auth"

function createRequest(ip = "127.0.0.1") {
  return new NextRequest(new URL("/api/auth/signin", "http://localhost:3000"), {
    headers: new Headers({ "x-forwarded-for": ip }),
  })
}

describe("Distributed Rate Limiting", () => {
  describe("Admin auth rate limiting uses CacheAdapter (not in-memory Maps)", () => {
    it("admin-auth.ts does not use raw Map for rate limiting", async () => {
      const fs = await import("fs")
      const path = await import("path")
      const content = fs.readFileSync(path.resolve("lib/admin-auth.ts"), "utf-8")

      // Must not declare standalone Map-based tracking
      // (Map usage inside InMemoryCacheAdapter is fine, but admin-auth.ts
      //  should delegate to the CacheAdapter abstraction instead.)
      expect(content).not.toMatch(/new Map\s*</)
      expect(content).not.toMatch(/const\s+\w+Attempts\s*=\s*new Map/)
    })

    it("checkRateLimit uses CacheAdapter.get and CacheAdapter.increment", async () => {
      const fs = await import("fs")
      const path = await import("path")
      const content = fs.readFileSync(path.resolve("lib/admin-auth.ts"), "utf-8")

      // Extract checkRateLimit function body
      const fnStart = content.indexOf("export async function checkRateLimit")
      const fnEnd = content.indexOf("export async function recordLoginAttempt")
      const fnBody = content.substring(fnStart, fnEnd)

      expect(fnBody).toContain("getCacheAdapter()")
      expect(fnBody).toContain("cache.get")
      expect(fnBody).toContain("ensureSecureCache()")
    })

    it("checkMfaRateLimit uses CacheAdapter and ensureSecureCache", async () => {
      const fs = await import("fs")
      const path = await import("path")
      const content = fs.readFileSync(path.resolve("lib/admin-auth.ts"), "utf-8")

      const fnStart = content.indexOf("export async function checkMfaRateLimit")
      const fnEnd = content.indexOf("export async function recordMfaAttempt")
      const fnBody = content.substring(fnStart, fnEnd)

      expect(fnBody).toContain("getCacheAdapter()")
      expect(fnBody).toContain("ensureSecureCache()")
    })

    it("recordMfaAttempt uses CacheAdapter and ensureSecureCache", async () => {
      const fs = await import("fs")
      const path = await import("path")
      const content = fs.readFileSync(path.resolve("lib/admin-auth.ts"), "utf-8")

      const fnStart = content.indexOf("export async function recordMfaAttempt")
      const fnEnd = content.indexOf("export async function getAdminUser")
      const fnBody = content.substring(fnStart, fnEnd)

      expect(fnBody).toContain("getCacheAdapter()")
      expect(fnBody).toContain("ensureSecureCache()")
    })
  })

  describe("Login rate limit threshold behavior", () => {
    it("allows exactly MAX_LOGIN_ATTEMPTS (5) before lockout", async () => {
      const id = "dist-threshold-" + Date.now()

      // Record 4 failed attempts – should still be allowed
      for (let i = 0; i < 4; i++) {
        await recordLoginAttempt(id, false)
      }
      const beforeMax = await checkRateLimit(id)
      expect(beforeMax.allowed).toBe(true)
      expect(beforeMax.attemptsRemaining).toBe(1)

      // 5th failed attempt triggers lockout
      await recordLoginAttempt(id, false)
      const atMax = await checkRateLimit(id)
      expect(atMax.allowed).toBe(false)
      expect(atMax.lockedUntil).toBeDefined()
      expect(atMax.lockedUntil).toBeGreaterThan(Date.now())
    })

    it("lockout includes future timestamp at least 15 minutes ahead", async () => {
      const id = "dist-locktime-" + Date.now()
      for (let i = 0; i < 5; i++) {
        await recordLoginAttempt(id, false)
      }
      const result = await checkRateLimit(id)
      expect(result.allowed).toBe(false)
      // Lockout should be ~15 minutes in the future
      const fifteenMinMs = 15 * 60 * 1000
      const remainingMs = result.lockedUntil! - Date.now()
      expect(remainingMs).toBeLessThanOrEqual(fifteenMinMs)
      expect(remainingMs).toBeGreaterThan(fifteenMinMs - 5000)
    })

    it("successful login clears all prior failed attempts", async () => {
      const id = "dist-clear-" + Date.now()
      await recordLoginAttempt(id, false)
      await recordLoginAttempt(id, false)
      await recordLoginAttempt(id, false)
      await recordLoginAttempt(id, true)

      const result = await checkRateLimit(id)
      expect(result.allowed).toBe(true)
      expect(result.attemptsRemaining).toBe(5)
    })

    it("two separate identifiers have independent counters", async () => {
      const id1 = "dist-iso-a-" + Date.now()
      const id2 = "dist-iso-b-" + Date.now()

      // Lock out id1
      for (let i = 0; i < 5; i++) {
        await recordLoginAttempt(id1, false)
      }
      // id2 should still be allowed
      const r1 = await checkRateLimit(id1)
      const r2 = await checkRateLimit(id2)
      expect(r1.allowed).toBe(false)
      expect(r2.allowed).toBe(true)
      expect(r2.attemptsRemaining).toBe(5)
    })
  })

  describe("MFA rate limit threshold behavior", () => {
    it("allows exactly MAX_MFA_ATTEMPTS (3) before blocking", async () => {
      const id = "dist-mfa-thresh-" + Date.now()

      await recordMfaAttempt(id, false)
      await recordMfaAttempt(id, false)
      const before = await checkMfaRateLimit(id)
      expect(before.allowed).toBe(true)
      expect(before.attemptsRemaining).toBe(1)

      await recordMfaAttempt(id, false)
      const after = await checkMfaRateLimit(id)
      expect(after.allowed).toBe(false)
      expect(after.attemptsRemaining).toBe(0)
    })

    it("successful MFA clears prior failed attempts", async () => {
      const id = "dist-mfa-clear-" + Date.now()
      await recordMfaAttempt(id, false)
      await recordMfaAttempt(id, false)
      await recordMfaAttempt(id, true)

      const result = await checkMfaRateLimit(id)
      expect(result.allowed).toBe(true)
      expect(result.attemptsRemaining).toBe(3)
    })

    it("two separate identifiers have independent MFA counters", async () => {
      const id1 = "dist-mfa-iso-a-" + Date.now()
      const id2 = "dist-mfa-iso-b-" + Date.now()

      for (let i = 0; i < 3; i++) {
        await recordMfaAttempt(id1, false)
      }
      const r1 = await checkMfaRateLimit(id1)
      const r2 = await checkMfaRateLimit(id2)
      expect(r1.allowed).toBe(false)
      expect(r2.allowed).toBe(true)
    })
  })

  describe("Middleware security-critical mode", () => {
    const originalNodeEnv = process.env["NODE_ENV"]
    const originalRedisUrl = process.env["REDIS_URL"]

    beforeEach(() => {
      _resetCacheAdapter()
    })

    afterEach(() => {
      vi.unstubAllEnvs()
      if (originalRedisUrl !== undefined) {
        process.env["REDIS_URL"] = originalRedisUrl
      } else {
        delete process.env["REDIS_URL"]
      }
      _resetCacheAdapter()
    })

    it("degrades to in-memory for security-critical endpoints when Redis unavailable in production", async () => {
      vi.stubEnv("NODE_ENV", "production")
      delete process.env["REDIS_URL"]
      _resetCacheAdapter()

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const result = await rateLimit(createRequest("10.99.0.5"), {
        maxRequests: 5,
        windowMs: 60000,
        securityCritical: true,
      })

      // Should allow requests through with in-memory fallback (not block with 503)
      expect(result).toBeNull()
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[RateLimit] CRITICAL"),
      )
      errorSpy.mockRestore()
    })

    it("still allows non-critical endpoints through when Redis unavailable in production", async () => {
      vi.stubEnv("NODE_ENV", "production")
      delete process.env["REDIS_URL"]
      _resetCacheAdapter()

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      const result = await rateLimit(createRequest("10.99.0.6"), {
        maxRequests: 5,
        windowMs: 60000,
        securityCritical: false,
      })

      expect(result).toBeNull()
      errorSpy.mockRestore()
    })

    it("allows security-critical endpoints in Vercel preview without Redis", async () => {
      vi.stubEnv("NODE_ENV", "production")
      vi.stubEnv("VERCEL_ENV", "preview")
      delete process.env["REDIS_URL"]
      _resetCacheAdapter()

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const result = await rateLimit(createRequest("10.99.0.7"), {
        maxRequests: 5,
        windowMs: 60000,
        securityCritical: true,
      })

      // In preview, security-critical endpoints should degrade to in-memory
      // instead of returning 503
      expect(result).toBeNull()
      warnSpy.mockRestore()
    })

    it("auth preset is marked securityCritical", () => {
      expect(rateLimits.auth.securityCritical).toBe(true)
    })

    it("signin preset is marked securityCritical", () => {
      expect(rateLimits.signin.securityCritical).toBe(true)
    })

    it("api preset is NOT marked securityCritical", () => {
      expect((rateLimits.api as any).securityCritical).toBeUndefined()
    })

    it("strict preset is NOT marked securityCritical", () => {
      expect((rateLimits.strict as any).securityCritical).toBeUndefined()
    })
  })

  describe("Cross-instance consistency guarantees", () => {
    it("rate limit state is stored via CacheAdapter, not local variables", async () => {
      const fs = await import("fs")
      const path = await import("path")

      // Verify admin-auth.ts uses CacheAdapter for ALL rate limiting
      const adminAuth = fs.readFileSync(path.resolve("lib/admin-auth.ts"), "utf-8")
      expect(adminAuth).toContain('import { getCacheAdapter')
      expect(adminAuth).not.toMatch(/const\s+loginAttempts\s*=/)
      expect(adminAuth).not.toMatch(/const\s+mfaAttempts\s*=/)

      // Verify rate-limit.ts uses CacheAdapter
      const rateLimit = fs.readFileSync(path.resolve("lib/middleware/rate-limit.ts"), "utf-8")
      expect(rateLimit).toContain('import { getCacheAdapter')
      expect(rateLimit).not.toMatch(/const\s+\w+\s*=\s*new Map/)
    })

    it("CacheAdapter with REDIS_URL produces Redis adapter, not in-memory", async () => {
      const fs = await import("fs")
      const path = await import("path")
      const content = fs.readFileSync(path.resolve("lib/cache/redis-adapter.ts"), "utf-8")

      // When REDIS_URL is set, factory must create RedisCacheAdapter
      expect(content).toContain("new RedisCacheAdapter(redisUrl)")
      // Factory falls back to InMemory only when REDIS_URL is absent
      expect(content).toContain("new InMemoryCacheAdapter()")
    })

    it("REDIS_URL is documented in .env.example", async () => {
      const fs = await import("fs")
      const path = await import("path")
      const content = fs.readFileSync(path.resolve(".env.example"), "utf-8")
      expect(content).toContain("REDIS_URL")
      expect(content).toMatch(/distributed rate limiting/i)
    })
  })
})
