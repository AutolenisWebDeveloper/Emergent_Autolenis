import { logger } from "@/lib/logger"
/**
 * Cache adapter abstraction for rate limiting and general caching.
 * Supports in-memory (default) and Redis-backed implementations.
 * Redis is used automatically when REDIS_URL is set and ioredis is available.
 *
 * Production policy:
 * - Security-critical usage (rate limiting, lockout counters)
 *   MUST use Redis in production. In-memory fallback is allowed ONLY in
 *   test/local development.
 * - Admin sessions are database-backed (AdminSession table) and do NOT
 *   rely on this cache adapter.
 * - Non-critical usage (general caching) may gracefully degrade.
 */

export interface CacheAdapter {
  get<T = string>(key: string): Promise<T | null>
  set(key: string, value: string, ttlMs?: number): Promise<void>
  increment(key: string, ttlMs?: number): Promise<number>
  delete(key: string): Promise<void>
}

/** Adapter mode for production policy enforcement. */
export type CacheAdapterMode = "securityCritical" | "nonCritical"

// ---------------------------------------------------------------------------
// In-memory implementation (default, single-instance)
// ---------------------------------------------------------------------------

interface MemoryEntry {
  value: string
  expiresAt: number
}

export class InMemoryCacheAdapter implements CacheAdapter {
  private store = new Map<string, MemoryEntry>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    if (typeof setInterval !== "undefined") {
      this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000)
      // Allow the Node process to exit even if the timer is still active
      if (this.cleanupTimer && typeof this.cleanupTimer === "object" && "unref" in this.cleanupTimer) {
        this.cleanupTimer.unref()
      }
    }
  }

  async get<T = string>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value as unknown as T
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : 0,
    })
  }

  async increment(key: string, ttlMs?: number): Promise<number> {
    const existing = this.store.get(key)
    if (existing && existing.expiresAt > 0 && Date.now() > existing.expiresAt) {
      this.store.delete(key)
    }
    const current = this.store.get(key)
    const newVal = current ? parseInt(current.value, 10) + 1 : 1
    this.store.set(key, {
      value: String(newVal),
      expiresAt: current?.expiresAt ?? (ttlMs ? Date.now() + ttlMs : 0),
    })
    return newVal
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt > 0 && now > entry.expiresAt) {
        this.store.delete(key)
      }
    }
  }

  /** Exposed for testing only. */
  _size(): number {
    return this.store.size
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.store.clear()
  }
}

// ---------------------------------------------------------------------------
// Redis implementation (used when REDIS_URL is set and ioredis is available)
// ---------------------------------------------------------------------------

/** Minimal interface for the subset of ioredis methods we use. */
interface RedisClient {
  connect(): Promise<void>
  get(key: string): Promise<string | null>
  set(key: string, value: string, ...args: (string | number)[]): Promise<string>
  incr(key: string): Promise<number>
  pexpire(key: string, ms: number): Promise<number>
  del(key: string): Promise<number>
  quit(): Promise<string>
}

/**
 * Dynamically load the ioredis module at runtime.
 * The module name is built via a variable so that bundlers (Vite, webpack)
 * skip static analysis and don't fail when ioredis is not installed.
 */
async function loadIoRedis(): Promise<{ default: new (url: string, opts: Record<string, unknown>) => RedisClient } | null> {
  try {
    // Indirection prevents Vite from statically resolving the specifier
    const pkg = ["io", "redis"].join("")
    return await import(/* @vite-ignore */ pkg)
  } catch {
    return null
  }
}

export class RedisCacheAdapter implements CacheAdapter {
  private client: RedisClient | null = null
  private ready = false

  constructor(redisUrl: string) {
    void this.init(redisUrl)
  }

