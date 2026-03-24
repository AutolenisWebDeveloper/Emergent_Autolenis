type CacheEntry<T> = {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up expired entries every 5 minutes
    if (typeof window === "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
    }
  }

  set<T>(key: string, data: T, ttlSeconds = 300) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) return null

    const age = Date.now() - entry.timestamp

    if (age > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.clear()
  }
}

export const cache = new MemoryCache()

export async function withCache<T>(key: string, fetcher: () => Promise<T>, ttlSeconds = 300): Promise<T> {
  const cached = cache.get<T>(key)
  if (cached !== null) return cached

  const data = await fetcher()
  cache.set(key, data, ttlSeconds)
  return data
}

export function invalidatePattern(pattern: string): void {
  const keys = Array.from((cache as any).cache.keys())
  keys.forEach((key: any) => {
    if ((key as string).includes(pattern)) {
      cache.delete(key as string)
    }
  })
}
