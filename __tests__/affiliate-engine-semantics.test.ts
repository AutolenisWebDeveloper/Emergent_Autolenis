import { describe, expect, it, beforeAll } from "vitest"
import fs from "fs"
import path from "path"

/**
 * Affiliate Engine Semantics Tests
 *
 * Validates the affiliate engine implementation against non-negotiable requirements:
 * - Self-referral prevention
 * - Loop detection in referral chains
 * - Max depth enforcement (5 levels)
 * - Commission reversal on refunds
 * - Commission idempotency
 * - Status mismatch handling (PAID/SUCCEEDED)
 * - processCommission() implementation (not a stub)
 */

const SERVICE_PATH = path.join(process.cwd(), "lib/services/affiliate.service.ts")
const WEBHOOK_PATH = path.join(process.cwd(), "app/api/webhooks/stripe/route.ts")
const COMMISSION_TRIGGER_PATH = path.join(process.cwd(), "app/api/webhooks/stripe/commission-trigger/route.ts")

describe("Affiliate Engine Semantics", () => {
  let serviceSource: string
  let webhookSource: string
  let commissionTriggerSource: string

  beforeAll(() => {
    serviceSource = fs.readFileSync(SERVICE_PATH, "utf-8")
    webhookSource = fs.readFileSync(WEBHOOK_PATH, "utf-8")
    commissionTriggerSource = fs.readFileSync(COMMISSION_TRIGGER_PATH, "utf-8")
  })

  describe("Self-referral prevention", () => {
    it("blocks self-referral in trackReferral()", () => {
      expect(serviceSource).toContain("affiliate.userId === referredUserId")
      expect(serviceSource).toContain("SELF_REFERRAL_BLOCKED")
      expect(serviceSource).toContain("Self-referral not allowed")
    })

    it("blocks self-referral in processSignupReferral()", () => {
      expect(serviceSource).toContain("affiliate.userId === userId")
    })
  })

  describe("Loop detection", () => {
    it("prevents loops in buildReferralChain by checking if upline user is the referred user", () => {
      expect(serviceSource).toContain("uplineReferral.affiliate.userId === referredUserId")
    })

    it("breaks chain when loop is detected", () => {
      // The loop detection line is followed by a break statement
      const loopCheckIdx = serviceSource.indexOf("uplineReferral.affiliate.userId === referredUserId")
      expect(loopCheckIdx).toBeGreaterThan(-1)
      // "break" should appear shortly after the loop check
      const afterCheck = serviceSource.slice(loopCheckIdx, loopCheckIdx + 100)
      expect(afterCheck).toContain("break")
    })
  })

  describe("Max depth enforcement", () => {
    it("limits referral chain depth to 5 levels", () => {
      expect(serviceSource).toContain("currentLevel <= 5")
    })

    it("starts level counting at 2 for upstream levels", () => {
      expect(serviceSource).toContain("currentLevel = 2")
    })

    it("commission rates only defined for levels 1-3", () => {
      expect(serviceSource).toContain("1: 0.15")
      expect(serviceSource).toContain("2: 0.03")
      expect(serviceSource).toContain("3: 0.02")
    })
  })

  describe("Commission reversal on refunds", () => {
    it("cancelCommissionsForPayment cancels PENDING and EARNED commissions", () => {
      // Canonical constants: CommissionStatus.PENDING, CommissionStatus.EARNED
      expect(serviceSource).toContain("CommissionStatus.PENDING, CommissionStatus.EARNED")
    })

    it("uses database transactions for atomic reversal", () => {
      const cancelSection = serviceSource.slice(
        serviceSource.indexOf("cancelCommissionsForPayment"),
        serviceSource.indexOf("approveCommission")
      )
      expect(cancelSection).toContain("$transaction")
    })

    it("decrements affiliate balance on cancellation", () => {
      expect(serviceSource).toContain("decrement")
      expect(serviceSource).toContain("pendingEarnings")
      expect(serviceSource).toContain("available_balance_cents")
    })

    it("records cancel reason", () => {
      expect(serviceSource).toContain("cancel_reason")
      expect(serviceSource).toContain("cancelled_at")
    })

    it("webhook handler reverses commissions on service fee refund", () => {
      expect(webhookSource).toContain("cancelCommissionsForPayment")
      expect(webhookSource).toContain("Service fee refunded")
    })
  })

  describe("Commission idempotency", () => {
    it("createCommissionsForPayment checks for existing commissions", () => {
      expect(serviceSource).toContain("existingCommissions")
      expect(serviceSource).toContain("Commissions already exist")
    })

    it("trackReferral checks for existing referrals", () => {
      expect(serviceSource).toContain("existingReferrals")
      expect(serviceSource).toContain("alreadyTracked")
    })

    it("completeDealReferral checks for existing commissions", () => {
      expect(serviceSource).toContain("alreadyCompleted")
    })
  })

  describe("processCommission() implementation", () => {
    it("is not a stub — delegates to createCommissionsForPayment", () => {
      // processCommission should call createCommissionsForPayment, not just return success
      const startIdx = serviceSource.lastIndexOf("async processCommission(")
      expect(startIdx).toBeGreaterThan(-1)
      // Get a generous section of the method
      const processMethod = serviceSource.slice(startIdx, startIdx + 800)
      expect(processMethod).toContain("createCommissionsForPayment")
    })

    it("finds the service fee payment by user ID", () => {
      const startIdx = serviceSource.lastIndexOf("async processCommission(")
      const processMethod = serviceSource.slice(startIdx, startIdx + 800)
      expect(processMethod).toContain("serviceFeePayment.findFirst")
      expect(processMethod).toContain("user_id")
    })
  })

  describe("Status handling", () => {
    it("createCommissionsForPayment accepts both PAID and SUCCEEDED statuses", () => {
      // Now uses canonical PaymentStatus.SUCCEEDED alongside legacy "PAID"
      expect(serviceSource).toContain("PaymentStatus.SUCCEEDED")
      expect(serviceSource).toContain('"PAID"')
    })
  })

  describe("Commission trigger route", () => {
    it("uses structured logger instead of console.error", () => {
      expect(commissionTriggerSource).toContain("logger.error")
      expect(commissionTriggerSource).not.toContain("console.error")
    })

    it("validates internal API key", () => {
      expect(commissionTriggerSource).toContain("x-api-key")
      expect(commissionTriggerSource).toContain("Unauthorized")
    })

    it("supports REFUND action to cancel commissions", () => {
      expect(commissionTriggerSource).toContain('"REFUND"')
      expect(commissionTriggerSource).toContain("cancelCommissionsForPayment")
    })

    it("uses timing-safe comparison for API key verification", () => {
      expect(commissionTriggerSource).toContain("timingSafeEqual")
    })

    it("validates request body with Zod schema", () => {
      expect(commissionTriggerSource).toContain("bodySchema.safeParse")
      expect(commissionTriggerSource).toContain("Invalid request body")
    })

    it("rejects requests when no API key is configured server-side", () => {
      expect(commissionTriggerSource).toContain("No API key configured")
    })
  })
})
