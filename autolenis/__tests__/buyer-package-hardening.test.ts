/**
 * Buyer Package Hardening Tests
 *
 * Validates that the buyer package implementation adheres strictly to the
 * canonical Supabase package system — no mixed naming, no legacy fallbacks,
 * no direct billing writes, and complete wiring of all RPCs and notifications.
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

const ROOT = join(__dirname, "..")

function readFile(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf-8")
}

// ---------------------------------------------------------------------------
// 1. No mixed camelCase/snake_case fallback patterns in runtime package code
// ---------------------------------------------------------------------------

describe("Buyer Package Hardening – No Mixed Naming Fallbacks", () => {
  const RUNTIME_FILES = [
    "app/admin/buyers/[buyerId]/page.tsx",
    "app/buyer/dashboard/page.tsx",
    "lib/services/buyer.service.ts",
    "lib/services/buyer-package.service.ts",
    "app/api/buyer/upgrade/route.ts",
    "app/api/admin/buyers/[buyerId]/route.ts",
  ]

  // These patterns indicate mixed camelCase/snake_case fallback logic that
  // should NOT exist in production code consuming Supabase data
  const FORBIDDEN_FALLBACK_PATTERNS = [
    /profile\?\.\s*packageTier\s*\|\|/,
    /profile\?\.\s*packageSelectedAt\s*\|\|/,
    /profile\?\.\s*packageSelectionSource\s*\|\|/,
    /profile\?\.\s*packageUpgradedAt\s*\|\|/,
    /profile\?\.\s*depositStatus\s*\|\|/,
    /\|\|\s*profile\?\.\s*packageTier/,
    /\|\|\s*profile\?\.\s*packageSelectedAt/,
    /\|\|\s*profile\?\.\s*packageSelectionSource/,
    /\|\|\s*profile\?\.\s*packageUpgradedAt/,
    /\|\|\s*profile\?\.\s*depositStatus/,
    /profile\.packageTier(?!\s*\?\?)/,
    /profile\.packageSelectedAt(?!\s*\?\?)/,
    /profile\.packageSelectionSource(?!\s*\?\?)/,
    /profile\.packageUpgradedAt(?!\s*\?\?)/,
  ]

  for (const file of RUNTIME_FILES) {
    it(`${file} has no mixed camelCase fallback patterns`, () => {
      const src = readFile(file)
      for (const pattern of FORBIDDEN_FALLBACK_PATTERNS) {
        const match = src.match(pattern)
        expect(match).toBeNull()
      }
    })
  }
})

// ---------------------------------------------------------------------------
// 2. Admin buyer detail reads canonical billing/history/ledger tables
// ---------------------------------------------------------------------------

describe("Buyer Package Hardening – Admin Reads Canonical Tables", () => {
  it("admin buyer detail API reads from buyer_package_billing", () => {
    const src = readFile("app/api/admin/buyers/[buyerId]/route.ts")
    expect(src).toContain("buyer_package_billing")
  })

  it("admin buyer detail API reads from buyer_package_history", () => {
    const src = readFile("app/api/admin/buyers/[buyerId]/route.ts")
    expect(src).toContain("buyer_package_history")
  })

  it("admin buyer detail API reads from buyer_payment_ledger", () => {
    const src = readFile("app/api/admin/buyers/[buyerId]/route.ts")
    expect(src).toContain("buyer_payment_ledger")
  })

  it("admin buyer detail page uses only package_tier (not packageTier) for display", () => {
    const src = readFile("app/admin/buyers/[buyerId]/page.tsx")
    // Ensure no camelCase DB field reads
    expect(src).not.toMatch(/profile\?\.\s*packageTier/)
    // Ensure canonical snake_case is used
    expect(src).toContain("package_tier")
  })

  it("admin buyer detail page uses canonical package_selected_at", () => {
    const src = readFile("app/admin/buyers/[buyerId]/page.tsx")
    expect(src).not.toMatch(/profile\?\.\s*packageSelectedAt/)
    expect(src).toContain("package_selected_at")
  })

  it("admin buyer detail page uses canonical package_upgraded_at", () => {
    const src = readFile("app/admin/buyers/[buyerId]/page.tsx")
    expect(src).not.toMatch(/profile\?\.\s*packageUpgradedAt/)
    expect(src).toContain("package_upgraded_at")
  })

  it("admin buyer detail page does not have legacy profile deposit fallback", () => {
    const src = readFile("app/admin/buyers/[buyerId]/page.tsx")
    // Should NOT contain depositStatus camelCase pattern for profile reads
    expect(src).not.toMatch(/profile\?\.\s*depositStatus/)
    expect(src).not.toMatch(/profile\.depositStatus/)
  })
})

// ---------------------------------------------------------------------------
// 3. Buyer dashboard reads canonical billing state
// ---------------------------------------------------------------------------

describe("Buyer Package Hardening – Dashboard Reads Canonical Billing", () => {
  it("buyer service reads buyer_package_billing (canonical table)", () => {
    const src = readFile("lib/services/buyer.service.ts")
    expect(src).toContain("buyer_package_billing")
  })

  it("buyer service does not describe billing read as best-effort", () => {
    const src = readFile("lib/services/buyer.service.ts")
    expect(src).not.toMatch(/best-effort/)
    expect(src).not.toMatch(/may not exist/)
  })

  it("buyer dashboard uses package_tier (canonical)", () => {
    const src = readFile("app/buyer/dashboard/page.tsx")
    expect(src).toContain("package_tier")
  })

  it("buyer dashboard uses billing.deposit_status (canonical)", () => {
    const src = readFile("app/buyer/dashboard/page.tsx")
    expect(src).toContain("deposit_status")
  })

  it("buyer dashboard uses billing.premium_fee_remaining_cents (canonical)", () => {
    const src = readFile("app/buyer/dashboard/page.tsx")
    expect(src).toContain("premium_fee_remaining_cents")
  })
})

// ---------------------------------------------------------------------------
// 4. Upgrade route triggers notifications
// ---------------------------------------------------------------------------

describe("Buyer Package Hardening – Upgrade Notifications", () => {
  it("upgrade route imports sendUpgradeConfirmationEmail", () => {
    const src = readFile("app/api/buyer/upgrade/route.ts")
    expect(src).toContain("sendUpgradeConfirmationEmail")
  })

  it("upgrade route imports sendPremiumSpecialistNotification", () => {
    const src = readFile("app/api/buyer/upgrade/route.ts")
    expect(src).toContain("sendPremiumSpecialistNotification")
  })

  it("upgrade route calls both notification functions", () => {
    const src = readFile("app/api/buyer/upgrade/route.ts")
    // Both should appear in the function body, not just imports
    const importEnd = src.indexOf("export")
    const body = src.slice(importEnd)
    expect(body).toContain("sendUpgradeConfirmationEmail")
    expect(body).toContain("sendPremiumSpecialistNotification")
  })

  it("upgrade route uses DASHBOARD_UPGRADE as source for specialist notification", () => {
    const src = readFile("app/api/buyer/upgrade/route.ts")
    expect(src).toContain('"DASHBOARD_UPGRADE"')
  })
})

// ---------------------------------------------------------------------------
// 5. Premium fee payment wired to canonical RPC
// ---------------------------------------------------------------------------

describe("Buyer Package Hardening – Premium Fee Payment Wired", () => {
  it("Stripe webhook imports recordPremiumFeePayment", () => {
    const src = readFile("app/api/webhooks/stripe/route.ts")
    expect(src).toContain("recordPremiumFeePayment")
  })

  it("Stripe webhook calls recordPremiumFeePayment in service_fee success path", () => {
    const src = readFile("app/api/webhooks/stripe/route.ts")
    // Find the service_fee section and check it contains the RPC call
    const serviceFeeIdx = src.indexOf('type === "service_fee"')
    expect(serviceFeeIdx).toBeGreaterThan(-1)
    const afterServiceFee = src.slice(serviceFeeIdx)
    expect(afterServiceFee).toContain("recordPremiumFeePayment")
  })

  it("recordPremiumFeePayment call uses external payment id for idempotency", () => {
    const src = readFile("app/api/webhooks/stripe/route.ts")
    // Find the actual function call (not the import), look for payment_intent nearby
    const importEnd = src.indexOf("export")
    const body = src.slice(importEnd)
    const rpcCallIdx = body.indexOf("recordPremiumFeePayment")
    expect(rpcCallIdx).toBeGreaterThan(-1)
    const callContext = body.slice(rpcCallIdx, rpcCallIdx + 300)
    expect(callContext).toContain("payment_intent")
  })
})

// ---------------------------------------------------------------------------
// 6. All billing writes go through RPCs (no direct writes)
// ---------------------------------------------------------------------------

describe("Buyer Package Hardening – No Direct Billing Writes", () => {
  it("buyer-package service uses only supabase.rpc() for mutations", () => {
    const src = readFile("lib/services/buyer-package.service.ts")
    // All mutation functions should use .rpc()
    expect(src).toContain(".rpc(\"initialize_buyer_package_registration\"")
    expect(src).toContain(".rpc(\"upgrade_buyer_to_premium\"")
    expect(src).toContain(".rpc(\"mark_buyer_deposit_paid\"")
    expect(src).toContain(".rpc(\"mark_buyer_deposit_failed\"")
    expect(src).toContain(".rpc(\"mark_buyer_deposit_refunded\"")
    expect(src).toContain(".rpc(\"record_premium_fee_payment\"")
    // Should NOT contain direct .insert() or .update() on billing tables
    expect(src).not.toMatch(/\.from\(\s*["']buyer_package_billing["']\s*\)\s*\.\s*(insert|update|upsert)/)
  })

  it("auth service calls initializeBuyerPackage RPC (not direct writes)", () => {
    const src = readFile("lib/services/auth.service.ts")
    expect(src).toContain("initializeBuyerPackage")
  })

  it("upgrade route calls upgradeBuyerToPremium RPC (not direct writes)", () => {
    const src = readFile("app/api/buyer/upgrade/route.ts")
    expect(src).toContain("upgradeBuyerToPremium")
    // Should NOT directly write to BuyerProfile package fields
    expect(src).not.toMatch(/\.update\(\s*\{[^}]*package_tier/)
  })
})

// ---------------------------------------------------------------------------
// 7. Auth service registration flow still works correctly
// ---------------------------------------------------------------------------

describe("Buyer Package Hardening – Registration Flow Intact", () => {
  it("auth service imports initializeBuyerPackage from service", () => {
    const src = readFile("lib/services/auth.service.ts")
    expect(src).toContain('import { initializeBuyerPackage }')
  })

  it("auth service validates packageTier before profile creation", () => {
    const src = readFile("lib/services/auth.service.ts")
    expect(src).toContain("STANDARD")
    expect(src).toContain("PREMIUM")
  })

  it("auth service creates BuyerProfile before calling initializeBuyerPackage RPC", () => {
    const src = readFile("lib/services/auth.service.ts")
    // The import is at the top; what matters is that in the function body,
    // the BuyerProfile.insert() comes before the initializeBuyerPackage() call
    const signUpBody = src.slice(src.indexOf("static async signUp"))
    const profileInsertIdx = signUpBody.indexOf('from("BuyerProfile").insert')
    const rpcCallIdx = signUpBody.indexOf("initializeBuyerPackage(")
    expect(profileInsertIdx).toBeGreaterThan(-1)
    expect(rpcCallIdx).toBeGreaterThan(profileInsertIdx)
  })
})

// ---------------------------------------------------------------------------
// 8. Deposit lifecycle RPCs are wired in Stripe webhook
// ---------------------------------------------------------------------------

describe("Buyer Package Hardening – Deposit Lifecycle Wired", () => {
  it("Stripe webhook calls markDepositPaid on deposit success", () => {
    const src = readFile("app/api/webhooks/stripe/route.ts")
    expect(src).toContain("markDepositPaid")
  })

  it("Stripe webhook calls markDepositFailed on deposit failure", () => {
    const src = readFile("app/api/webhooks/stripe/route.ts")
    expect(src).toContain("markDepositFailed")
  })

  it("Stripe webhook calls markDepositRefunded on deposit refund", () => {
    const src = readFile("app/api/webhooks/stripe/route.ts")
    expect(src).toContain("markDepositRefunded")
  })
})
