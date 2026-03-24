import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  InMemoryCacheAdapter,
  RedisCacheAdapter,
  getCacheAdapter,
  _resetCacheAdapter,
  assertProductionCacheReady,
  getSecurityCriticalCacheAdapter,
  ProductionCacheUnavailableError,
} from "@/lib/cache/redis-adapter"

describe("InMemoryCacheAdapter", () => {
  let adapter: InMemoryCacheAdapter

  beforeEach(() => {
    adapter = new InMemoryCacheAdapter()
  })

  it("returns null for missing keys", async () => {
    expect(await adapter.get("nonexistent")).toBeNull()
  })

  it("stores and retrieves values", async () => {
    await adapter.set("key1", "value1")
    expect(await adapter.get("key1")).toBe("value1")
  })

  it("respects TTL expiry", async () => {
    await adapter.set("ttl-key", "value", 1) // 1ms TTL
    await new Promise((r) => setTimeout(r, 10))
    expect(await adapter.get("ttl-key")).toBeNull()
  })

  it("increments values", async () => {
    const first = await adapter.increment("counter", 60000)
    expect(first).toBe(1)
    const second = await adapter.increment("counter", 60000)
    expect(second).toBe(2)
  })

  it("deletes keys", async () => {
    await adapter.set("del-key", "value")
    await adapter.delete("del-key")
    expect(await adapter.get("del-key")).toBeNull()
  })

  it("reports size correctly", async () => {
    expect(adapter._size()).toBe(0)
    await adapter.set("a", "1")
    await adapter.set("b", "2")
    expect(adapter._size()).toBe(2)
  })
})

describe("RedisCacheAdapter – null client safety", () => {
  // RedisCacheAdapter.init() is async and fails when ioredis is unavailable,
  // leaving this.client === null and this.ready === false.
  // All public methods must gracefully return defaults without throwing.
  let adapter: RedisCacheAdapter

  beforeEach(() => {
    // ioredis is not installed in the test env, so init() will fail silently
    // and the adapter will remain in the not-ready state with client === null.
    adapter = new RedisCacheAdapter("redis://localhost:6379")
  })

  it("isReady() returns false when client failed to initialize", () => {
    expect(adapter.isReady()).toBe(false)
  })

  it("get() returns null instead of throwing when client is null", async () => {
    expect(await adapter.get("any-key")).toBeNull()
  })

  it("set() does not throw when client is null", async () => {
    await expect(adapter.set("key", "value")).resolves.toBeUndefined()
  })

  it("set() with TTL does not throw when client is null", async () => {
    await expect(adapter.set("key", "value", 5000)).resolves.toBeUndefined()
  })

  it("increment() returns 0 when client is null", async () => {
    expect(await adapter.increment("counter", 60000)).toBe(0)
  })

  it("delete() does not throw when client is null", async () => {
    await expect(adapter.delete("key")).resolves.toBeUndefined()
  })

  it("destroy() does not throw when client is null", async () => {
    await expect(adapter.destroy()).resolves.toBeUndefined()
  })
})

describe("getCacheAdapter", () => {
  beforeEach(() => {
    _resetCacheAdapter()
  })

  it("returns InMemoryCacheAdapter when REDIS_URL is not set", () => {
    delete process.env["REDIS_URL"]
    const adapter = getCacheAdapter()
    expect(adapter).toBeInstanceOf(InMemoryCacheAdapter)
  })

  it("returns the same singleton on repeated calls", () => {
    delete process.env["REDIS_URL"]
    const a = getCacheAdapter()
    const b = getCacheAdapter()
    expect(a).toBe(b)
  })

  it("warns but does not throw in production when REDIS_URL is absent", () => {
    const origEnv = process.env["NODE_ENV"]
    try {
      ;(process.env as Record<string, string | undefined>)["NODE_ENV"] = "production"
      delete process.env["REDIS_URL"]
      _resetCacheAdapter()
      // getCacheAdapter() returns InMemoryCacheAdapter with a warning in production
      // (assertProductionCacheReady() is the throwing gate, not getCacheAdapter)
      const adapter = getCacheAdapter()
      expect(adapter).toBeInstanceOf(InMemoryCacheAdapter)
    } finally {
      ;(process.env as Record<string, string | undefined>)["NODE_ENV"] = origEnv
    }
  })

  it("does not throw in development when REDIS_URL is absent", () => {
    const origEnv = process.env["NODE_ENV"]
    try {
      ;(process.env as Record<string, string | undefined>)["NODE_ENV"] = "development"
      delete process.env["REDIS_URL"]
      _resetCacheAdapter()
      expect(() => getCacheAdapter()).not.toThrow()
      expect(getCacheAdapter()).toBeInstanceOf(InMemoryCacheAdapter)
    } finally {
      ;(process.env as Record<string, string | undefined>)["NODE_ENV"] = origEnv
    }
  })

  it("does not throw in test when REDIS_URL is absent", () => {
    const origEnv = process.env["NODE_ENV"]
    try {
      ;(process.env as Record<string, string | undefined>)["NODE_ENV"] = "test"
      delete process.env["REDIS_URL"]
      _resetCacheAdapter()
      expect(() => getCacheAdapter()).not.toThrow()
    } finally {
      ;(process.env as Record<string, string | undefined>)["NODE_ENV"] = origEnv
    }
  })
})

describe("Production Cache Policy", () => {
  const originalNodeEnv = process.env["NODE_ENV"]

  beforeEach(() => {
    _resetCacheAdapter()
    delete process.env["REDIS_URL"]
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    _resetCacheAdapter()
  })

  it("assertProductionCacheReady throws when NODE_ENV=production and REDIS_URL is missing", () => {
    vi.stubEnv("NODE_ENV", "production")
    expect(() => assertProductionCacheReady()).toThrow(ProductionCacheUnavailableError)
  })

  it("assertProductionCacheReady does not throw in test mode without Redis", () => {
    vi.stubEnv("NODE_ENV", "test")
    expect(() => assertProductionCacheReady()).not.toThrow()
  })

  it("getSecurityCriticalCacheAdapter throws in production without Redis", () => {
    vi.stubEnv("NODE_ENV", "production")
    expect(() => getSecurityCriticalCacheAdapter()).toThrow(ProductionCacheUnavailableError)
  })

  it("getSecurityCriticalCacheAdapter returns adapter in test mode", () => {
    vi.stubEnv("NODE_ENV", "test")
    const adapter = getSecurityCriticalCacheAdapter()
    expect(adapter).toBeInstanceOf(InMemoryCacheAdapter)
  })

  it("assertProductionCacheReady throws when Redis adapter is not ready in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    process.env["REDIS_URL"] = "redis://localhost:6379"
    // getCacheAdapter will create a RedisCacheAdapter but it won't be ready
    // (ioredis not installed in test env)
    getCacheAdapter()
    expect(() => assertProductionCacheReady()).toThrow(ProductionCacheUnavailableError)
  })

  it("assertProductionCacheReady does not throw in Vercel preview even without Redis", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("VERCEL_ENV", "preview")
    expect(() => assertProductionCacheReady()).not.toThrow()
  })

  it("getSecurityCriticalCacheAdapter returns adapter in Vercel preview without Redis", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("VERCEL_ENV", "preview")
    const adapter = getSecurityCriticalCacheAdapter()
    expect(adapter).toBeInstanceOf(InMemoryCacheAdapter)
  })
})
