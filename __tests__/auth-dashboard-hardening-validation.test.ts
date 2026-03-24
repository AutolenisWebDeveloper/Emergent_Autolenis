import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import { NextRequest } from "next/server"
import { rateLimit, rateLimits } from "@/lib/middleware/rate-limit"
import {
  InMemoryCacheAdapter,
  _resetCacheAdapter,
} from "@/lib/cache/redis-adapter"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const root = resolve(__dirname, "..")

function src(path: string): string {
  return readFileSync(resolve(root, path), "utf-8")
}

function createRequest(ip = "127.0.0.1", path = "/api/auth/signin") {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: new Headers({ "x-forwarded-for": ip }),
  })
}

// ---------------------------------------------------------------------------
// 1. Security-critical endpoints degrade gracefully — no 503 from rate limiter
// ---------------------------------------------------------------------------

describe("Auth endpoint rate-limit graceful degradation (no 503 on Redis unavailable)", () => {
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

  it("signin rate limit degrades to in-memory instead of 503 when Redis is unavailable", async () => {
    vi.stubEnv("NODE_ENV", "production")
    delete process.env["REDIS_URL"]
    _resetCacheAdapter()

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await rateLimit(
      createRequest("10.200.0.1", "/api/auth/signin"),
      rateLimits.signin,
    )

    // Must return null (allow through), NOT a 503 response
    expect(result).toBeNull()

    // Must log CRITICAL warning for operators
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[RateLimit] CRITICAL"),
    )
    errorSpy.mockRestore()
  })

  it("signup (auth preset) rate limit degrades to in-memory instead of 503", async () => {
    vi.stubEnv("NODE_ENV", "production")
    delete process.env["REDIS_URL"]
    _resetCacheAdapter()

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await rateLimit(
      createRequest("10.200.0.2", "/api/auth/signup"),
      rateLimits.auth,
    )

    expect(result).toBeNull()
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[RateLimit] CRITICAL"),
    )
    errorSpy.mockRestore()
  })

  it("forgot-password (auth preset) rate limit degrades to in-memory instead of 503", async () => {
    vi.stubEnv("NODE_ENV", "production")
    delete process.env["REDIS_URL"]
    _resetCacheAdapter()

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await rateLimit(
      createRequest("10.200.0.3", "/api/auth/forgot-password"),
      rateLimits.auth,
    )

    expect(result).toBeNull()
    // auth preset is securityCritical → must log CRITICAL
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[RateLimit] CRITICAL"),
    )
    errorSpy.mockRestore()
  })

  it("resend-verification rate limit degrades to in-memory instead of 503", async () => {
    vi.stubEnv("NODE_ENV", "production")
    delete process.env["REDIS_URL"]
    _resetCacheAdapter()

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await rateLimit(
      createRequest("10.200.0.4", "/api/auth/resend-verification"),
      rateLimits.resendVerification,
    )

    expect(result).toBeNull()
    // resendVerification is NOT securityCritical → logs non-CRITICAL degradation warning
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[RateLimit] Redis unavailable in production"),
    )
    errorSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// 2. Sign-in remains rate-limited under in-memory fallback mode
// ---------------------------------------------------------------------------

describe("Rate limiting still enforces limits under in-memory fallback (not silently bypassing)", () => {
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

  it("returns 429 after exceeding maxRequests under in-memory fallback", async () => {
    // Ensure in-memory adapter (no Redis)
    vi.stubEnv("NODE_ENV", "test")
    delete process.env["REDIS_URL"]
    _resetCacheAdapter()

    const ip = "10.200.1.1"
    const config = { maxRequests: 3, windowMs: 60_000, securityCritical: true }

    // First 3 requests should pass
    for (let i = 0; i < 3; i++) {
      const result = await rateLimit(createRequest(ip, "/api/auth/signin"), config)
      expect(result).toBeNull()
    }

    // 4th request should be rate-limited
    const blocked = await rateLimit(createRequest(ip, "/api/auth/signin"), config)
    expect(blocked).not.toBeNull()
    expect(blocked!.status).toBe(429)
  })

  it("different IPs have independent rate-limit counters under in-memory fallback", async () => {
    vi.stubEnv("NODE_ENV", "test")
    delete process.env["REDIS_URL"]
    _resetCacheAdapter()

    const config = { maxRequests: 2, windowMs: 60_000, securityCritical: true }

    // Exhaust IP A
    await rateLimit(createRequest("10.200.2.1", "/api/auth/signin"), config)
    await rateLimit(createRequest("10.200.2.1", "/api/auth/signin"), config)
    const blockedA = await rateLimit(createRequest("10.200.2.1", "/api/auth/signin"), config)
    expect(blockedA).not.toBeNull()
    expect(blockedA!.status).toBe(429)

    // IP B should still be allowed
    const resultB = await rateLimit(createRequest("10.200.2.2", "/api/auth/signin"), config)
    expect(resultB).toBeNull()
  })

  it("rate-limited response includes required headers (Retry-After, X-RateLimit-*)", async () => {
    vi.stubEnv("NODE_ENV", "test")
    delete process.env["REDIS_URL"]
    _resetCacheAdapter()

    const config = { maxRequests: 1, windowMs: 60_000 }

    await rateLimit(createRequest("10.200.3.1", "/api/auth/signin"), config)
    const blocked = await rateLimit(createRequest("10.200.3.1", "/api/auth/signin"), config)

    expect(blocked).not.toBeNull()
    expect(blocked!.headers.get("Retry-After")).toBeDefined()
    expect(blocked!.headers.get("X-RateLimit-Limit")).toBe("1")
    expect(blocked!.headers.get("X-RateLimit-Remaining")).toBe("0")
    expect(blocked!.headers.get("X-RateLimit-Reset")).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// 3. Auth endpoint source-level audit — verify rate limiter usage
// ---------------------------------------------------------------------------

describe("Auth endpoint rate-limiter source audit", () => {
  const rateLimitedEndpoints = [
    {
      file: "app/api/auth/signin/route.ts",
      endpoint: "/api/auth/signin",
      expectedPreset: "rateLimits.signin",
    },
    {
      file: "app/api/auth/signup/route.ts",
      endpoint: "/api/auth/signup",
      expectedPreset: "rateLimits.auth",
    },
    {
      file: "app/api/auth/forgot-password/route.ts",
      endpoint: "/api/auth/forgot-password",
      expectedPreset: "rateLimits.auth",
    },
    {
      file: "app/api/auth/resend-verification/route.ts",
      endpoint: "/api/auth/resend-verification",
      expectedPreset: "rateLimits.resendVerification",
    },
  ]

  for (const { file, endpoint, expectedPreset } of rateLimitedEndpoints) {
    it(`${endpoint} uses rate limiter with ${expectedPreset}`, () => {
      const content = src(file)
      expect(content).toContain("rateLimit")
      expect(content).toContain(expectedPreset)
    })
  }

  it("signin and signup do not return 503 from rate limiter (only from missing env vars)", () => {
    const signinSrc = src("app/api/auth/signin/route.ts")
    const signupSrc = src("app/api/auth/signup/route.ts")

    // Rate limiter returns null (allow) or 429 (block), never 503
    // 503 in these routes only comes from missing env vars guard
    for (const content of [signinSrc, signupSrc]) {
      // The only 503 should be the missing env vars check
      const lines503 = content.split("\n").filter((l) => l.includes("503"))
      // At most one 503 guard for missing env vars
      expect(lines503.length).toBeLessThanOrEqual(1)
      if (lines503.length === 1) {
        // It should be about server configuration / env vars, not rate limiting
        expect(content).toContain("Server configuration error")
      }
    }
  })
})

// ---------------------------------------------------------------------------
// 4. Dashboard layouts redirect cleanly on session resolution failure
// ---------------------------------------------------------------------------

describe("Dashboard layouts redirect cleanly on session resolution failure", () => {
  const layouts = [
    {
      file: "app/buyer/layout.tsx",
      portal: "Buyer",
      redirectTarget: "/auth/signin",
      logPrefix: "[BuyerLayout]",
    },
    {
      file: "app/dealer/layout.tsx",
      portal: "Dealer",
      redirectTarget: "/auth/signin",
      logPrefix: "[DealerLayout]",
    },
    {
      file: "app/admin/layout.tsx",
      portal: "Admin",
      redirectTarget: "/admin/sign-in",
      logPrefix: "[AdminLayout]",
    },
    {
      file: "app/affiliate/portal/layout.tsx",
      portal: "Affiliate",
      redirectTarget: "/affiliate?signin=required",
      logPrefix: "[AffiliateLayout]",
    },
  ]

  for (const { file, portal, redirectTarget, logPrefix } of layouts) {
    describe(`${portal} layout`, () => {
      it("wraps getSessionUser in try/catch", () => {
        const content = src(file)
        expect(content).toContain("getSessionUser()")
        expect(content).toContain("try")
        expect(content).toContain("catch")
      })

      it(`redirects to ${redirectTarget} on session error`, () => {
        const content = src(file)
        expect(content).toContain(`redirect("${redirectTarget}")`)
      })

      it(`logs session failure with ${logPrefix} prefix`, () => {
        const content = src(file)
        expect(content).toContain(logPrefix)
        expect(content).toContain("Session resolution failed")
      })

      it("imports redirect from next/navigation", () => {
        const content = src(file)
        expect(content).toContain('import { redirect } from "next/navigation"')
      })
    })
  }
})

// ---------------------------------------------------------------------------
// 5. Affiliate portal has the same error-boundary coverage as other portals
// ---------------------------------------------------------------------------

describe("All portals have consistent error-boundary coverage", () => {
  const portals = [
    { dir: "app/buyer", name: "Buyer" },
    { dir: "app/dealer", name: "Dealer" },
    { dir: "app/admin", name: "Admin" },
    { dir: "app/affiliate/portal", name: "Affiliate" },
  ]

  for (const { dir, name } of portals) {
    describe(`${name} portal`, () => {
      it("has an error.tsx boundary", () => {
        const errorFile = resolve(root, dir, "error.tsx")
        expect(existsSync(errorFile)).toBe(true)
      })

      it("error.tsx is a client component", () => {
        const content = src(`${dir}/error.tsx`)
        expect(content).toContain('"use client"')
      })

      it("error.tsx renders ErrorState component", () => {
        const content = src(`${dir}/error.tsx`)
        expect(content).toContain("ErrorState")
        expect(content).toContain("onRetry")
      })

      it("error.tsx logs the error", () => {
        const content = src(`${dir}/error.tsx`)
        expect(content).toContain("console.error")
      })
    })
  }
})

// ---------------------------------------------------------------------------
// 6. Rate-limit presets — security posture validation
// ---------------------------------------------------------------------------

describe("Rate-limit security posture", () => {
  it("auth preset is securityCritical", () => {
    expect(rateLimits.auth.securityCritical).toBe(true)
  })

  it("signin preset is securityCritical", () => {
    expect(rateLimits.signin.securityCritical).toBe(true)
  })

  it("rate-limit middleware imports getCacheAdapter (not raw Map)", () => {
    const content = src("lib/middleware/rate-limit.ts")
    expect(content).toContain("getCacheAdapter")
    expect(content).not.toMatch(/const\s+\w+\s*=\s*new Map/)
  })

  it("rate-limit middleware logs CRITICAL when Redis unavailable for securityCritical", () => {
    const content = src("lib/middleware/rate-limit.ts")
    expect(content).toContain("[RateLimit] CRITICAL")
  })

  it("rate-limit middleware does NOT return 503 in executable code", () => {
    const content = src("lib/middleware/rate-limit.ts")
    // Strip comments (lines starting with // or *)
    const codeOnly = content
      .split("\n")
      .filter((line) => {
        const trimmed = line.trimStart()
        return !trimmed.startsWith("//") && !trimmed.startsWith("*")
      })
      .join("\n")
    expect(codeOnly).not.toContain("503")
  })

  it("rate-limit middleware returns 429 (not 503) on limit exceeded", () => {
    const content = src("lib/middleware/rate-limit.ts")
    expect(content).toContain("429")
    expect(content).toContain("Too many requests")
  })

  it("fallback uses InMemoryCacheAdapter, not silent bypass", () => {
    const content = src("lib/cache/redis-adapter.ts")
    // getCacheAdapter always returns an adapter (either Redis or InMemory)
    // It never returns null/undefined (which would silently bypass)
    expect(content).toContain("new InMemoryCacheAdapter()")
    expect(content).toContain("new RedisCacheAdapter(redisUrl)")
  })
})
