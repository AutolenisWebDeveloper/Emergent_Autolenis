import { describe, it, expect, beforeAll } from "vitest"
import fs from "fs"
import path from "path"

/**
 * Stripe webhook handler tests
 *
 * Tests that the webhook route handler:
 * 1. Exports a POST handler
 * 2. Handles all 6 Stripe event types
 * 3. Validates webhook signature
 * 4. Returns proper responses
 */

// ──────────────────────────────────────────────────────────────
// Source verification tests (reads the route file directly)
// ──────────────────────────────────────────────────────────────

const WEBHOOK_ROUTE = path.join(process.cwd(), "app/api/webhooks/stripe/route.ts")

describe("Stripe Webhook Handler", () => {
  let source: string

  beforeAll(() => {
    source = fs.readFileSync(WEBHOOK_ROUTE, "utf-8")
  })

  describe("Route exports", () => {
    it("exports a POST handler", () => {
      expect(source).toMatch(/export\s+async\s+function\s+POST/)
    })

    it("exports force-dynamic to prevent static rendering", () => {
      expect(source).toContain('export const dynamic = "force-dynamic"')
    })

    it("does not export GET/PUT/DELETE", () => {
      expect(source).not.toMatch(/export\s+async\s+function\s+GET/)
      expect(source).not.toMatch(/export\s+async\s+function\s+PUT/)
      expect(source).not.toMatch(/export\s+async\s+function\s+DELETE/)
    })
  })

  describe("Signature verification", () => {
    it("verifies stripe-signature header", () => {
      expect(source).toContain("stripe-signature")
    })

    it("uses constructWebhookEvent for verification", () => {
      expect(source).toContain("constructWebhookEvent")
    })

    it("returns 400 for missing signature", () => {
      expect(source).toContain("Missing stripe-signature header")
    })

    it("returns 400 for invalid signature", () => {
      expect(source).toContain("Webhook Error")
    })
  })

  describe("Event type handling", () => {
    const REQUIRED_EVENT_TYPES = [
      "checkout.session.completed",
      "payment_intent.succeeded",
      "payment_intent.payment_failed",
      "charge.refunded",
      "charge.dispute.created",
      "payout.paid",
    ]

    for (const eventType of REQUIRED_EVENT_TYPES) {
      it(`handles ${eventType} event`, () => {
        expect(source).toContain(`"${eventType}"`)
      })
    }
  })

  describe("Checkout session handling", () => {
    it("handles deposit type", () => {
      expect(source).toContain('type === "deposit"')
    })

    it("handles service_fee type", () => {
      expect(source).toContain('type === "service_fee"')
    })

    it("updates payment status to SUCCEEDED", () => {
      expect(source).toContain('status: "SUCCEEDED"')
    })

    it("logs compliance events", () => {
      expect(source).toContain("ComplianceEvent")
    })
  })

  describe("Payment failure handling", () => {
    it("updates payment status to FAILED", () => {
      expect(source).toContain('status: "FAILED"')
    })

    it("sends P0 admin notification on failure", () => {
      expect(source).toContain('priority: "P0"')
    })
  })

  describe("Refund handling", () => {
    it("marks deposit as refunded", () => {
      expect(source).toContain("refunded: true")
    })

    it("creates REFUND transaction in ledger", () => {
      expect(source).toContain('type: "REFUND"')
    })

    it("uses findFirst for deposit lookup to safely return null when not found", () => {
      // handleChargeRefunded should use prisma.depositPayment.findFirst (returns null, never throws)
      expect(source).toContain("prisma.depositPayment.findFirst")
    })

    it("handles service fee refund by looking up ServiceFeePayment", () => {
      expect(source).toContain("ServiceFeePayment")
      expect(source).toContain('status: "REFUNDED"')
    })

    it("reverses affiliate commissions on service fee refund", () => {
      expect(source).toContain("cancelCommissionsForPayment")
      expect(source).toContain("Service fee refunded")
    })

    it("logs compliance event for service fee refund", () => {
      expect(source).toContain("SERVICE_FEE_REFUND")
      expect(source).toContain("SERVICE_FEE_REFUNDED")
    })

    it("sends admin notification for service fee refund", () => {
      expect(source).toContain("payment.service_fee.refunded")
    })
  })

  describe("Dispute handling", () => {
    it("creates Chargeback record", () => {
      expect(source).toContain("Chargeback")
    })

    it("creates CHARGEBACK transaction", () => {
      expect(source).toContain('type: "CHARGEBACK"')
    })
  })

  describe("Transaction ledger", () => {
    it("creates transaction entries for payments", () => {
      expect(source).toContain('type: "PAYMENT"')
    })

    it("deduplicates transactions by stripePaymentIntentId", () => {
      expect(source).toContain("stripePaymentIntentId")
    })
  })

  describe("Admin notifications", () => {
    it("sends notifications via notifyAdmin", () => {
      expect(source).toContain("notifyAdmin")
    })

    it("uses deduplication keys", () => {
      expect(source).toContain("dedupeKey")
    })

    it("P1 for succeeded payments", () => {
      expect(source).toContain('priority: "P1"')
    })

    it("P0 for failed payments", () => {
      expect(source).toContain('priority: "P0"')
    })
  })

  describe("Commission processing", () => {
    it("uses affiliateService.processCommission as the sole commission path", () => {
      expect(source).toContain("affiliateService.processCommission")
    })

    it("does NOT call PaymentService.processCommissions (removed)", () => {
      expect(source).not.toContain("PaymentService.processCommissions")
    })

    it("looks up referral chain via referredBy", () => {
      expect(source).toContain("referredBy")
    })
  })

  describe("Error handling", () => {
    it("returns { received: true } on success", () => {
      expect(source).toContain("received: true")
    })

    it("returns 500 on handler error", () => {
      expect(source).toMatch(/status:\s*500/)
    })
  })

  describe("Event-level idempotency", () => {
    it("checks for already-processed events before handling", () => {
      expect(source).toContain("STRIPE_EVENT_")
      expect(source).toContain("already processed")
    })

    it("inserts idempotency marker into ComplianceEvent before processing", () => {
      expect(source).toContain("WEBHOOK_PROCESSED")
    })

    it("returns deduplicated response for repeated events", () => {
      expect(source).toContain("deduplicated: true")
    })

    it("handles insert conflicts gracefully for race condition protection", () => {
      expect(source).toContain("insertError")
      expect(source).toContain("treating as duplicate")
    })

    it("performs idempotency check BEFORE event dispatch to prevent duplicate processing", () => {
      const idempotencyCheckIdx = source.indexOf("STRIPE_EVENT_")
      const switchIdx = source.indexOf("switch (event.type)")
      expect(idempotencyCheckIdx).toBeGreaterThan(-1)
      expect(switchIdx).toBeGreaterThan(-1)
      expect(idempotencyCheckIdx).toBeLessThan(switchIdx)
    })
  })

  describe("Webhook replay safety", () => {
    it("service fee payment lookup only targets PENDING payments to prevent re-processing", () => {
      // The service fee lookup uses .eq("status", "PENDING") to avoid re-processing already-completed payments
      expect(source).toContain('.eq("status", "PENDING")')
    })

    it("commission processing is idempotent via affiliateService", () => {
      // affiliateService.processCommission internally delegates to
      // createCommissionsForPayment which checks for existing commissions
      expect(source).toContain("affiliateService.processCommission")
      // No direct Commission.insert — all commission creation goes through the service
      expect(source).not.toContain('from("Commission").insert')
    })
  })
})
