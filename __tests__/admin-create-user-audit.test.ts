/**
 * Audit tests for admin create user, search, and list endpoints.
 * Validates:
 * - Admin user creation route always returns JSON
 * - Admin user creation triggers onUserCreated emails
 * - Buyer/affiliate admin list queries use User table with LEFT JOINs (show incomplete profiles)
 * - Affiliate search uses committed search, not per-keystroke
 * - Workspace scoping is applied to buyer and dealer list queries
 */
import { describe, it, expect } from "vitest"
import path from "path"
import fs from "fs"

const ROOT = path.resolve(__dirname, "..")

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf-8")
}

// =====================================================
// A) Admin user creation – always returns JSON
// =====================================================

describe("A) Admin create user route – JSON responses", () => {
  it("should import onUserCreated from email triggers", () => {
    const source = readSource("app/api/admin/users/route.ts")
    expect(source).toContain('import { onUserCreated } from "@/lib/email/triggers"')
  })

  it("should call onUserCreated after successful creation", () => {
    const source = readSource("app/api/admin/users/route.ts")
    expect(source).toContain("onUserCreated({")
    expect(source).toContain("userId: result.user.id")
    expect(source).toContain("email: result.user.email")
  })

  it("should return JSON for all error paths (401, 400, catch)", () => {
    const source = readSource("app/api/admin/users/route.ts")
    // Every return should be NextResponse.json(...)
    const returnStatements = source.match(/return NextResponse\.json\(/g) || []
    // Should have at least: unauthorized, missing fields, invalid role, test workspace, success, catch error
    expect(returnStatements.length).toBeGreaterThanOrEqual(5)
    // Should NOT have any plain NextResponse without json
    expect(source).not.toContain("new NextResponse(null")
    expect(source).not.toContain("NextResponse.redirect")
  })

  it("frontend create buyer should safely parse JSON errors with .catch() fallback", () => {
    const source = readSource("app/admin/buyers/create/page.tsx")
    expect(source).toContain(".json().catch(() =>")
  })

  it("frontend create affiliate should safely parse JSON errors with .catch() fallback", () => {
    const source = readSource("app/admin/affiliates/create/page.tsx")
    expect(source).toContain(".json().catch(() =>")
  })
})

// =====================================================
// B) Buyers list – queries User table with LEFT JOINs
// =====================================================

describe("B) Admin buyer list – shows all users", () => {
  it("getAllBuyers should query User table, not BuyerProfile", () => {
    const source = readSource("lib/services/admin.service.ts")
    // Should query from User table with eq role BUYER
    expect(source).toContain('.from("User")')
    expect(source).toContain('.eq("role", "BUYER")')
    // Should include BuyerProfile as a join (not the primary table)
    expect(source).toContain("BuyerProfile(id, firstName, lastName, phone)")
  })

  it("getAllBuyers should use profileComplete flag to indicate incomplete profiles", () => {
    const source = readSource("lib/services/admin.service.ts")
    expect(source).toContain("profileComplete: !!u.BuyerProfile")
  })

  it("getAllBuyers should accept workspaceId filter", () => {
    const source = readSource("lib/services/admin.service.ts")
    // After the getAllBuyers method signature, there should be workspace filtering
    const buyerSection = source.slice(source.indexOf("async getAllBuyers"), source.indexOf("async getBuyerDetail"))
    expect(buyerSection).toContain("workspaceId")
    expect(buyerSection).toContain('.eq("workspaceId"')
  })

  it("buyers API route should pass workspace_id to getAllBuyers", () => {
    const source = readSource("app/api/admin/buyers/route.ts")
    expect(source).toContain("workspaceId: wsId")
  })

  it("buyers page should display profileComplete badge for incomplete profiles", () => {
    const source = readSource("app/admin/buyers/page.tsx")
    expect(source).toContain("profileComplete === false")
    expect(source).toContain("Profile Incomplete")
  })
})

// =====================================================
// C) Affiliates list – queries User table
// =====================================================

describe("C) Admin affiliates list – shows all users", () => {
  it("should query User table with role AFFILIATE", () => {
    const source = readSource("app/api/admin/affiliates/route.ts")
    expect(source).toContain('.from("User")')
    expect(source).toContain('.eq("role", "AFFILIATE")')
  })

  it("should include profileComplete flag in response", () => {
    const source = readSource("app/api/admin/affiliates/route.ts")
    expect(source).toContain("profileComplete: hasProfile")
  })

  it("should use committed search, not per-keystroke", () => {
    const source = readSource("app/admin/affiliates/page.tsx")
    // Should have a committedSearch state separate from searchTerm
    expect(source).toContain("committedSearch")
    expect(source).toContain("setCommittedSearch")
    // The fetch callback should depend on committedSearch, not searchTerm
    expect(source).toContain("if (committedSearch) params.append")
  })
})

// =====================================================
// D) Global search – searches User table for buyers/affiliates
// =====================================================

describe("D) Global admin search – includes email search", () => {
  it("buyer search should query User table with BuyerProfile join", () => {
    const source = readSource("app/api/admin/search/route.ts")
    // Should search User table for buyers, not BuyerProfile directly
    expect(source).toContain('.eq("role", "BUYER")')
    expect(source).toContain("email.ilike")
  })

  it("affiliate search should query User table with Affiliate join", () => {
    const source = readSource("app/api/admin/search/route.ts")
    expect(source).toContain('.eq("role", "AFFILIATE")')
    // Should search by email
    expect(source).toContain("email.ilike")
  })
})

// =====================================================
// E) Notification schema
// =====================================================

describe("E) Refinance notification – correct schema columns", () => {
  it("should use correct AdminNotification columns for refinance", () => {
    const source = readSource("app/api/refinance/check-eligibility/route.ts")
    expect(source).toContain('.from("AdminNotification").insert')
    // Should use P1 priority (enum value), not "high"
    expect(source).toContain('priority: "P1"')
    // Should use isRead, not "read"
    expect(source).toContain("isRead: false")
    // Should use ctaPath, not "link"
    expect(source).toContain("ctaPath:")
    // Should include required workspaceId
    expect(source).toContain("workspaceId:")
    // Should include category
    expect(source).toContain('category: "USER"')
  })
})
