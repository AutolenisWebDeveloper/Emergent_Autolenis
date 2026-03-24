/**
 * Tests for Admin Refund Route — FIX 6 integration tests
 *
 * Validates:
 * 1. Deposit refund success → status SUCCEEDED, typed FK depositPaymentId set
 * 2. Service fee refund success → status SUCCEEDED, typed FK serviceFeePaymentId set
 * 3. Stripe failure → 502 and no DB record written
 * 4. Missing stripePaymentIntentId → 400
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { prisma } from "@/lib/db"
import { stripe } from "@/lib/stripe"

vi.mock("@/lib/db", () => ({
  prisma: {
    depositPayment: {
      findUnique: vi.fn(),
    },
    serviceFeePayment: {
      findUnique: vi.fn(),
    },
    refund: {
      create: vi.fn(),
    },
    financialAuditLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/stripe", () => ({
  stripe: {
    refunds: {
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/auth-server", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: "admin-1",
    workspace_id: "ws-1",
    role: "ADMIN",
  }),
}))

vi.mock("@/lib/app-mode", () => ({
  isTestWorkspace: vi.fn().mockReturnValue(false),
}))

vi.mock("@/lib/mocks/mockStore", () => ({
  mockSelectors: {
    adminDealRefunds: vi.fn().mockReturnValue({ refunds: [] }),
  },
}))

// Helper to create test request
function makePostRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/admin/deals/deal-1/refunds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("Admin Refund Route — FIX 6 normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deposit refund success → SUCCEEDED status + typed depositPaymentId", async () => {
    vi.mocked(prisma.depositPayment.findUnique).mockResolvedValue({
      id: "dp-1",
      stripePaymentIntentId: "pi_deposit_123",
      buyerId: "buyer-1",
    } as any)

    vi.mocked(stripe.refunds.create).mockResolvedValue({
      id: "re_stripe_1",
      status: "succeeded",
    } as any)

    vi.mocked(prisma.refund.create).mockResolvedValue({
      id: "refund-1",
      stripeRefundId: "re_stripe_1",
      status: "SUCCEEDED",
      depositPaymentId: "dp-1",
    } as any)

    vi.mocked(prisma.financialAuditLog.create).mockResolvedValue({} as any)

    const { POST } = await import("@/app/api/admin/deals/[dealId]/refunds/route")
    const res = await POST(
      makePostRequest({ paymentId: "dp-1", paymentType: "DEPOSIT", amountCents: 5000 }),
      { params: Promise.resolve({ dealId: "deal-1" }) },
    )

    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    // Verify Stripe refund was called
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: "pi_deposit_123",
        amount: 5000,
      }),
    )

    // Verify DB refund used typed FK (depositPaymentId, not relatedPaymentId)
    expect(prisma.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stripeRefundId: "re_stripe_1",
        status: "SUCCEEDED",
        amountCents: 5000,
        depositPaymentId: "dp-1",
      }),
    })

    // Verify FinancialAuditLog
    expect(prisma.financialAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "REFUND_ISSUED",
        entityType: "Refund",
      }),
    })
  })

  it("service fee refund success → SUCCEEDED status + typed serviceFeePaymentId", async () => {
    vi.mocked(prisma.serviceFeePayment.findUnique).mockResolvedValue({
      id: "sfp-1",
      stripePaymentIntentId: "pi_service_123",
      buyerId: "buyer-2",
    } as any)

    vi.mocked(stripe.refunds.create).mockResolvedValue({
      id: "re_stripe_2",
      status: "succeeded",
    } as any)

    vi.mocked(prisma.refund.create).mockResolvedValue({
      id: "refund-2",
      stripeRefundId: "re_stripe_2",
      status: "SUCCEEDED",
      serviceFeePaymentId: "sfp-1",
    } as any)

    vi.mocked(prisma.financialAuditLog.create).mockResolvedValue({} as any)

    const { POST } = await import("@/app/api/admin/deals/[dealId]/refunds/route")
    const res = await POST(
      makePostRequest({ paymentId: "sfp-1", paymentType: "SERVICE_FEE", amountCents: 40000 }),
      { params: Promise.resolve({ dealId: "deal-1" }) },
    )

    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    // Verify typed FK used
    expect(prisma.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        serviceFeePaymentId: "sfp-1",
        status: "SUCCEEDED",
      }),
    })
  })

  it("Stripe failure → returns 502 and writes nothing to DB", async () => {
    vi.mocked(prisma.depositPayment.findUnique).mockResolvedValue({
      id: "dp-1",
      stripePaymentIntentId: "pi_deposit_123",
      buyerId: "buyer-1",
    } as any)

    vi.mocked(stripe.refunds.create).mockRejectedValue(
      new Error("Stripe: card_declined"),
    )

    const { POST } = await import("@/app/api/admin/deals/[dealId]/refunds/route")
    const res = await POST(
      makePostRequest({ paymentId: "dp-1", paymentType: "DEPOSIT", amountCents: 5000 }),
      { params: Promise.resolve({ dealId: "deal-1" }) },
    )

    expect(res.status).toBe(502)

    // Verify no DB writes occurred
    expect(prisma.refund.create).not.toHaveBeenCalled()
    expect(prisma.financialAuditLog.create).not.toHaveBeenCalled()
  })

  it("missing stripePaymentIntentId → returns 400", async () => {
    vi.mocked(prisma.depositPayment.findUnique).mockResolvedValue({
      id: "dp-1",
      stripePaymentIntentId: null, // no Stripe PI
      buyerId: "buyer-1",
    } as any)

    const { POST } = await import("@/app/api/admin/deals/[dealId]/refunds/route")
    const res = await POST(
      makePostRequest({ paymentId: "dp-1", paymentType: "DEPOSIT", amountCents: 5000 }),
      { params: Promise.resolve({ dealId: "deal-1" }) },
    )

    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error).toMatch(/No Stripe payment intent/i)

    // Verify no Stripe or DB calls
    expect(stripe.refunds.create).not.toHaveBeenCalled()
    expect(prisma.refund.create).not.toHaveBeenCalled()
  })
})
