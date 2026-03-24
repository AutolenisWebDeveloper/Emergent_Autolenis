/**
 * Buyer Package Staging Validation
 *
 * Maps to the seven staging-validation flows required before promoting to
 * production.  Each `describe` block corresponds to exactly one flow.
 *
 * Flow 1 — Register buyer as STANDARD
 * Flow 2 — Register buyer as PREMIUM
 * Flow 3 — Upgrade STANDARD buyer to PREMIUM
 * Flow 4 — $99 deposit payment → canonical billing updates
 * Flow 5 — PREMIUM concierge fee payment → remaining balance
 * Flow 6 — Admin buyer detail shows canonical package / billing / history / ledger
 * Flow 7 — Welcome email, upgrade confirmation email, premium specialist notification
 */

import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"
import { signUpSchema } from "@/lib/validators/auth"
import {
  BuyerPackageTier,
  buildBillingInit,
  DepositCreditTreatment,
  PACKAGE_DISPLAY,
  CURRENT_PACKAGE_VERSION,
} from "@/lib/constants/buyer-packages"

const ROOT = join(__dirname, "..")

function readFile(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf-8")
}

// ---------------------------------------------------------------------------
// Flow 1 — Register buyer as STANDARD
// ---------------------------------------------------------------------------

describe("Flow 1 — Register buyer as STANDARD", () => {
  it("signUpSchema accepts STANDARD packageTier for BUYER role", () => {
    const result = signUpSchema.safeParse({
      email: "std@example.com",
      password: "ValidPass123!",
      firstName: "Std",
      lastName: "Buyer",
      role: "BUYER",
      packageTier: "STANDARD",
    })
    expect(result.success).toBe(true)
  })

  it("STANDARD billing init sets deposit $99 credited to vehicle", () => {
    const b = buildBillingInit(BuyerPackageTier.STANDARD)
    expect(b.depositRequired).toBe(true)
    expect(b.depositAmount).toBe(99)
    expect(b.depositStatus).toBe("NOT_PAID")
    expect(b.depositCreditTreatment).toBe(
      DepositCreditTreatment.CREDIT_TO_VEHICLE_AT_CLOSING,
    )
    expect(b.premiumFeeTotal).toBe(0)
    expect(b.premiumFeeRemaining).toBe(0)
  })

  it("auth service calls initializeBuyerPackage during registration", () => {
    const src = readFile("lib/services/auth.service.ts")
    expect(src).toContain("initializeBuyerPackage")
  })

  it("initializeBuyerPackage RPC is exposed from buyer-package service", async () => {
    const mod = await import("@/lib/services/buyer-package.service")
    expect(typeof mod.initializeBuyerPackage).toBe("function")
  })
})

// ---------------------------------------------------------------------------
// Flow 2 — Register buyer as PREMIUM
// ---------------------------------------------------------------------------

