import { describe, it, expect, vi, afterEach } from "vitest"
import { rateLimit, rateLimits } from "@/lib/middleware/rate-limit"
import { NextRequest } from "next/server"
import { _resetCacheAdapter } from "@/lib/cache/redis-adapter"

function createRequest(ip = "127.0.0.1") {
  return new NextRequest(new URL("/api/auth/signin", "http://localhost:3000"), {
    headers: new Headers({ "x-forwarded-for": ip }),
  })
}

describe("Rate Limiting", () => {
  describe("rateLimits presets", () => {
    it("auth preset has 5 requests per 15 minutes", () => {
      expect(rateLimits.auth.maxRequests).toBe(5)
      expect(rateLimits.auth.windowMs).toBe(15 * 60 * 1000)
    })

    it("signin preset has appropriate rate limit", () => {
      expect(rateLimits.signin.maxRequests).toBeGreaterThan(0)
      expect(rateLimits.signin.windowMs).toBe(60 * 1000)
    })

    it("api preset has 100 requests per minute", () => {
      expect(rateLimits.api.maxRequests).toBe(100)
      expect(rateLimits.api.windowMs).toBe(60 * 1000)
    })

    it("resendVerification preset has 3 requests per 2 minutes", () => {
      expect(rateLimits.resendVerification.maxRequests).toBe(3)
      expect(rateLimits.resendVerification.windowMs).toBe(2 * 60 * 1000)
    })

    it("strict preset has 10 requests per minute", () => {
      expect(rateLimits.strict.maxRequests).toBe(10)
      expect(rateLimits.strict.windowMs).toBe(60 * 1000)
    })
  })

  describe("rateLimit function", () => {
    it("allows first request", async () => {
      const req = createRequest("192.168.1.100")
      const result = await rateLimit(req, { maxRequests: 5, windowMs: 60000 })
      expect(result).toBeNull()
    })

    it("returns 429 after exceeding limit", async () => {
      const config = { maxRequests: 2, windowMs: 60000 }
      const ip = "10.0.0." + Math.floor(Math.random() * 255)

      // First two requests should pass
      await rateLimit(createRequest(ip), config)
      await rateLimit(createRequest(ip), config)

      // Third request should be rate limited
      const result = await rateLimit(createRequest(ip), config)
      expect(result).not.toBeNull()
      expect(result?.status).toBe(429)
    })

    it("includes Retry-After header in 429 response", async () => {
      const config = { maxRequests: 1, windowMs: 60000 }
      const ip = "10.0.1." + Math.floor(Math.random() * 255)

      await rateLimit(createRequest(ip), config)
      const result = await rateLimit(createRequest(ip), config)

      expect(result).not.toBeNull()
      expect(result?.headers.get("Retry-After")).toBeDefined()
      expect(Number(result?.headers.get("Retry-After"))).toBeGreaterThan(0)
    })
  })

  describe("graceful degradation without Redis", () => {
    const originalNodeEnv = process.env["NODE_ENV"]
    const originalRedisUrl = process.env["REDIS_URL"]

    afterEach(() => {
      vi.unstubAllEnvs()
      if (originalRedisUrl !== undefined) {
        process.env["REDIS_URL"] = originalRedisUrl
      } else {
        delete process.env["REDIS_URL"]
      }
      _resetCacheAdapter()
    })

    it("does not return 503 when Redis is unavailable in production", async () => {
      vi.stubEnv("NODE_ENV", "production")
      delete process.env["REDIS_URL"]
      _resetCacheAdapter()

      const result = await rateLimit(createRequest("10.99.0.1"), { maxRequests: 5, windowMs: 60000 })

      // Should allow the request through (null = no error response)
      expect(result).toBeNull()
    })

    it("logs a warning when Redis is unavailable in production", async () => {
      vi.stubEnv("NODE_ENV", "production")
      delete process.env["REDIS_URL"]
      _resetCacheAdapter()

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
      await rateLimit(createRequest("10.99.0.2"), { maxRequests: 5, windowMs: 60000 })

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[RateLimit] Redis unavailable in production"),
      )
      errorSpy.mockRestore()
    })
  })
})
