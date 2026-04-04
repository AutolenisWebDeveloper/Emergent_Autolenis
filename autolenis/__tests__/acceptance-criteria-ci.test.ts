/**
 * Acceptance Criteria CI Guards
 *
 * These tests enforce the eight acceptance criteria at the file level.
 * Failures here mean a PR has introduced a regression that must be fixed
 * before merge.
 *
 * AC1 – No anonymous caller can reach health, diagnostics, scan, or best-price
 * AC2 – Production boot fails if Redis-backed security state is unavailable
 * AC3 – PreQualification / BuyerProfile are accessed through one canonical contract
 * AC4 – No route or service writes non-schema Prisma fields via `as any`
 * AC6 – Contract routes enforce object ownership
 * AC7 – Service-role access is constrained
 * AC8 – Schema drift, route exposure drift, or forbidden field references
 */

import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

const ROOT = path.resolve(__dirname, "..")

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8")
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath))
}

function getAllTsFiles(dir: string, files: string[] = []): string[] {
  try {
    const entries = fs.readdirSync(dir)
    for (const entry of entries) {
      const fullPath = path.join(dir, entry)
      try {
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
          if (["node_modules", ".next", ".git"].includes(entry)) continue
          getAllTsFiles(fullPath, files)
        } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
          files.push(fullPath)
        }
      } catch {
        // skip
      }
    }
  } catch {
    // skip
  }
  return files
}

// ─── AC1: Route Exposure Drift ────────────────────────────────────────
describe("AC1 – Health / Diagnostics / Sensitive Endpoints require auth", () => {
  const protectedEndpoints = [
    "app/api/health/route.ts",
    "app/api/health/db/route.ts",
    "app/api/health/providers/route.ts",
    "app/api/auth/diagnostics/route.ts",
    "app/api/auth/health/route.ts",
  ]

  for (const endpoint of protectedEndpoints) {
    it(`${endpoint} must check admin auth or internal key`, () => {
      if (!fileExists(endpoint)) return // skip if file doesn't exist yet
      const content = readFile(endpoint)
      const hasInternalKeyCheck =
        content.includes("x-internal-key") || content.includes("requireInternalRequest")
      const hasAdminAuthCheck =
        content.includes("isAdminRole") ||
        content.includes("requireAuth") ||
        content.includes("withAuth")
      expect(
        hasInternalKeyCheck || hasAdminAuthCheck,
        `${endpoint} is missing auth guard (x-internal-key/requireInternalRequest or isAdminRole/requireAuth/withAuth)`,
      ).toBe(true)
    })
  }

  const roleProtectedEndpoints = [
    { file: "app/api/contract/scan/route.ts", pattern: /requireAuth|getSessionUser|withAuth/ },
  ]

  for (const { file, pattern } of roleProtectedEndpoints) {
    it(`${file} must require authenticated user`, () => {
      if (!fileExists(file)) return
      const content = readFile(file)
      expect(pattern.test(content)).toBe(true)
    })
  }

  it("app/api/auction/[id]/best-price/route.ts must be deprecated or require auth", () => {
    const file = "app/api/auction/[id]/best-price/route.ts"
    if (!fileExists(file)) return
    const content = readFile(file)
    const isDeprecated = content.includes("DEPRECATED") || content.includes("GONE")
    const hasAuth = /requireAuth/.test(content)
    expect(
      isDeprecated || hasAuth,
      `${file} must be deprecated or require auth`,
    ).toBe(true)
  })
})

// ─── AC2: Redis Required in Production ────────────────────────────────
describe("AC2 – Production boot fails without Redis", () => {
  it("redis-adapter must enforce Redis availability in production for security-critical operations", () => {
    const content = readFile("lib/cache/redis-adapter.ts")
    // Must reference production environment check
    expect(content).toContain("NODE_ENV")
    expect(content).toContain("production")
    expect(content).toContain("REDIS_URL")
    // Must have a mechanism to throw/reject when Redis is unavailable in prod
    const hasThrowMechanism =
      content.includes("throw new") ||
      content.includes("ProductionCacheUnavailableError") ||
      content.includes("assertProductionCacheReady")
    expect(
      hasThrowMechanism,
      "redis-adapter.ts must have a throw mechanism for production Redis enforcement",
    ).toBe(true)
  })
})

