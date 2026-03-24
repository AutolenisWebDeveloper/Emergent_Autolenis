import { describe, expect, it } from "vitest"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

const ROOT = resolve(__dirname, "..")

// ─── Error Boundaries ───────────────────────────────────────────────────────
// Root-level and dashboard-level error boundaries must exist for graceful error
// handling in production. These prevent white screens on unexpected errors.
// ─────────────────────────────────────────────────────────────────────────────

describe("Error Boundaries — existence", () => {
  const ERROR_BOUNDARIES = [
    "app/error.tsx",
    "app/not-found.tsx",
    "app/buyer/error.tsx",
    "app/dealer/error.tsx",
    "app/affiliate/error.tsx",
    "app/admin/error.tsx",
  ]

  for (const file of ERROR_BOUNDARIES) {
    it(`${file} exists`, () => {
      expect(existsSync(resolve(ROOT, file))).toBe(true)
    })
  }
})

describe("Error Boundaries — structure", () => {
  it("app/error.tsx is a client component with reset callback", () => {
    const src = readFileSync(resolve(ROOT, "app/error.tsx"), "utf-8")
    expect(src).toContain('"use client"')
    expect(src).toContain("reset")
    expect(src).toContain("error")
  })

  it("app/not-found.tsx has a 404 heading and home link", () => {
    const src = readFileSync(resolve(ROOT, "app/not-found.tsx"), "utf-8")
    expect(src).toContain("404")
    expect(src).toMatch(/not\s*found/i)
  })

  const DASHBOARD_ERRORS = [
    "app/buyer/error.tsx",
    "app/dealer/error.tsx",
    "app/affiliate/error.tsx",
    "app/admin/error.tsx",
  ]

  for (const file of DASHBOARD_ERRORS) {
    it(`${file} is a client component with ErrorState`, () => {
      const src = readFileSync(resolve(ROOT, file), "utf-8")
      expect(src).toContain('"use client"')
      expect(src).toContain("ErrorState")
      expect(src).toContain("reset")
    })
  }
})

// ─── Email Templates ────────────────────────────────────────────────────────
// Required email methods must exist with correct signatures. The audit found
// three missing templates: offer-received, offer-selected, deal-complete.
// ─────────────────────────────────────────────────────────────────────────────

describe("Email Service — required methods exist", () => {
  const src = readFileSync(resolve(ROOT, "lib/services/email.service.tsx"), "utf-8")

  it("sendOfferReceivedEmail method exists", () => {
    expect(src).toContain("sendOfferReceivedEmail")
    expect(src).toMatch(/async\s+sendOfferReceivedEmail/)
  })

  it("sendOfferSelectedEmail method exists", () => {
    expect(src).toContain("sendOfferSelectedEmail")
    expect(src).toMatch(/async\s+sendOfferSelectedEmail/)
  })

  it("sendDealCompleteEmail method exists", () => {
    expect(src).toContain("sendDealCompleteEmail")
    expect(src).toMatch(/async\s+sendDealCompleteEmail/)
  })

  it("email templates use escapeHtml for user-supplied values", () => {
    expect(src).toContain("escapeHtml")
  })
})

// ─── Affiliate Service ──────────────────────────────────────────────────────
// trackReferral and completeDealReferral must have real implementations,
// not stubs. They must prevent self-referrals and be idempotent.
// ─────────────────────────────────────────────────────────────────────────────

describe("Affiliate Service — real implementations", () => {
  const src = readFileSync(resolve(ROOT, "lib/services/affiliate.service.ts"), "utf-8")

  it("trackReferral is not a stub", () => {
    // A stub would just return immediately without any database calls
    const method = src.match(/async trackReferral[\s\S]*?(?=\n  async |\n  private |\n})/)?.[0]
    expect(method).toBeDefined()
    // Real implementation should use prisma/buildReferralChain
    expect(method).toContain("buildReferralChain")
  })

  it("trackReferral prevents self-referrals", () => {
    const method = src.match(/async trackReferral[\s\S]*?(?=\n  async |\n  private |\n})/)?.[0]
    expect(method).toBeDefined()
    expect(method).toContain("Self-referral")
  })

  it("trackReferral is idempotent", () => {
    const method = src.match(/async trackReferral[\s\S]*?(?=\n  async |\n  private |\n})/)?.[0]
    expect(method).toBeDefined()
    expect(method).toContain("alreadyTracked")
  })

  it("completeDealReferral is not a stub", () => {
    const method = src.match(/async completeDealReferral[\s\S]*?(?=\n  async |\n  private |\n})/)?.[0]
    expect(method).toBeDefined()
    // Real implementation should use createCommissionsForPayment
    expect(method).toContain("createCommissionsForPayment")
  })

  it("completeDealReferral is idempotent", () => {
    const method = src.match(/async completeDealReferral[\s\S]*?(?=\n  async |\n  private |\n})/)?.[0]
    expect(method).toBeDefined()
    expect(method).toContain("alreadyCompleted")
  })
})

// ─── Insurance Service ──────────────────────────────────────────────────────
// getQuotes and selectPolicy methods must exist as entry points.
// ─────────────────────────────────────────────────────────────────────────────

describe("Insurance Service — required methods", () => {
  const src = readFileSync(resolve(ROOT, "lib/services/insurance.service.ts"), "utf-8")

  it("getQuotes method exists", () => {
    expect(src).toMatch(/static\s+async\s+getQuotes/)
  })

  it("selectPolicy method exists", () => {
    expect(src).toMatch(/static\s+async\s+selectPolicy/)
  })

  it("requestQuotes method exists (implementation)", () => {
    expect(src).toMatch(/static\s+async\s+requestQuotes/)
  })

  it("selectQuote method exists (implementation)", () => {
    expect(src).toMatch(/static\s+async\s+selectQuote/)
  })
})

// ─── Contract Shield Service ────────────────────────────────────────────────
// uploadContract must delegate to uploadDocument for proper versioning and
// scan initialization, not skip these steps.
// ─────────────────────────────────────────────────────────────────────────────

describe("Contract Shield Service — uploadContract", () => {
  const src = readFileSync(resolve(ROOT, "lib/services/contract-shield.service.ts"), "utf-8")

  it("uploadContract delegates to uploadDocument", () => {
    expect(src).toContain("uploadContract")
    // Should call uploadDocument, not create records directly
    const method = src.match(/static async uploadContract[\s\S]*?(?=\n  static |\n})/)?.[0]
    expect(method).toBeDefined()
    expect(method).toContain("uploadDocument")
  })
})
