/**
 * Audit Logging Consistency Tests
 *
 * Validates that critical admin, compliance, and financial mutation paths:
 * 1. Use canonical audit models (ComplianceEvent, AdminAuditLog, FinancialAuditLog)
 * 2. Use only schema-valid fields (no `type`, `severity`, `relatedId`, `entityType`, `entityId`)
 * 3. Include the required `action` field in ComplianceEvent inserts
 * 4. Do not silently swallow audit write failures
 * 5. Break-glass route writes immutable AdminAuditLog entries via Prisma
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(__dirname, "..")

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf-8")
}

// =====================================================
// A) logAdminAction — no silent audit failure
// =====================================================
describe("A) logAdminAction — audit write error propagation", () => {
  const src = readSource("lib/admin-auth.ts")

  it("should check Supabase insert result for errors", () => {
    // Must destructure the error from the insert call
    expect(src).toContain('const { error } = await supabase.from("AdminAuditLog").insert(')
  })

  it("should throw on audit write failure instead of silently catching", () => {
    // Must throw when error is returned
    expect(src).toContain("throw new Error(`Audit log persistence failed:")
  })

  it("should NOT have a try/catch that swallows audit errors", () => {
    // The old pattern: try { insert } catch { logger.error(...) } — should be gone
    const logAdminFn = src.slice(src.indexOf("export async function logAdminAction"))
    const fnEnd = logAdminFn.indexOf("\n}\n") + 3
    const fnBody = logAdminFn.slice(0, fnEnd)
    expect(fnBody).not.toMatch(/try\s*\{[\s\S]*?from\("AdminAuditLog"\)[\s\S]*?\}\s*catch/)
  })

  it("should include ipAddress and userAgent in the audit insert", () => {
    expect(src).toMatch(/ipAddress:\s*details\.ipAddress/)
    expect(src).toMatch(/userAgent:\s*details\.userAgent/)
  })
})

// =====================================================
// B) ComplianceEvent inserts use canonical fields only
// =====================================================
describe("B) Admin routes — ComplianceEvent uses canonical schema fields", () => {
  const ADMIN_ROUTES_WITH_COMPLIANCE_EVENTS = [
    {
      path: "app/api/admin/buyers/[buyerId]/status/route.ts",
      label: "Buyer status",
    },
    {
      path: "app/api/admin/dealers/[dealerId]/approve/route.ts",
      label: "Dealer approve",
    },
    {
      path: "app/api/admin/dealers/[dealerId]/suspend/route.ts",
      label: "Dealer suspend",
    },
    {
      path: "app/api/admin/affiliates/[affiliateId]/status/route.ts",
      label: "Affiliate status",
    },
    {
      path: "app/api/admin/auctions/[auctionId]/best-price/recompute/route.ts",
      label: "Auction best-price recompute",
    },
  ]

  for (const route of ADMIN_ROUTES_WITH_COMPLIANCE_EVENTS) {
    describe(`${route.label} (${route.path})`, () => {
      const src = readSource(route.path)

      it("should include the required 'action' field in ComplianceEvent insert", () => {
        // The insert must contain an `action:` field
        const insertBlock = src.slice(src.indexOf('from("ComplianceEvent").insert('))
        expect(insertBlock).toMatch(/action:\s*["'`]/)
      })

      it("should NOT use non-existent schema fields", () => {
        // These fields do not exist in the ComplianceEvent Prisma model
        const insertStart = src.indexOf('from("ComplianceEvent").insert(')
        const insertBlock = src.slice(insertStart, insertStart + 500)
        expect(insertBlock).not.toMatch(/\btype:\s*"/)
        expect(insertBlock).not.toMatch(/\bseverity:\s*"/)
        expect(insertBlock).not.toMatch(/\brelatedId:/)
        expect(insertBlock).not.toMatch(/\bentityType:\s*"/)
        expect(insertBlock).not.toMatch(/\bentityId:/)
      })

      it("should check the ComplianceEvent insert result for errors", () => {
        expect(src).toContain("error: auditError")
        expect(src).toMatch(/if\s*\(auditError\)/)
      })

      it("should NOT silently continue after audit write failure", () => {
        // After checking auditError, must return an error response or throw
        const auditIdx = src.indexOf("if (auditError)")
        const afterAuditCheck = src.slice(auditIdx, auditIdx + 300)
        expect(afterAuditCheck).toMatch(/return NextResponse\.json\(|throw/)
      })

      it("should use logger instead of console.error for error logging", () => {
        expect(src).not.toContain("console.error")
      })
    })
  }
})

// =====================================================
// C) Payment service — ComplianceEvent canonical fields
// =====================================================
describe("C) Payment service — ComplianceEvent uses canonical fields", () => {
  const src = readSource("lib/services/payment.service.ts")

  it("should use 'action' field instead of 'type' in ComplianceEvent inserts", () => {
    // Find all ComplianceEvent inserts
    const matches = src.match(/from\("ComplianceEvent"\)\.insert\(\{[\s\S]*?\}\)/g) || []
    expect(matches.length).toBeGreaterThanOrEqual(5)

    for (const match of matches) {
      // Each must have `action:` and NOT `type:`
      expect(match).toMatch(/\baction:\s*"/)
      expect(match).not.toMatch(/\btype:\s*"/)
    }
  })

  it("should use canonical 'dealId' instead of 'relatedId'", () => {
    // No ComplianceEvent insert should use `relatedId`
    const inserts = src.match(/from\("ComplianceEvent"\)\.insert\(\{[\s\S]*?\}\)/g) || []
    for (const insert of inserts) {
      expect(insert).not.toContain("relatedId")
    }
  })

  it("should check ComplianceEvent insert results for errors", () => {
    // Every ComplianceEvent insert should destructure and check `error`
    const insertCalls = (src.match(/from\("ComplianceEvent"\)\.insert/g) || []).length
    const errorChecks = (src.match(/error:\s*auditError.*from\("ComplianceEvent"\)|from\("ComplianceEvent"\)[\s\S]*?error:\s*auditError/g) || []).length
    // Every insert should have a corresponding error destructure
    expect(insertCalls).toBeGreaterThanOrEqual(5)
    // We check the pattern: { error: auditError } = await ... .from("ComplianceEvent").insert
    const destructuredInserts = (src.match(/\{\s*error:\s*auditError\s*\}\s*=\s*await\s+supabase\.from\("ComplianceEvent"\)/g) || []).length
    expect(destructuredInserts).toBe(insertCalls)
  })

  it("should throw on audit write failure in payment paths", () => {
    // After auditError check, must throw
    const auditChecks = src.match(/if\s*\(auditError\)\s*\{[\s\S]*?throw new Error/g) || []
    expect(auditChecks.length).toBeGreaterThanOrEqual(5)
  })

  it("should import logger", () => {
    expect(src).toContain('import { logger } from "@/lib/logger"')
  })
})

// =====================================================
// D) Financial audit routes — FinancialAuditLog error handling
// =====================================================
describe("D) Financial routes — FinancialAuditLog error handling", () => {
  describe("Financial export route", () => {
    const src = readSource("app/api/admin/financial/export/route.ts")

    it("should check FinancialAuditLog insert result for errors", () => {
      expect(src).toContain("error: auditError")
      expect(src).toMatch(/if\s*\(auditError\)/)
    })

    it("should return descriptive error when audit write fails", () => {
      const auditIdx = src.indexOf("if (auditError)")
      const afterCheck = src.slice(auditIdx, auditIdx + 300)
      expect(afterCheck).toContain("audit log write failed")
    })

    it("should use logger instead of silent console", () => {
      expect(src).toContain('import { logger }')
    })
  })

  describe("Financial reconciliation route", () => {
    const src = readSource("app/api/admin/financial/reconciliation/route.ts")

    it("should check FinancialAuditLog insert result for errors", () => {
      expect(src).toContain("error: auditError")
      expect(src).toMatch(/if\s*\(auditError\)/)
    })

    it("should return descriptive error when audit write fails", () => {
      const auditIdx = src.indexOf("if (auditError)")
      const afterCheck = src.slice(auditIdx, auditIdx + 300)
      expect(afterCheck).toContain("audit log write failed")
    })
  })
})

// =====================================================
// E) Break-glass route — immutable audit records
// =====================================================
describe("E) Break-glass route — immutable AdminAuditLog via Prisma", () => {
  const src = readSource("app/api/admin/break-glass/route.ts")

  it("should write audit log via Prisma (not Supabase)", () => {
    expect(src).toContain("prisma.adminAuditLog.create")
  })

  it("should include action BREAK_GLASS", () => {
    expect(src).toContain('action: "BREAK_GLASS"')
  })

  it("should capture IP address", () => {
    expect(src).toContain("ipAddress")
    expect(src).toContain("x-forwarded-for")
  })

  it("should capture user agent", () => {
    expect(src).toContain("userAgent")
    expect(src).toContain("user-agent")
  })

  it("should include correlationId in audit details", () => {
    expect(src).toContain("correlationId")
  })

  it("should include actor userId in audit record", () => {
    expect(src).toContain("userId: actor.id")
  })

  it("should use Zod for input validation", () => {
    expect(src).toContain("breakGlassSchema")
    expect(src).toContain("safeParse")
  })

  it("should let Prisma errors propagate (no silent catch around audit write)", () => {
    // The prisma.adminAuditLog.create call should NOT be wrapped in its own try/catch
    // It should be inside the outer try block so failures propagate
    const createIdx = src.indexOf("prisma.adminAuditLog.create")
    const beforeCreate = src.slice(0, createIdx)
    // Count try blocks - should only be the outer one and the body parse one
    const tryBlocks = beforeCreate.match(/\btry\s*\{/g) || []
    expect(tryBlocks.length).toBeLessThanOrEqual(2) // outer try + body parse try
  })
})