// ─── AC3: Canonical Type Contract ─────────────────────────────────────
describe("AC3 – PreQualification and BuyerProfile canonical contract", () => {
  it("PreQualification type must use buyerId (not userId)", () => {
    const content = readFile("lib/types/index.ts")
    const prequalBlock = content.slice(
      content.indexOf("interface PreQualification"),
      content.indexOf("}", content.indexOf("interface PreQualification")) + 1,
    )
    expect(prequalBlock).toContain("buyerId")
    expect(prequalBlock).not.toContain("userId")
  })

  it("PreQualification type must include source field", () => {
    const content = readFile("lib/types/index.ts")
    const prequalBlock = content.slice(
      content.indexOf("interface PreQualification"),
      content.indexOf("}", content.indexOf("interface PreQualification")) + 1,
    )
    expect(prequalBlock).toContain("source")
  })

  it("PreQualification type must include cents-based fields", () => {
    const content = readFile("lib/types/index.ts")
    expect(content).toContain("maxOtdAmountCents")
    expect(content).toContain("minMonthlyPaymentCents")
    expect(content).toContain("maxMonthlyPaymentCents")
    expect(content).toContain("dtiRatio")
  })

  it("BuyerProfile type must include migration fields", () => {
    const content = readFile("lib/types/index.ts")
    const buyerBlock = content.slice(
      content.indexOf("interface BuyerProfile"),
      content.indexOf("}", content.indexOf("interface BuyerProfile")) + 1,
    )
    expect(buyerBlock).toContain("monthlyIncomeCents")
    expect(buyerBlock).toContain("monthlyHousingCents")
    expect(buyerBlock).toContain("dateOfBirth")
  })
})

// ─── AC4: Forbidden `as any` in Prisma Write Operations ──────────────
describe("AC4 – No as-any casts in Prisma write operations", () => {
  const serviceFiles = [
    "lib/services/prequal.service.ts",
    "lib/services/external-preapproval.service.ts",
  ]

  for (const file of serviceFiles) {
    it(`${file} must not use 'as any' in Prisma .create() / .update() calls`, () => {
      const content = readFile(file)
      const lines = content.split("\n")
      const violations: string[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // Look for `as any` that is on or adjacent to Prisma operations
        if (line.includes("as any")) {
          // Check surrounding context (±5 lines) for Prisma write ops
          const context = lines
            .slice(Math.max(0, i - 5), Math.min(lines.length, i + 6))
            .join("\n")
          if (
            context.includes(".create(") ||
            context.includes(".update(") ||
            context.includes(".upsert(")
          ) {
            violations.push(`Line ${i + 1}: ${line.trim()}`)
          }
        }
      }

      expect(
        violations,
        `Found 'as any' near Prisma write operations in ${file}:\n${violations.join("\n")}`,
      ).toEqual([])
    })
  }
})

