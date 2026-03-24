import { describe, it, expect, vi, beforeAll } from "vitest"
import { signUpSchema } from "@/lib/validators/auth"
import {
  BuyerPackageTier,
  buildBillingInit,
  DepositCreditTreatment,
  PACKAGE_DISPLAY,
  CURRENT_PACKAGE_VERSION,
} from "@/lib/constants/buyer-packages"

// ---------------------------------------------------------------------------
// Signup schema validation
// ---------------------------------------------------------------------------

describe("Buyer Package Registration – Validation", () => {
  it("should accept buyer signup with STANDARD packageTier", () => {
    const result = signUpSchema.safeParse({
      email: "buyer@example.com",
      password: "ValidPass123!",
      firstName: "Jane",
      lastName: "Doe",
      role: "BUYER",
      packageTier: "STANDARD",
    })
    expect(result.success).toBe(true)
  })

  it("should accept buyer signup with PREMIUM packageTier", () => {
    const result = signUpSchema.safeParse({
      email: "buyer@example.com",
      password: "ValidPass123!",
      firstName: "Jane",
      lastName: "Doe",
      role: "BUYER",
      packageTier: "PREMIUM",
    })
    expect(result.success).toBe(true)
  })

  it("should reject buyer signup when packageTier is missing", () => {
    const result = signUpSchema.safeParse({
      email: "buyer@example.com",
      password: "ValidPass123!",
      firstName: "Jane",
      lastName: "Doe",
      role: "BUYER",
    })
    expect(result.success).toBe(false)
  })

  it("should reject buyer signup when packageTier is null", () => {
    const result = signUpSchema.safeParse({
      email: "buyer@example.com",
      password: "ValidPass123!",
      firstName: "Jane",
      lastName: "Doe",
      role: "BUYER",
      packageTier: null,
    })
    expect(result.success).toBe(false)
  })

  it("should reject buyer signup with invalid packageTier", () => {
    const result = signUpSchema.safeParse({
      email: "buyer@example.com",
      password: "ValidPass123!",
      firstName: "Jane",
      lastName: "Doe",
      role: "BUYER",
      packageTier: "GOLD",
    })
    expect(result.success).toBe(false)
  })

  it("should accept DEALER signup without packageTier", () => {
    const result = signUpSchema.safeParse({
      email: "dealer@example.com",
      password: "ValidPass123!",
      firstName: "John",
      lastName: "Smith",
      role: "DEALER",
    })
    expect(result.success).toBe(true)
  })

  it("should accept AFFILIATE signup without packageTier", () => {
    const result = signUpSchema.safeParse({
      email: "affiliate@example.com",
      password: "ValidPass123!",
      firstName: "Alex",
      lastName: "Brown",
      role: "AFFILIATE",
    })
    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Billing initialization (constants layer — still valid for display helpers)
// ---------------------------------------------------------------------------

describe("Buyer Package Registration – Billing Initialization", () => {
  it("STANDARD billing state initializes correctly", () => {
    const billing = buildBillingInit(BuyerPackageTier.STANDARD)

    expect(billing.depositRequired).toBe(true)
    expect(billing.depositAmount).toBe(99)
    expect(billing.depositStatus).toBe("NOT_PAID")
    expect(billing.depositCreditTreatment).toBe(DepositCreditTreatment.CREDIT_TO_VEHICLE_AT_CLOSING)
    expect(billing.premiumFeeTotal).toBe(0)
    expect(billing.premiumFeeRemaining).toBe(0)
  })

  it("PREMIUM billing state initializes correctly", () => {
    const billing = buildBillingInit(BuyerPackageTier.PREMIUM)

    expect(billing.depositRequired).toBe(true)
    expect(billing.depositAmount).toBe(99)
    expect(billing.depositStatus).toBe("NOT_PAID")
    expect(billing.depositCreditTreatment).toBe(DepositCreditTreatment.CREDIT_TO_PREMIUM_FEE)
    expect(billing.premiumFeeTotal).toBe(499)
    expect(billing.premiumFeeRemaining).toBe(499)
  })
})

// ---------------------------------------------------------------------------
// Package display metadata
// ---------------------------------------------------------------------------

describe("Buyer Package Registration – Display Config", () => {
  it("STANDARD display shows correct label and CTA", () => {
    const info = PACKAGE_DISPLAY[BuyerPackageTier.STANDARD]
    expect(info.label).toContain("Standard")
    expect(info.cta).toBe("Create Free Account")
    expect(info.price).toBe("Free")
    expect(info.features.length).toBeGreaterThanOrEqual(3)
  })

  it("PREMIUM display shows correct label and CTA", () => {
    const info = PACKAGE_DISPLAY[BuyerPackageTier.PREMIUM]
    expect(info.label).toContain("Premium")
    expect(info.cta).toBe("Create Premium Account")
    expect(info.price).toBe("$499")
    expect(info.features.length).toBeGreaterThanOrEqual(5)
  })

  it("current package version is defined", () => {
    expect(CURRENT_PACKAGE_VERSION).toBeTruthy()
    expect(typeof CURRENT_PACKAGE_VERSION).toBe("string")
  })
})

// ---------------------------------------------------------------------------
// API integration via fetch mock (mirrors existing auth.test.ts pattern)
// ---------------------------------------------------------------------------

describe("Buyer Package Registration – API Integration", () => {
  beforeAll(() => {
    global.fetch = (async (input: any, init: any) => {
      const url = typeof input === "string" ? input : input.toString()
      const parseBody = () => {
        try {
          return init?.body ? JSON.parse(init.body.toString()) : {}
        } catch {
          return {}
        }
      }

      if (url.endsWith("/api/auth/signup")) {
        const body = parseBody()
        const parsed = signUpSchema.safeParse(body)
        if (!parsed.success) {
          return new Response(JSON.stringify({ success: false, error: "Invalid request" }), { status: 400 })
        }
        return new Response(JSON.stringify({ success: true }), { status: 201 })
      }

      // Upgrade endpoint mock
      if (url.endsWith("/api/buyer/upgrade")) {
        const body = parseBody()
        // Simulate upgrade — in real code the RPC is called
        return new Response(JSON.stringify({ success: true, message: "Upgraded to Premium" }), { status: 200 })
      }

      return new Response("Not Found", { status: 404 })
    }) as any
  })

  it("should accept buyer signup as STANDARD", async () => {
    const response = await fetch("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "standard@example.com",
        password: "ValidPass123!",
        firstName: "Standard",
        lastName: "Buyer",
        role: "BUYER",
        packageTier: "STANDARD",
      }),
    })
    expect(response.status).toBe(201)
  })

  it("should accept buyer signup as PREMIUM", async () => {
    const response = await fetch("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "premium@example.com",
        password: "ValidPass123!",
        firstName: "Premium",
        lastName: "Buyer",
        role: "BUYER",
        packageTier: "PREMIUM",
      }),
    })
    expect(response.status).toBe(201)
  })

  it("should reject buyer signup without packageTier", async () => {
    const response = await fetch("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nopackage@example.com",
        password: "ValidPass123!",
        firstName: "No",
        lastName: "Package",
        role: "BUYER",
      }),
    })
    expect(response.status).toBe(400)
  })

  it("should reject buyer signup with invalid packageTier", async () => {
    const response = await fetch("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "invalid@example.com",
        password: "ValidPass123!",
        firstName: "Invalid",
        lastName: "Tier",
        role: "BUYER",
        packageTier: "ULTRA",
      }),
    })
    expect(response.status).toBe(400)
  })

  it("should accept dealer signup without packageTier (non-buyer)", async () => {
    const response = await fetch("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dealer@example.com",
        password: "ValidPass123!",
        firstName: "Dealer",
        lastName: "User",
        role: "DEALER",
      }),
    })
    expect(response.status).toBe(201)
  })

  it("should accept upgrade from STANDARD to PREMIUM", async () => {
    const response = await fetch("http://localhost:3000/api/buyer/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// RPC Service layer (module structure tests)
// ---------------------------------------------------------------------------

describe("Buyer Package Service – Module Structure", () => {
  it("exports initializeBuyerPackage function", async () => {
    const mod = await import("@/lib/services/buyer-package.service")
    expect(typeof mod.initializeBuyerPackage).toBe("function")
  })

  it("exports upgradeBuyerToPremium function", async () => {
    const mod = await import("@/lib/services/buyer-package.service")
    expect(typeof mod.upgradeBuyerToPremium).toBe("function")
  })

  it("exports markDepositPaid function", async () => {
    const mod = await import("@/lib/services/buyer-package.service")
    expect(typeof mod.markDepositPaid).toBe("function")
  })

  it("exports markDepositFailed function", async () => {
    const mod = await import("@/lib/services/buyer-package.service")
    expect(typeof mod.markDepositFailed).toBe("function")
  })

  it("exports markDepositRefunded function", async () => {
    const mod = await import("@/lib/services/buyer-package.service")
    expect(typeof mod.markDepositRefunded).toBe("function")
  })

  it("exports recordPremiumFeePayment function", async () => {
    const mod = await import("@/lib/services/buyer-package.service")
    expect(typeof mod.recordPremiumFeePayment).toBe("function")
  })

  it("exports getBuyerPackageBilling read helper", async () => {
    const mod = await import("@/lib/services/buyer-package.service")
    expect(typeof mod.getBuyerPackageBilling).toBe("function")
  })

  it("exports getBuyerPackageHistory read helper", async () => {
    const mod = await import("@/lib/services/buyer-package.service")
    expect(typeof mod.getBuyerPackageHistory).toBe("function")
  })

  it("exports getBuyerPaymentLedger read helper", async () => {
    const mod = await import("@/lib/services/buyer-package.service")
    expect(typeof mod.getBuyerPaymentLedger).toBe("function")
  })

  it("exports getBuyerPackageState read helper", async () => {
    const mod = await import("@/lib/services/buyer-package.service")
    expect(typeof mod.getBuyerPackageState).toBe("function")
  })
})

// ---------------------------------------------------------------------------
// Email triggers — upgrade & specialist notification exports
// ---------------------------------------------------------------------------

describe("Buyer Package Email Triggers", () => {
  it("exports sendUpgradeConfirmationEmail", async () => {
    const mod = await import("@/lib/email/triggers")
    expect(typeof mod.sendUpgradeConfirmationEmail).toBe("function")
  })

  it("exports sendPremiumSpecialistNotification", async () => {
    const mod = await import("@/lib/email/triggers")
    expect(typeof mod.sendPremiumSpecialistNotification).toBe("function")
  })
})
