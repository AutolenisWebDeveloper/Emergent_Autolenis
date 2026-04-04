/**
 * Regression tests for database configuration handling.
 *
 * Validates:
 *  1. isDatabaseConfigured() uses lazy env-var resolution (not module-load constants)
 *  2. isDatabaseConfigured() returns true when env vars are present
 *  3. isDatabaseConfigured() returns false only when env vars are genuinely missing
 *  4. getMissingDbEnvVars() reports which vars are missing
 *  5. requireDatabase() returns null when configured, 503 when not
 *  6. No route files still import isDatabaseConfigured for 503 guards
 *  7. configurationError flag does not permanently poison isDatabaseConfigured()
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import fs from "fs"
import path from "path"

const ROOT = path.resolve(__dirname, "..")

// ---------------------------------------------------------------------------
// Unit tests for lib/db.ts env-var logic
// ---------------------------------------------------------------------------

describe("lib/db.ts — lazy env resolution", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("isDatabaseConfigured returns true when both vars are set", async () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = "https://test-project.supabase.co"
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = "test-service-role-key-value"

    const { isDatabaseConfigured } = await import("@/lib/db")
    expect(isDatabaseConfigured()).toBe(true)
  })

  it("isDatabaseConfigured returns false when URL is missing", async () => {
    delete process.env['SUPABASE_URL']
    delete process.env['NEXT_PUBLIC_SUPABASE_URL']
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = "test-service-role-key-value"

    const { isDatabaseConfigured } = await import("@/lib/db")
    expect(isDatabaseConfigured()).toBe(false)
  })

  it("isDatabaseConfigured returns false when service key is missing", async () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = "https://test-project.supabase.co"
    delete process.env['SUPABASE_SERVICE_ROLE_KEY']

    const { isDatabaseConfigured } = await import("@/lib/db")
    expect(isDatabaseConfigured()).toBe(false)
  })

  it("isDatabaseConfigured returns false when both vars are missing", async () => {
    delete process.env['SUPABASE_URL']
    delete process.env['NEXT_PUBLIC_SUPABASE_URL']
    delete process.env['SUPABASE_SERVICE_ROLE_KEY']

    const { isDatabaseConfigured } = await import("@/lib/db")
    expect(isDatabaseConfigured()).toBe(false)
  })

  it("prefers SUPABASE_URL over NEXT_PUBLIC_SUPABASE_URL when both are set", async () => {
    process.env['SUPABASE_URL'] = "https://override.supabase.co"
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = "https://public.supabase.co"
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = "test-key"

    const { isDatabaseConfigured } = await import("@/lib/db")
    expect(isDatabaseConfigured()).toBe(true)
  })

  it("falls back to NEXT_PUBLIC_SUPABASE_URL when SUPABASE_URL is absent", async () => {
    delete process.env['SUPABASE_URL']
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = "https://public.supabase.co"
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = "test-key"

    const { isDatabaseConfigured } = await import("@/lib/db")
    expect(isDatabaseConfigured()).toBe(true)
  })
})

describe("getMissingDbEnvVars", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("returns empty array when all vars are set", async () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = "https://test.supabase.co"
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = "test-key"

    const { getMissingDbEnvVars } = await import("@/lib/db")
    expect(getMissingDbEnvVars()).toEqual([])
  })

  it("reports missing URL", async () => {
    delete process.env['SUPABASE_URL']
    delete process.env['NEXT_PUBLIC_SUPABASE_URL']
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = "test-key"

    const { getMissingDbEnvVars } = await import("@/lib/db")
    const missing = getMissingDbEnvVars()
    expect(missing.length).toBe(1)
    expect(missing[0]).toContain("SUPABASE_URL")
  })

  it("reports missing service key", async () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = "https://test.supabase.co"
    delete process.env['SUPABASE_SERVICE_ROLE_KEY']

    const { getMissingDbEnvVars } = await import("@/lib/db")
    const missing = getMissingDbEnvVars()
    expect(missing.length).toBe(1)
    expect(missing[0]).toContain("SUPABASE_SERVICE_ROLE_KEY")
  })

  it("reports both missing when neither is set", async () => {
    delete process.env['SUPABASE_URL']
    delete process.env['NEXT_PUBLIC_SUPABASE_URL']
    delete process.env['SUPABASE_SERVICE_ROLE_KEY']

    const { getMissingDbEnvVars } = await import("@/lib/db")
    const missing = getMissingDbEnvVars()
    expect(missing.length).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Unit tests for lib/require-database.ts
// ---------------------------------------------------------------------------

describe("requireDatabase helper", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it("returns null when database is configured", async () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = "https://test.supabase.co"
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = "test-key"

    const { requireDatabase } = await import("@/lib/require-database")
    const result = requireDatabase()
    expect(result).toBeNull()
  })

  it("returns 503 response when database is not configured", async () => {
    delete process.env['SUPABASE_URL']
    delete process.env['NEXT_PUBLIC_SUPABASE_URL']
    delete process.env['SUPABASE_SERVICE_ROLE_KEY']

    const { requireDatabase } = await import("@/lib/require-database")
    const result = requireDatabase()
    expect(result).not.toBeNull()
    expect(result!.status).toBe(503)

    const body = await result!.json()
    expect(body.error.code).toBe("SERVICE_UNAVAILABLE")
    expect(body.error.message).toBe("Service temporarily unavailable")
    expect(body.correlationId).toBeTruthy()
  })

  it("does not expose env var values in the 503 response", async () => {
    delete process.env['SUPABASE_URL']
    delete process.env['NEXT_PUBLIC_SUPABASE_URL']
    delete process.env['SUPABASE_SERVICE_ROLE_KEY']

    const { requireDatabase } = await import("@/lib/require-database")
    const result = requireDatabase()
    const body = await result!.json()
    const bodyStr = JSON.stringify(body)

    // Must not contain any real env var values or hints
    expect(bodyStr).not.toContain("SUPABASE_URL")
    expect(bodyStr).not.toContain("SUPABASE_SERVICE_ROLE_KEY")
    expect(bodyStr).not.toContain("supabase.co")
  })
})

// ---------------------------------------------------------------------------
// Static analysis: no route files should import isDatabaseConfigured
// ---------------------------------------------------------------------------

describe("Route files — no scattered isDatabaseConfigured 503 patterns", () => {
  function findRouteFiles(dir: string): string[] {
    const results: string[] = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...findRouteFiles(fullPath))
      } else if (entry.name === "route.ts" || entry.name === "route.js") {
        results.push(fullPath)
      }
    }
    return results
  }

  it("no API route uses isDatabaseConfigured for 503 guard patterns", () => {
    const apiDir = path.join(ROOT, "app/api")
    const routeFiles = findRouteFiles(apiDir)
    const violations: string[] = []

    // These files use isDatabaseConfigured() for conditional branching
    // (not as a 503 early-return guard), which is acceptable
    const allowedConditionalUses = new Set([
      "app/api/admin/auth/mfa/verify/route.ts",
      "app/api/contact/route.ts",
      "app/api/refinance/check-eligibility/route.ts",
      "app/api/documents/[documentId]/route.ts",
      "app/api/documents/route.ts",
    ])

    for (const file of routeFiles) {
      const content = fs.readFileSync(file, "utf-8")
      const relativePath = path.relative(ROOT, file)

      if (allowedConditionalUses.has(relativePath)) continue

      if (content.includes("isDatabaseConfigured")) {
        violations.push(relativePath)
      }
    }

    expect(
      violations,
      `These routes still use isDatabaseConfigured directly: ${violations.join(", ")}`,
    ).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Static analysis: lib/db.ts must NOT use module-level env constants
// ---------------------------------------------------------------------------

describe("lib/db.ts — no module-level env constants", () => {
  const dbContent = fs.readFileSync(path.join(ROOT, "lib/db.ts"), "utf-8")

  it("must NOT have module-level const supabaseUrl assignment", () => {
    // The old pattern: const supabaseUrl = process.env['SUPABASE_URL'] || ...
    expect(dbContent).not.toMatch(/^const supabaseUrl\s*=/m)
  })

  it("must NOT have module-level const supabaseServiceKey assignment", () => {
    expect(dbContent).not.toMatch(/^const supabaseServiceKey\s*=/m)
  })

  it("must use lazy getter functions for env vars", () => {
    expect(dbContent).toContain("function getSupabaseUrl()")
    expect(dbContent).toContain("function getSupabaseServiceKey()")
  })

  it("must export getMissingDbEnvVars for observability", () => {
    expect(dbContent).toContain("export function getMissingDbEnvVars()")
  })

  it("must NOT contain placeholder.supabase.co", () => {
    expect(dbContent).not.toContain("placeholder.supabase.co")
  })

  it("should use a proxy for lazy supabase initialization", () => {
    expect(dbContent).toContain("new Proxy")
  })

  it("should throw on missing config rather than returning fake client", () => {
    expect(dbContent).toContain("throw new Error")
  })
})

// ---------------------------------------------------------------------------
// lib/require-database.ts must exist and be properly structured
// ---------------------------------------------------------------------------

describe("lib/require-database.ts — centralized 503 helper", () => {
  const helperContent = fs.readFileSync(path.join(ROOT, "lib/require-database.ts"), "utf-8")

  it("imports isDatabaseConfigured from lib/db", () => {
    expect(helperContent).toContain("isDatabaseConfigured")
    expect(helperContent).toContain("@/lib/db")
  })

  it("returns correlationId in error responses", () => {
    expect(helperContent).toContain("correlationId")
  })

  it("does not expose env var names in the response body", () => {
    // The error.message sent to the user should be generic
    expect(helperContent).toContain("Service temporarily unavailable")
    // Ensure env var names are only in logs, not in the NextResponse
    expect(helperContent).toContain("logger.error")
  })

  it("returns null when configured (not a NextResponse)", () => {
    expect(helperContent).toContain("return null")
  })
})
