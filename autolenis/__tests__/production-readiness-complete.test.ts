/**
 * Production Readiness Complete Test
 *
 * Validates all production readiness fixes:
 * 1. Loading boundaries exist for all page directories
 * 2. CSRF headers on all mutation fetch calls
 * 3. No error.message leakage in API route catch blocks
 * 4. Email templates use escapeHtml for user-supplied values
 */
import { describe, expect, it } from "vitest"
import { readFileSync, existsSync, readdirSync } from "fs"
import { resolve, join, relative } from "path"

const ROOT = resolve(__dirname, "..")

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Recursively find all page.tsx files under a directory */
function findPages(dir: string): string[] {
  const results: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...findPages(fullPath))
      } else if (entry.name === "page.tsx" || entry.name === "page.ts") {
        results.push(fullPath)
      }
    }
  } catch {
    // directory may not exist
  }
  return results
}

/** Recursively find all route.ts files under a directory */
function findRoutes(dir: string): string[] {
  const results: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...findRoutes(fullPath))
      } else if (entry.name === "route.ts" || entry.name === "route.js") {
        results.push(fullPath)
      }
    }
  } catch {
    // directory may not exist
  }
  return results
}

// ─── 1. Loading Boundaries ─────────────────────────────────────────────────
// Every page directory must have a loading.tsx for Next.js Suspense boundaries.
// ─────────────────────────────────────────────────────────────────────────────

describe("Loading Boundaries — All Portals", () => {
  const PORTAL_DIRS = ["app/affiliate", "app/admin", "app/buyer", "app/dealer"]

  for (const portalDir of PORTAL_DIRS) {
    const pages = findPages(resolve(ROOT, portalDir))

    for (const pagePath of pages) {
      const dir = pagePath.replace(/\/page\.tsx?$/, "")
      const loadingPath = join(dir, "loading.tsx")
      const relDir = relative(ROOT, dir)

      it(`${relDir} has loading.tsx`, () => {
        expect(existsSync(loadingPath)).toBe(true)
      })
    }
  }
})

// ─── 2. CSRF Protection ────────────────────────────────────────────────────
// All mutation fetch calls (POST/PUT/PATCH/DELETE) in dashboard pages must
// include CSRF headers via csrfHeaders() or getCsrfToken().
// Auth endpoints (/api/auth/*, /api/admin/auth/*) are exempt.
// ─────────────────────────────────────────────────────────────────────────────

describe("CSRF Protection — All Portals", () => {
  const PORTAL_DIRS = ["app/affiliate", "app/admin", "app/buyer", "app/dealer"]
  const AUTH_EXEMPT_PATTERNS = ["/api/auth/", "/api/admin/auth/"]

  for (const portalDir of PORTAL_DIRS) {
    const pages = [
      ...findPages(resolve(ROOT, portalDir)),
      // Also scan .tsx files that aren't page.tsx (e.g., audit-dashboard.tsx)
    ]

    // Add non-page .tsx files in portal dirs
    function findTsxFiles(dir: string): string[] {
      const results: string[] = []
      try {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const fullPath = join(dir, entry.name)
          if (entry.isDirectory()) {
            results.push(...findTsxFiles(fullPath))
          } else if (entry.name.endsWith(".tsx") && entry.name !== "page.tsx" && entry.name !== "loading.tsx" && entry.name !== "error.tsx" && entry.name !== "layout.tsx") {
            results.push(fullPath)
          }
        }
      } catch {
        // directory may not exist
      }
      return results
    }

    const allTsxFiles = [...pages, ...findTsxFiles(resolve(ROOT, portalDir))]

    for (const filePath of allTsxFiles) {
      const relPath = relative(ROOT, filePath)
      const src = readFileSync(filePath, "utf-8")

      // Check if file has mutation fetch calls
      const fetchPattern = /fetch\s*\([^)]*(?:method:\s*["'](?:POST|PUT|PATCH|DELETE)["'])/g
      const matches = src.match(fetchPattern)
      if (!matches) continue

      // Check if all fetch calls are to auth-exempt endpoints
      const allExempt = matches.every((m) => AUTH_EXEMPT_PATTERNS.some((p) => m.includes(p)))
      if (allExempt) continue

      it(`${relPath} uses csrfHeaders() or getCsrfToken() for mutations`, () => {
        expect(src).toMatch(/csrfHeaders|getCsrfToken/)
      })
    }
  }
})

// ─── 3. No error.message Leakage ──────────────────────────────────────────
// API route catch blocks must NOT leak error.message to clients.
// Auth routes (/api/admin/auth/*) are exempt.
// ─────────────────────────────────────────────────────────────────────────────

describe("API Routes — No error.message leakage", () => {
  const API_DIR = resolve(ROOT, "app/api")
  const routes = findRoutes(API_DIR)
  const AUTH_EXEMPT = ["/api/admin/auth/"]

  for (const routePath of routes) {
    const relPath = relative(ROOT, routePath)

    // Skip auth-exempt routes
    if (AUTH_EXEMPT.some((p) => relPath.includes(p))) continue

    // Skip health check (diagnostic)
    if (relPath.includes("admin/health")) continue

    const src = readFileSync(routePath, "utf-8")

    // Find catch blocks that return NextResponse.json
    const catchBlocks = src.match(/catch\s*\([^)]*\)\s*\{[^}]*NextResponse\.json[^}]*\}/g)
    if (!catchBlocks) continue

    for (const block of catchBlocks) {
      if (block.includes("NextResponse.json") && block.includes("error.message")) {
        it(`${relPath} does not leak error.message in catch block response`, () => {
          // Check if error.message appears directly in a JSON response argument
          // This pattern catches: { error: error.message } and similar
          const jsonCallPattern = /NextResponse\.json\s*\(\s*\{[^}]*error\.message[^}]*\}/g
          const jsonMatches = block.match(jsonCallPattern)
          expect(jsonMatches).toBeNull()
        })
      }
    }
  }
})

