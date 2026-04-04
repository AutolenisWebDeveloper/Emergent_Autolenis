import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

// ─── M006 Status Enums Migration Tests ──────────────────────────────────────
// Validates that targeted String status fields have been converted to Prisma
// enums, canonical constants are aligned, services use typed imports, and the
// migration file meets structural requirements.
// ─────────────────────────────────────────────────────────────────────────────

const root = resolve(__dirname, "..")

function src(path: string): string {
  return readFileSync(resolve(root, path), "utf-8")
}

const schema = src("prisma/schema.prisma")
const statusesSrc = src("lib/constants/statuses.ts")

// ─── 1. Prisma enum definitions ─────────────────────────────────────────────

describe("M006 · Prisma enum definitions", () => {
  const expectedEnums: Record<string, string[]> = {
    CommissionStatus: ["PENDING", "EARNED", "PAID", "CANCELLED"],
    PayoutStatus: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
    RefundStatus: ["PENDING", "SUCCEEDED", "FAILED", "CANCELLED"],
    DepositRequestStatus: ["REQUESTED", "PAID", "FAILED", "REFUNDED", "CANCELLED"],
    ConciergeFeeRequestStatus: ["REQUESTED", "PAID", "FAILED", "REFUNDED", "CANCELLED"],
    LenderDisbursementStatus: ["PENDING", "DISBURSED"],
  }

  for (const [enumName, expectedValues] of Object.entries(expectedEnums)) {
    it(`Prisma schema defines enum ${enumName}`, () => {
      const regex = new RegExp(`enum ${enumName} \\{([^}]+)\\}`, "s")
      const match = schema.match(regex)
      expect(match).not.toBeNull()
    })

    it(`${enumName} has expected values`, () => {
      const regex = new RegExp(`enum ${enumName} \\{([^}]+)\\}`, "s")
      const body = schema.match(regex)?.[1] ?? ""
      const values = body.split(/\s+/).filter(Boolean)
      for (const v of expectedValues) {
        expect(values).toContain(v)
      }
    })
  }
})

// ─── 2. Models use enum types (not String) ──────────────────────────────────

describe("M006 · Models use enum types", () => {
  const modelEnumFields: Array<{ model: string; field: string; enumType: string }> = [
    { model: "Commission", field: "status", enumType: "CommissionStatus" },
    { model: "Payout", field: "status", enumType: "PayoutStatus" },
    { model: "Refund", field: "status", enumType: "RefundStatus" },
    { model: "DepositRequest", field: "status", enumType: "DepositRequestStatus" },
    { model: "ConciergeFeeRequest", field: "status", enumType: "ConciergeFeeRequestStatus" },
    { model: "LenderFeeDisbursement", field: "status", enumType: "LenderDisbursementStatus" },
  ]

  for (const { model, field, enumType } of modelEnumFields) {
    it(`${model}.${field} uses ${enumType} enum (not String)`, () => {
      // Extract model body
      const modelRegex = new RegExp(`model ${model} \\{([^}]+)\\}`, "s")
      const modelBody = schema.match(modelRegex)?.[1] ?? ""

      // Field should reference the enum type, not String
      const fieldLine = modelBody.split("\n").find((l) => {
        const trimmed = l.trim()
        return trimmed.startsWith(field) && !trimmed.startsWith("//")
      })
      expect(fieldLine).toBeDefined()
      expect(fieldLine).toContain(enumType)
      expect(fieldLine).not.toContain("String")
    })
  }
})

// ─── 3. Canonical constants match Prisma enums ─────────────────────────────

describe("M006 · Canonical constants in statuses.ts", () => {
  const statusConstants: Record<string, string[]> = {
    CommissionStatus: ["PENDING", "EARNED", "PAID", "CANCELLED"],
    PayoutStatus: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
    RefundStatus: ["PENDING", "SUCCEEDED", "FAILED", "CANCELLED"],
    DepositRequestStatus: ["REQUESTED", "PAID", "FAILED", "REFUNDED", "CANCELLED"],
    ConciergeFeeRequestStatus: ["REQUESTED", "PAID", "FAILED", "REFUNDED", "CANCELLED"],
    LenderDisbursementStatus: ["PENDING", "DISBURSED"],
  }

  for (const [name, values] of Object.entries(statusConstants)) {
    it(`exports ${name} constant`, () => {
      expect(statusesSrc).toContain(name)
    })

    it(`${name} values match Prisma enum`, () => {
      const prismaBody =
        schema.match(new RegExp(`enum ${name} \\{([^}]+)\\}`, "s"))?.[1] ?? ""
      const prismaValues = prismaBody.split(/\s+/).filter(Boolean)
      for (const v of prismaValues) {
        expect(statusesSrc).toContain(`${v}: "${v}"`)
      }
    })
  }

  it("all new status constants reference Prisma enum in doc comment", () => {
    for (const name of Object.keys(statusConstants)) {
      expect(statusesSrc).toContain(`Matches Prisma \`enum ${name}\``)
    }
  })
})

// ─── 4. Service imports ─────────────────────────────────────────────────────

