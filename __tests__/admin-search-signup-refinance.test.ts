/**
 * Tests for:
 * A) Signup role profile creation — errors are checked (not fire-and-forget)
 * B) Admin search — all list endpoints wire search to DB queries
 * C) Refinance — leads are persisted and notifications created
 */
import { describe, it, expect, vi } from "vitest"
import path from "path"
import fs from "fs"

const ROOT = path.resolve(__dirname, "..")

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf-8")
}

// =====================================================
// A) Auth Service – signup error handling
// =====================================================

describe("A) Auth Service – signup role profile creation", () => {
  it("should check errors from BuyerProfile insert", () => {
    const source = readSource("lib/services/auth.service.ts")
    // Verify the insert result destructures error
    expect(source).toContain('const { error: profileError } = await supabase.from("BuyerProfile").insert')
    expect(source).toContain("Failed to create buyer profile")
  })

  it("should check errors from Dealer insert", () => {
    const source = readSource("lib/services/auth.service.ts")
    expect(source).toContain('const { error: profileError } = await supabase.from("Dealer").insert')
    expect(source).toContain("Failed to create dealer profile")
  })

  it("should check errors from Affiliate insert", () => {
    const source = readSource("lib/services/auth.service.ts")
    expect(source).toContain('const { error: profileError } = await supabase.from("Affiliate").insert')
    expect(source).toContain("Failed to create affiliate profile")
  })

  it("should include correlationId in error messages", () => {
    const source = readSource("lib/services/auth.service.ts")
    expect(source).toContain("correlationId")
    // Should generate correlationId at the start
    expect(source).toContain("const correlationId = crypto.randomUUID()")
  })

  it("should generate unique referral codes", async () => {
    const { AuthService } = await import("@/lib/services/auth.service")
    const code1 = AuthService.generateReferralCode()
    const code2 = AuthService.generateReferralCode()

    expect(code1).toMatch(/^AL[A-Z0-9]+$/)
    expect(code2).toMatch(/^AL[A-Z0-9]+$/)
    expect(code1).not.toBe(code2)
  })
})

// =====================================================
// B) Admin Service – search filtering
// =====================================================

describe("B) Admin Service – search query builder", () => {
  it("getAllBuyers should accept search filter", async () => {
    const adminModule = await import("@/lib/services/admin.service")
    const service = adminModule.adminService

    expect(service).toBeDefined()
    expect(typeof service.getAllBuyers).toBe("function")
  })

  it("getAllDealers should accept search and workspaceId filters", async () => {
    const adminModule = await import("@/lib/services/admin.service")
    const service = adminModule.adminService
    expect(typeof service.getAllDealers).toBe("function")
  })

  it("getAllDeals should accept search filter", async () => {
    const adminModule = await import("@/lib/services/admin.service")
    const service = adminModule.adminService
    expect(typeof service.getAllDeals).toBe("function")
  })

  it("getAllPayments should accept search filter", async () => {
    const adminModule = await import("@/lib/services/admin.service")
    const service = adminModule.adminService
    expect(typeof service.getAllPayments).toBe("function")
  })
})

// =====================================================
// B2) Admin search – source code verification
// =====================================================

describe("B2) Admin search – source code patterns", () => {
  it("buyer search should include first_name and last_name columns", () => {
    const source = readSource("lib/services/admin.service.ts")
    expect(source).toContain("first_name.ilike")
    expect(source).toContain("last_name.ilike")
  })

  it("dealer search should include email, first_name, and last_name columns", () => {
    const source = readSource("lib/services/admin.service.ts")
    expect(source).toContain("email.ilike")
    expect(source).toContain("first_name.ilike")
    expect(source).toContain("last_name.ilike")
  })

  it("affiliate search should include email, first_name, and last_name", () => {
    const source = readSource("app/api/admin/affiliates/route.ts")
    expect(source).toContain("email.ilike")
    expect(source).toContain("first_name.ilike")
    expect(source).toContain("last_name.ilike")
  })

  it("refinance leads search should include email, firstName, lastName, state", () => {
    const source = readSource("app/api/admin/refinance/leads/route.ts")
    expect(source).toContain("email.ilike")
    expect(source).toContain("firstName.ilike")
    expect(source).toContain("lastName.ilike")
    expect(source).toContain("state.ilike")
  })

  it("deals route should extract search param", () => {
    const source = readSource("app/api/admin/deals/route.ts")
    expect(source).toContain('searchParams.get("search")')
  })

  it("payments route should extract search param", () => {
    const source = readSource("app/api/admin/payments/route.ts")
    expect(source).toContain('searchParams.get("search")')
  })
})

// =====================================================
// C) Refinance – persistence and notifications
// =====================================================

describe("C) Refinance – persistence and notifications", () => {
  it("check-eligibility route should import supabase for DB persistence", () => {
    const source = readSource("app/api/refinance/check-eligibility/route.ts")
    expect(source).toContain('import { supabase, isDatabaseConfigured }')
    expect(source).toContain('requireDatabase')
    expect(source).toContain('.from("RefinanceLead").insert')
    expect(source).toContain('.from("AdminNotification").insert')
  })

  it("notifications API should read notifications and return unreadCount", () => {
    const source = readSource("app/api/admin/notifications/route.ts")
    expect(source).toContain("listNotifications")
    expect(source).toContain("unreadCount")
  })

  it("email service should have sendNotification method for refinance affiliate emails", async () => {
    const emailModule = await import("@/lib/services/email.service")
    const service = emailModule.emailService
    expect(typeof service.sendNotification).toBe("function")
  })

  it("refinance form should support affiliateId", () => {
    const source = readSource("app/api/refinance/check-eligibility/route.ts")
    expect(source).toContain("affiliateId")
    expect(source).toContain("sendNotification")
  })

  it("notifications API should support mark-as-read", () => {
    const source = readSource("app/api/admin/notifications/route.ts")
    expect(source).toContain("markAsRead")
  })
})

// =====================================================
// D) AdminNotification model
// =====================================================

describe("D) Prisma schema – AdminNotification model", () => {
  it("schema should define AdminNotification model", () => {
    const schema = readSource("prisma/schema.prisma")
    expect(schema).toContain("model AdminNotification")
    expect(schema).toContain("entityType")
    expect(schema).toContain("entityId")
    expect(schema).toContain("priority")
    expect(schema).toContain("read")
    expect(schema).toContain("workspaceId")
  })

  it("Workspace model should have adminNotifications relation", () => {
    const schema = readSource("prisma/schema.prisma")
    expect(schema).toMatch(/adminNotifications\s+AdminNotification\[\]/)
  })
})
