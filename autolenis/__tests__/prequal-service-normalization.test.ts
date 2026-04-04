/**
 * PreQual Service Normalization Test
 *
 * Validates that the prequal service and its API routes:
 * 1. Use canonical camelCase cents-based fields only
 * 2. Block production soft-pull (not FCRA-compliant)
 * 3. Include proper consent validation
 * 4. Return structured error responses
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

const ROOT = join(__dirname, "..")

// ─── 1. Canonical Field Usage ───────────────────────────────────────────────

describe("PreQual Normalization — Canonical fields", () => {
  const routeSrc = readFileSync(join(ROOT, "app/api/buyer/prequal/route.ts"), "utf-8")

  it("API response maps to canonical cents-based fields", () => {
    expect(routeSrc).toContain("maxOtdAmountCents")
    expect(routeSrc).toContain("minMonthlyPaymentCents")
    expect(routeSrc).toContain("maxMonthlyPaymentCents")
    expect(routeSrc).toContain("dtiRatio")
  })

  it("Prisma schema defines canonical PreQualification fields", () => {
    const schema = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf-8")
    const modelMatch = schema.match(/model\s+PreQualification\s*\{[\s\S]*?\n\}/m)
    expect(modelMatch).not.toBeNull()
    const model = modelMatch![0]
    expect(model).toContain("maxOtdAmountCents")
    expect(model).toContain("minMonthlyPaymentCents")
    expect(model).toContain("maxMonthlyPaymentCents")
    expect(model).toContain("dtiRatio")
  })
})

// ─── 2. Production Guard ────────────────────────────────────────────────────

describe("PreQual Normalization — Production guard", () => {
  const routeSrc = readFileSync(join(ROOT, "app/api/buyer/prequal/route.ts"), "utf-8")

  it("blocks POST in production (FCRA compliance)", () => {
    // POST handler should check NODE_ENV === production and return 503
    expect(routeSrc).toContain("production")
    expect(routeSrc).toMatch(/503/)
  })
})

// ─── 3. Draft Persistence ───────────────────────────────────────────────────

describe("PreQual Normalization — Draft endpoint", () => {
  let draftSrc: string

  try {
    draftSrc = readFileSync(join(ROOT, "app/api/buyer/prequal/draft/route.ts"), "utf-8")
  } catch {
    draftSrc = ""
  }

  it("draft route exists and handles GET/PUT", () => {
    expect(draftSrc).toBeTruthy()
    expect(draftSrc).toContain("export async function GET")
    expect(draftSrc).toContain("export async function PUT")
  })

  it("draft route enforces BUYER role", () => {
    expect(draftSrc).toContain("BUYER")
  })
})

// ─── 4. Service Uses Canonical Fields ───────────────────────────────────────

describe("PreQual Normalization — Service layer", () => {
  const serviceSrc = readFileSync(join(ROOT, "lib/services/prequal.service.ts"), "utf-8")

  it("prequal service references canonical cents fields", () => {
    expect(serviceSrc).toContain("maxOtdAmountCents")
    expect(serviceSrc).toContain("minMonthlyPaymentCents")
    expect(serviceSrc).toContain("maxMonthlyPaymentCents")
    expect(serviceSrc).toContain("dtiRatio")
  })

  it("prequal service includes consent validation", () => {
    expect(serviceSrc).toMatch(/consent/i)
  })
})