describe("M006 · Service imports", () => {
  it("payment.service.ts imports PaymentStatus from constants/statuses", () => {
    const svc = src("lib/services/payment.service.ts")
    expect(svc).toContain('from "@/lib/constants/statuses"')
    expect(svc).toContain("PaymentStatus")
  })

  it("payment.service.ts imports LenderDisbursementStatus from constants/statuses", () => {
    const svc = src("lib/services/payment.service.ts")
    expect(svc).toContain("LenderDisbursementStatus")
  })

  it("payment.service.ts uses LenderDisbursementStatus.PENDING", () => {
    const svc = src("lib/services/payment.service.ts")
    expect(svc).toContain("LenderDisbursementStatus.PENDING")
  })

  it("payment.service.ts uses LenderDisbursementStatus.DISBURSED", () => {
    const svc = src("lib/services/payment.service.ts")
    expect(svc).toContain("LenderDisbursementStatus.DISBURSED")
  })

  it("payment.service.ts uses PaymentStatus.PENDING for deposit/service-fee creation", () => {
    const svc = src("lib/services/payment.service.ts")
    expect(svc).toContain("PaymentStatus.PENDING")
  })

  it("affiliate.service.ts imports CommissionStatus and PayoutStatus", () => {
    const svc = src("lib/services/affiliate.service.ts")
    expect(svc).toContain("CommissionStatus")
    expect(svc).toContain("PayoutStatus")
    expect(svc).toContain('from "@/lib/constants/statuses"')
  })
})

// ─── 5. Migration M006 structure ────────────────────────────────────────────

describe("M006 · Migration file", () => {
  const migrationPath = resolve(root, "migrations/M006-status-enums.sql")

  it("M006 migration file exists", () => {
    expect(existsSync(migrationPath)).toBe(true)
  })

  it("contains pre-flight validation for invalid values", () => {
    const sql = readFileSync(migrationPath, "utf-8")
    expect(sql).toContain("M006 blocked")
    expect(sql).toContain("invalid status values")
  })

  it("creates all six enum types", () => {
    const sql = readFileSync(migrationPath, "utf-8")
    for (const name of [
      "CommissionStatus",
      "PayoutStatus",
      "RefundStatus",
      "DepositRequestStatus",
      "ConciergeFeeRequestStatus",
      "LenderDisbursementStatus",
    ]) {
      expect(sql).toContain(`CREATE TYPE "${name}"`)
    }
  })

  it("converts columns using ALTER TABLE ... TYPE ... USING", () => {
    const sql = readFileSync(migrationPath, "utf-8")
    for (const table of [
      "Commission",
      "Payout",
      "Refund",
      "DepositRequest",
      "ConciergeFeeRequest",
      "LenderFeeDisbursement",
    ]) {
      expect(sql).toContain(`ALTER TABLE "${table}"`)
    }
  })

  it("includes verification queries", () => {
    const sql = readFileSync(migrationPath, "utf-8")
    expect(sql).toContain("VERIFICATION")
    expect(sql).toContain("information_schema")
  })

  it("includes deployment notes", () => {
    const sql = readFileSync(migrationPath, "utf-8")
    expect(sql).toContain("DEPLOYMENT NOTES")
  })

  it("includes rollback notes", () => {
    const sql = readFileSync(migrationPath, "utf-8")
    expect(sql).toContain("ROLLBACK")
    expect(sql).toContain("DROP TYPE")
  })

  it("wraps in transaction", () => {
    const sql = readFileSync(migrationPath, "utf-8")
    expect(sql).toContain("BEGIN")
    expect(sql).toContain("COMMIT")
  })
})

// ─── 6. Migration notes document ────────────────────────────────────────────

describe("M006 · Migration notes", () => {
  it("docs/M006-status-enums-notes.md exists", () => {
    expect(existsSync(resolve(root, "docs/M006-status-enums-notes.md"))).toBe(true)
  })

  it("contains deployment instructions", () => {
    const notes = src("docs/M006-status-enums-notes.md")
    expect(notes).toContain("Deployment")
    expect(notes).toContain("psql")
  })

  it("contains rollback instructions", () => {
    const notes = src("docs/M006-status-enums-notes.md")
    expect(notes).toContain("Rollback")
  })

  it("contains verification queries", () => {
    const notes = src("docs/M006-status-enums-notes.md")
    expect(notes).toContain("Verification")
    expect(notes).toContain("information_schema")
  })
})

// ─── 7. Legacy types updated ────────────────────────────────────────────────

describe("M006 · Legacy types alignment", () => {
  const typesSrc = src("lib/types/index.ts")

  it("RefundStatus type uses uppercase enum values", () => {
    // Match the exact type definition line
    const refundLine = typesSrc.split("\n").find((l: string) => l.includes("type RefundStatus"))
    expect(refundLine).toBeDefined()
    expect(refundLine).toContain('"PENDING"')
    expect(refundLine).toContain('"SUCCEEDED"')
    expect(refundLine).toContain('"FAILED"')
    expect(refundLine).not.toContain('"processed"')
  })

  it("CommissionStatus type uses uppercase enum values", () => {
    const commLine = typesSrc.split("\n").find((l) => l.includes("type CommissionStatus"))
    expect(commLine).toBeDefined()
    expect(commLine).toContain('"EARNED"')
    expect(commLine).toContain('"CANCELLED"')
    expect(commLine).not.toContain('"approved"')
    expect(commLine).not.toContain('"void"')
  })

  it("PayoutStatus type uses uppercase enum values", () => {
    const payoutLine = typesSrc.split("\n").find((l) => l.includes("type PayoutStatus"))
    expect(payoutLine).toBeDefined()
    expect(payoutLine).toContain('"PROCESSING"')
    expect(payoutLine).toContain('"COMPLETED"')
    expect(payoutLine).not.toContain('"sent"')
  })
})