// ─── 3b. Sensitive Route Protection ───────────────────────────────────────
// Sensitive operational/diagnostic routes must NOT be anonymously accessible.
// They must import withAuth or requireInternalRequest from the guard.
// ─────────────────────────────────────────────────────────────────────────────

describe("Sensitive Routes — Not Anonymous", () => {
  const SENSITIVE_ROUTES = [
    "app/api/health/providers/route.ts",
    "app/api/health/db/route.ts",
    "app/api/auth/diagnostics/route.ts",
    "app/api/contract/scan/route.ts",
  ]

  for (const routeRel of SENSITIVE_ROUTES) {
    const fullPath = resolve(ROOT, routeRel)

    it(`${routeRel} requires auth or internal validation`, () => {
      if (!existsSync(fullPath)) return // skip if file was deleted
      const src = readFileSync(fullPath, "utf-8")
      const hasGuard = src.includes("withAuth") || src.includes("requireInternalRequest") || src.includes("requireAuth")
      expect(hasGuard).toBe(true)
    })
  }

  it("app/api/auction/[id]/best-price/route.ts is deprecated (returns 410) or protected", () => {
    const fullPath = resolve(ROOT, "app/api/auction/[id]/best-price/route.ts")
    if (!existsSync(fullPath)) return
    const src = readFileSync(fullPath, "utf-8")
    const isDeprecated = src.includes("410") || src.includes("GONE")
    const isProtected = src.includes("withAuth") || src.includes("requireAuth")
    expect(isDeprecated || isProtected).toBe(true)
  })
})

// ─── 4. Email Templates — escapeHtml ───────────────────────────────────────
// Email templates that render user-supplied values must use escapeHtml
// for defense-in-depth sanitization.
// ─────────────────────────────────────────────────────────────────────────────

describe("Email Templates — escapeHtml sanitization", () => {
  it("new-offer-email.tsx uses escapeHtml", () => {
    const src = readFileSync(resolve(ROOT, "components/email/new-offer-email.tsx"), "utf-8")
    expect(src).toContain("escapeHtml")
  })

  it("deal-complete-email.tsx uses escapeHtml", () => {
    const src = readFileSync(resolve(ROOT, "components/email/deal-complete-email.tsx"), "utf-8")
    expect(src).toContain("escapeHtml")
  })

  it("email.service.tsx uses escapeHtml", () => {
    const src = readFileSync(resolve(ROOT, "lib/services/email.service.tsx"), "utf-8")
    expect(src).toContain("escapeHtml")
  })
})

// ─── 5. Sensitive Routes Require Auth ──────────────────────────────────────
// Health, diagnostic, and admin-sensitive routes must NOT be anonymously
// accessible unless they are explicitly internal/webhook endpoints.
// ─────────────────────────────────────────────────────────────────────────────

describe("Sensitive Routes — Auth Required", () => {
  const SENSITIVE_ROUTES = [
    "app/api/health/db/route.ts",
    "app/api/health/providers/route.ts",
    "app/api/auth/diagnostics/route.ts",
  ]

  const AUTH_PATTERNS = [
    "getSession",
    "isAdminRole",
    "x-internal-key",
    "requireAuth",
    "withAuth",
    "INTERNAL_API_KEY",
  ]

  for (const routeRelPath of SENSITIVE_ROUTES) {
    it(`${routeRelPath} requires authentication`, () => {
      const filePath = resolve(ROOT, routeRelPath)
      expect(existsSync(filePath)).toBe(true)
      const src = readFileSync(filePath, "utf-8")
      const hasAuth = AUTH_PATTERNS.some((pattern) => src.includes(pattern))
      expect(hasAuth).toBe(true)
    })
  }
})
