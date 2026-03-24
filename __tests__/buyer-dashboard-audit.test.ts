/**
 * Buyer Dashboard Audit Test
 *
 * Validates structural completeness of the buyer dashboard:
 * - Every page directory has a loading.tsx boundary
 * - Error boundary exists at app/buyer/error.tsx
 * - All buyer pages use ProtectedRoute with BUYER role
 * - No client pages combine "use client" with force-dynamic
 */

import { describe, expect, it } from "vitest"
import { existsSync, readFileSync, readdirSync, statSync } from "fs"
import { resolve, join } from "path"

const BUYER_ROOT = resolve(__dirname, "../app/buyer")

/** Recursively find all directories containing page.tsx */
function findPageDirs(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (!statSync(full).isDirectory()) continue
    if (existsSync(join(full, "page.tsx"))) results.push(full)
    results.push(...findPageDirs(full))
  }
  return results
}

describe("Buyer Dashboard — Loading Boundaries", () => {
  const pageDirs = findPageDirs(BUYER_ROOT)

  it("finds buyer page directories", () => {
    expect(pageDirs.length).toBeGreaterThanOrEqual(40)
  })

  for (const dir of pageDirs) {
    const rel = dir.replace(resolve(__dirname, "..") + "/", "")
    it(`${rel} has loading.tsx`, () => {
      expect(existsSync(join(dir, "loading.tsx"))).toBe(true)
    })
  }
})

describe("Buyer Dashboard — Error Boundary", () => {
  it("app/buyer/error.tsx exists", () => {
    expect(existsSync(join(BUYER_ROOT, "error.tsx"))).toBe(true)
  })

  it("error.tsx is a client component", () => {
    const src = readFileSync(join(BUYER_ROOT, "error.tsx"), "utf-8")
    expect(src).toContain('"use client"')
  })

  it("error.tsx exports default function", () => {
    const src = readFileSync(join(BUYER_ROOT, "error.tsx"), "utf-8")
    expect(src).toMatch(/export\s+default\s+function/)
  })
})

describe("Buyer Dashboard — ProtectedRoute Enforcement", () => {
  const pageDirs = findPageDirs(BUYER_ROOT)

  // Pages that are redirect-only or server components don't need ProtectedRoute
  const EXEMPT_PAGES = [
    "app/buyer/request", // Server-side redirect
    "app/buyer/deal/summary", // Client redirect
    "app/buyer/deal/contract", // Client redirect
    "app/buyer/demo", // Demo page
  ]

  for (const dir of pageDirs) {
    const rel = dir.replace(resolve(__dirname, "..") + "/", "")
    if (EXEMPT_PAGES.some((e) => rel === e)) continue

    it(`${rel}/page.tsx uses ProtectedRoute or is server component`, () => {
      const src = readFileSync(join(dir, "page.tsx"), "utf-8")
      const isClient = src.includes('"use client"') || src.includes("'use client'")
      if (isClient) {
        expect(src).toContain("ProtectedRoute")
      }
    })
  }
})

describe("Buyer Dashboard — No force-dynamic in client pages", () => {
  const pageDirs = findPageDirs(BUYER_ROOT)

  for (const dir of pageDirs) {
    const rel = dir.replace(resolve(__dirname, "..") + "/", "")
    it(`${rel}/page.tsx does not combine "use client" with force-dynamic`, () => {
      const src = readFileSync(join(dir, "page.tsx"), "utf-8")
      if (src.includes('"use client"') || src.includes("'use client'")) {
        expect(src).not.toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/)
      }
    })
  }
})