  private async init(redisUrl: string): Promise<void> {
    try {
      const mod = await loadIoRedis()
      if (!mod) {
        logger.warn("[RedisCacheAdapter] ioredis is not installed. Falling back to in-memory cache.")
        return
      }
      this.client = new mod.default(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableReadyCheck: true,
      })
      await this.client.connect()
      this.ready = true
    } catch {
      logger.warn("[RedisCacheAdapter] Failed to connect to Redis. Falling back to in-memory cache.")
      this.ready = false
    }
  }

  isReady(): boolean {
    return this.ready
  }

  async get<T = string>(key: string): Promise<T | null> {
    const client = this.client
    if (!this.ready || !client) return null
    const val = await client.get(key)
    return val as T | null
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    const client = this.client
    if (!this.ready || !client) return
    if (ttlMs) {
      await client.set(key, value, "PX", ttlMs)
    } else {
      await client.set(key, value)
    }
  }

  async increment(key: string, ttlMs?: number): Promise<number> {
    const client = this.client
    if (!this.ready || !client) return 0
    const val = await client.incr(key)
    // Set TTL only on first increment (when value becomes 1)
    if (val === 1 && ttlMs) {
      await client.pexpire(key, ttlMs)
    }
    return val
  }

  async delete(key: string): Promise<void> {
    const client = this.client
    if (!this.ready || !client) return
    await client.del(key)
  }

  async destroy(): Promise<void> {
    const client = this.client
    if (client) {
      await client.quit()
    }
  }
}

// ---------------------------------------------------------------------------
// Production safety errors
// ---------------------------------------------------------------------------

export class ProductionCacheUnavailableError extends Error {
  constructor(message = "Redis is required for security-critical operations in production but is unavailable") {
    super(message)
    this.name = "ProductionCacheUnavailableError"
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isProductionEnv(): boolean {
  // Vercel preview deployments set NODE_ENV=production but are not true
  // production environments. Only enforce Redis requirements in actual
  // production so preview/staging deployments can fall back to in-memory.
  if (process.env["VERCEL_ENV"] === "preview") return false
  return process.env["NODE_ENV"] === "production"
}

/**
 * Assert that a production-safe cache adapter is ready.
 * Throws `ProductionCacheUnavailableError` if Redis is required but unavailable.
 */
export function assertProductionCacheReady(): void {
  if (!isProductionEnv()) return

  const redisUrl = process.env["REDIS_URL"]
  if (!redisUrl) {
    throw new ProductionCacheUnavailableError(
      "REDIS_URL is not set. Redis is required in production for security-critical state."
    )
  }

  const adapter = getCacheAdapter()
  if (adapter instanceof RedisCacheAdapter && !adapter.isReady()) {
    throw new ProductionCacheUnavailableError(
      "Redis adapter is not ready. Security-critical state cannot use in-memory fallback in production."
    )
  }
}

/**
 * Returns a cache adapter suitable for the requested mode.
 * For securityCritical mode in production, throws if Redis is unavailable.
 */
export function getSecurityCriticalCacheAdapter(): CacheAdapter {
  assertProductionCacheReady()
  return getCacheAdapter()
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let adapterInstance: CacheAdapter | null = null

/**
 * Returns the appropriate cache adapter based on environment.
 * - If REDIS_URL is set and ioredis is available → RedisCacheAdapter
 * - Otherwise → InMemoryCacheAdapter (development/test only)
 *
 * In production (NODE_ENV=production), REDIS_URL is required.
 * In-memory fallback is not safe for horizontally scaled/serverless production.
 *
 * The adapter is created once and reused (singleton).
 *
 * In production, REDIS_URL is expected for security-critical usage.
 * Use `getSecurityCriticalCacheAdapter()` or `assertProductionCacheReady()`
 * to enforce this policy.
 */
export function getCacheAdapter(): CacheAdapter {
  if (adapterInstance) return adapterInstance

  const redisUrl = process.env["REDIS_URL"]

  if (isProductionEnv() && !redisUrl) {
    logger.warn(
      "[CacheAdapter] REDIS_URL is not set in production. " +
      "Security-critical operations will fail. In-memory adapter provided for non-critical use only."
    )
  }

  if (redisUrl) {
    const redis = new RedisCacheAdapter(redisUrl)
    // Redis init is async; if it fails, isReady() returns false.
    // Callers that need Redis guarantees should check isReady().
    adapterInstance = redis
  } else {
    adapterInstance = new InMemoryCacheAdapter()
  }

  return adapterInstance
}

/** Reset the singleton – for testing only. */
export function _resetCacheAdapter(): void {
  adapterInstance = null
}