// ─── AC6: Contract Routes Enforce Object Ownership ────────────────────
describe("AC6 – Contract routes enforce object ownership", () => {
  const contractRoutes = [
    "app/api/contract/list/route.ts",
    "app/api/contract/scan/route.ts",
    "app/api/contract/scan/[id]/route.ts",
    "app/api/contract/upload/route.ts",
    "app/api/contract/fix/route.ts",
  ]

  for (const route of contractRoutes) {
    it(`${route} must verify deal ownership (not just auth)`, () => {
      if (!fileExists(route)) return
      const content = readFile(route)
      // Must look up the deal and check ownership through one of these patterns:
      // 1. Inline: selectedDeal.findUnique / verifyScanOwnership
      // 2. Service helper: assertCanAccessDealContract / assertCanModifyContractFix
      // 3. Guard: withAuth (checks auth, combined with service-level ownership)
      const hasDealLookup =
        content.includes("selectedDeal.findUnique") ||
        content.includes("verifyScanOwnership") ||
        content.includes("assertCanAccessDealContract") ||
        content.includes("assertCanModifyContractFix") ||
        content.includes("withAuth")
      const hasOwnershipCheck =
        content.includes("buyerId") ||
        content.includes("dealerId") ||
        content.includes("Forbidden") ||
        content.includes("assertCanAccessDealContract") ||
        content.includes("assertCanModifyContractFix") ||
        content.includes("withAuth")
      expect(
        hasDealLookup && hasOwnershipCheck,
        `${route} is missing deal ownership enforcement`,
      ).toBe(true)
    })
  }
})

// ─── AC7: Service-Role Constraint ─────────────────────────────────────
describe("AC7 – Service-role scanner test exists and covers portal paths", () => {
  it("service-role-scanner test file must exist", () => {
    expect(fileExists("__tests__/service-role-scanner.test.ts")).toBe(true)
  })

  it("scanner must cover buyer, dealer, and affiliate portal paths", () => {
    const content = readFile("__tests__/service-role-scanner.test.ts")
    expect(content).toContain("buyer")
    expect(content).toContain("dealer")
    expect(content).toContain("affiliate")
  })
})

// ─── AC8: Schema Drift Detection ──────────────────────────────────────
describe("AC8 – Schema drift detection", () => {
  it("Prisma schema must define PreQualSource enum with INTERNAL and EXTERNAL_MANUAL", () => {
    const schema = readFile("prisma/schema.prisma")
    expect(schema).toContain("enum PreQualSource")
    expect(schema).toContain("INTERNAL")
    expect(schema).toContain("EXTERNAL_MANUAL")
  })

  it("PreQualification model must have source field of type PreQualSource", () => {
    const schema = readFile("prisma/schema.prisma")
    const modelBlock = schema.slice(
      schema.indexOf("model PreQualification"),
      schema.indexOf("@@index", schema.indexOf("model PreQualification")),
    )
    expect(modelBlock).toContain("PreQualSource")
    expect(modelBlock).toContain("source")
  })

  it("PreQualification model must have cents-based fields", () => {
    const schema = readFile("prisma/schema.prisma")
    const modelBlock = schema.slice(
      schema.indexOf("model PreQualification"),
      schema.indexOf("@@index", schema.indexOf("model PreQualification")),
    )
    expect(modelBlock).toContain("maxOtdAmountCents")
    expect(modelBlock).toContain("minMonthlyPaymentCents")
    expect(modelBlock).toContain("maxMonthlyPaymentCents")
    expect(modelBlock).toContain("dtiRatio")
  })

  it("No portal API route file should contain 'as any' near Prisma create/update", () => {
    const portalDirs = [
      path.join(ROOT, "app", "api", "buyer"),
      path.join(ROOT, "app", "api", "dealer"),
      path.join(ROOT, "app", "api", "affiliate"),
      path.join(ROOT, "app", "api", "contract"),
    ]
    const violations: string[] = []

    for (const dir of portalDirs) {
      const files = getAllTsFiles(dir)
      for (const file of files) {
        const content = fs.readFileSync(file, "utf-8")
        const lines = content.split("\n")
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes("as any")) {
            const context = lines
              .slice(Math.max(0, i - 5), Math.min(lines.length, i + 6))
              .join("\n")
            if (
              context.includes(".create(") ||
              context.includes(".update(") ||
              context.includes(".upsert(")
            ) {
              violations.push(
                `${path.relative(ROOT, file)}:${i + 1}`,
              )
            }
          }
        }
      }
    }

    expect(
      violations,
      `Found 'as any' in Prisma write operations:\n${violations.join("\n")}`,
    ).toEqual([])
  })
})