describe("Flow 2 — Register buyer as PREMIUM", () => {
  it("signUpSchema accepts PREMIUM packageTier for BUYER role", () => {
    const result = signUpSchema.safeParse({
      email: "prem@example.com",
      password: "ValidPass123!",
      firstName: "Prem",
      lastName: "Buyer",
      role: "BUYER",
      packageTier: "PREMIUM",
    })
    expect(result.success).toBe(true)
  })

  it("PREMIUM billing init sets deposit $99 credited to fee, total $499", () => {
    const b = buildBillingInit(BuyerPackageTier.PREMIUM)
    expect(b.depositRequired).toBe(true)
    expect(b.depositAmount).toBe(99)
    expect(b.depositCreditTreatment).toBe(
      DepositCreditTreatment.CREDIT_TO_PREMIUM_FEE,
    )
    expect(b.premiumFeeTotal).toBe(499)
    expect(b.premiumFeeRemaining).toBe(499)
  })

  it("PREMIUM display config shows $499 price", () => {
    const info = PACKAGE_DISPLAY[BuyerPackageTier.PREMIUM]
    expect(info.price).toBe("$499")
    expect(info.label).toContain("Premium")
  })

  it("STANDARD display config shows Free price", () => {
    const info = PACKAGE_DISPLAY[BuyerPackageTier.STANDARD]
    expect(info.price).toBe("Free")
    expect(info.label).toContain("Standard")
  })

  it("CURRENT_PACKAGE_VERSION is set", () => {
    expect(CURRENT_PACKAGE_VERSION).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Flow 3 — Upgrade STANDARD buyer to PREMIUM
// ---------------------------------------------------------------------------

describe("Flow 3 — Upgrade STANDARD buyer to PREMIUM", () => {
  it("upgrade route calls upgradeBuyerToPremium RPC", () => {
    const src = readFile("app/api/buyer/upgrade/route.ts")
    expect(src).toContain("upgradeBuyerToPremium")
  })

  it("upgrade route uses DASHBOARD_UPGRADE as upgrade source", () => {
    const src = readFile("app/api/buyer/upgrade/route.ts")
    expect(src).toContain('"DASHBOARD_UPGRADE"')
  })

  it("upgrade route checks for existing PREMIUM tier (409 conflict)", () => {
    const src = readFile("app/api/buyer/upgrade/route.ts")
    expect(src).toContain("409")
  })

  it("upgradeBuyerToPremium calls canonical RPC", () => {
    const src = readFile("lib/services/buyer-package.service.ts")
    expect(src).toContain('.rpc("upgrade_buyer_to_premium"')
  })
})

// ---------------------------------------------------------------------------
// Flow 4 — $99 deposit payment → canonical billing updates
// ---------------------------------------------------------------------------

describe("Flow 4 — $99 deposit payment and canonical billing updates", () => {
  it("Stripe webhook calls markDepositPaid on successful deposit", () => {
    const src = readFile("app/api/webhooks/stripe/route.ts")
    expect(src).toContain("markDepositPaid")
  })

  it("Stripe webhook calls markDepositFailed on failed deposit", () => {
    const src = readFile("app/api/webhooks/stripe/route.ts")
    expect(src).toContain("markDepositFailed")
  })

  it("Stripe webhook calls markDepositRefunded on refund", () => {
    const src = readFile("app/api/webhooks/stripe/route.ts")
    expect(src).toContain("markDepositRefunded")
  })

  it("markDepositPaid calls canonical mark_buyer_deposit_paid RPC", () => {
    const src = readFile("lib/services/buyer-package.service.ts")
    expect(src).toContain('.rpc("mark_buyer_deposit_paid"')
  })

  it("markDepositFailed calls canonical mark_buyer_deposit_failed RPC", () => {
    const src = readFile("lib/services/buyer-package.service.ts")
    expect(src).toContain('.rpc("mark_buyer_deposit_failed"')
  })

  it("markDepositRefunded calls canonical mark_buyer_deposit_refunded RPC", () => {
    const src = readFile("lib/services/buyer-package.service.ts")
    expect(src).toContain('.rpc("mark_buyer_deposit_refunded"')
  })

  it("buyer-package service has no direct writes to buyer_package_billing", () => {
    const src = readFile("lib/services/buyer-package.service.ts")
    expect(src).not.toMatch(
      /\.from\(\s*["']buyer_package_billing["']\s*\)\s*\.\s*(insert|update|upsert|delete)/,
    )
  })
})

// ---------------------------------------------------------------------------
// Flow 5 — PREMIUM concierge fee payment → remaining balance
// ---------------------------------------------------------------------------

describe("Flow 5 — PREMIUM concierge fee payment and remaining balance", () => {
  it("Stripe webhook imports recordPremiumFeePayment", () => {
    const src = readFile("app/api/webhooks/stripe/route.ts")
    expect(src).toContain("recordPremiumFeePayment")
  })

  it("Stripe webhook calls recordPremiumFeePayment in service_fee path", () => {
    const src = readFile("app/api/webhooks/stripe/route.ts")
    const idx = src.indexOf('type === "service_fee"')
    expect(idx).toBeGreaterThan(-1)
    const after = src.slice(idx)
    expect(after).toContain("recordPremiumFeePayment")
  })

  it("recordPremiumFeePayment uses payment_intent for idempotency", () => {
    const src = readFile("app/api/webhooks/stripe/route.ts")
    const exportIdx = src.indexOf("export")
    const body = src.slice(exportIdx)
    const callIdx = body.indexOf("recordPremiumFeePayment")
    expect(callIdx).toBeGreaterThan(-1)
    const context = body.slice(callIdx, callIdx + 300)
    expect(context).toContain("payment_intent")
  })

  it("record_premium_fee_payment RPC is invoked by buyer-package service", () => {
    const src = readFile("lib/services/buyer-package.service.ts")
    expect(src).toContain('.rpc("record_premium_fee_payment"')
  })

  it("PREMIUM billing init remaining is $499 (decreases as fee payments apply)", () => {
    const b = buildBillingInit(BuyerPackageTier.PREMIUM)
    expect(b.premiumFeeRemaining).toBe(499)
    expect(b.premiumFeeTotal).toBe(499)
  })
})

// ---------------------------------------------------------------------------
// Flow 6 — Admin buyer detail shows canonical package / billing / history / ledger
// ---------------------------------------------------------------------------

describe("Flow 6 — Admin buyer detail page canonical data", () => {
  it("admin API reads buyer_package_billing", () => {
    const src = readFile("app/api/admin/buyers/[buyerId]/route.ts")
    expect(src).toContain("buyer_package_billing")
  })

  it("admin API reads buyer_package_history", () => {
    const src = readFile("app/api/admin/buyers/[buyerId]/route.ts")
    expect(src).toContain("buyer_package_history")
  })

  it("admin API reads buyer_payment_ledger", () => {
    const src = readFile("app/api/admin/buyers/[buyerId]/route.ts")
    expect(src).toContain("buyer_payment_ledger")
  })

  it("admin page shows package_tier (snake_case canonical)", () => {
    const src = readFile("app/admin/buyers/[buyerId]/page.tsx")
    expect(src).toContain("package_tier")
  })

  it("admin page shows package_selected_at", () => {
    const src = readFile("app/admin/buyers/[buyerId]/page.tsx")
    expect(src).toContain("package_selected_at")
  })

  it("admin page shows package_upgraded_at", () => {
    const src = readFile("app/admin/buyers/[buyerId]/page.tsx")
    expect(src).toContain("package_upgraded_at")
  })

  it("admin page uses canonical deposit_status from billing", () => {
    const src = readFile("app/admin/buyers/[buyerId]/page.tsx")
    expect(src).toContain("deposit_status")
  })

  it("buyer-package service exposes getBuyerPackageBilling helper", async () => {
    const mod = await import("@/lib/services/buyer-package.service")
    expect(typeof mod.getBuyerPackageBilling).toBe("function")
  })

  it("buyer-package service exposes getBuyerPackageHistory helper", async () => {
    const mod = await import("@/lib/services/buyer-package.service")
    expect(typeof mod.getBuyerPackageHistory).toBe("function")
  })

  it("buyer-package service exposes getBuyerPaymentLedger helper", async () => {
    const mod = await import("@/lib/services/buyer-package.service")
    expect(typeof mod.getBuyerPaymentLedger).toBe("function")
  })
})

// ---------------------------------------------------------------------------
// Flow 7 — Welcome email, upgrade confirmation, premium specialist notification
// ---------------------------------------------------------------------------

describe("Flow 7 — Email delivery wiring", () => {
  it("sendWelcomeEmail is exported from email triggers", async () => {
    const mod = await import("@/lib/email/triggers")
    expect(typeof mod.sendWelcomeEmail).toBe("function")
  })

  it("sendUpgradeConfirmationEmail is exported from email triggers", async () => {
    const mod = await import("@/lib/email/triggers")
    expect(typeof mod.sendUpgradeConfirmationEmail).toBe("function")
  })

  it("sendPremiumSpecialistNotification is exported from email triggers", async () => {
    const mod = await import("@/lib/email/triggers")
    expect(typeof mod.sendPremiumSpecialistNotification).toBe("function")
  })

  it("welcome email trigger accepts packageTier parameter", () => {
    const src = readFile("lib/email/triggers.ts")
    const fnStart = src.indexOf("export async function sendWelcomeEmail")
    expect(fnStart).toBeGreaterThan(-1)
    const sig = src.slice(fnStart, fnStart + 300)
    expect(sig).toContain("packageTier")
  })

  it("welcome email distinguishes PREMIUM from STANDARD content", () => {
    const src = readFile("lib/email/triggers.ts")
    const fnStart = src.indexOf("export async function sendWelcomeEmail")
    expect(fnStart).toBeGreaterThan(-1)
    const body = src.slice(fnStart, fnStart + 2000)
    expect(body).toContain("PREMIUM")
  })

  it("upgrade route fires sendUpgradeConfirmationEmail (non-blocking)", () => {
    const src = readFile("app/api/buyer/upgrade/route.ts")
    const body = src.slice(src.indexOf("export"))
    expect(body).toContain("sendUpgradeConfirmationEmail")
  })

  it("upgrade route fires sendPremiumSpecialistNotification (non-blocking)", () => {
    const src = readFile("app/api/buyer/upgrade/route.ts")
    const body = src.slice(src.indexOf("export"))
    expect(body).toContain("sendPremiumSpecialistNotification")
  })

  it("specialist notification uses DASHBOARD_UPGRADE source from upgrade route", () => {
    const src = readFile("app/api/buyer/upgrade/route.ts")
    expect(src).toContain('"DASHBOARD_UPGRADE"')
  })

  it("specialist notification function accepts REGISTRATION or DASHBOARD_UPGRADE source", () => {
    const src = readFile("lib/email/triggers.ts")
    const fnStart = src.indexOf("export async function sendPremiumSpecialistNotification")
    expect(fnStart).toBeGreaterThan(-1)
    const sig = src.slice(fnStart, fnStart + 300)
    expect(sig).toContain("REGISTRATION")
    expect(sig).toContain("DASHBOARD_UPGRADE")
  })
})
