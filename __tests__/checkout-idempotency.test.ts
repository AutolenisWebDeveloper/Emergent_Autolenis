import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Checkout Session Idempotency — Behavioral Tests
 *
 * Tests the canonical CheckoutService with mocked Stripe + Supabase.
 * Validates runtime behavior, not source-string patterns.
 *
 * Covers:
 * - Second call returns the same open checkout session (deposit + service fee)
 * - Expired/canceled session results in a fresh new checkout session
 * - Duplicate pending rows are not created under repeated calls
 * - Unauthorized buyer cannot create service-fee checkout for another buyer's deal
 * - Invalid lifecycle state rejects checkout creation
 * - Already-paid deposit/fee is rejected
 * - Retry after Stripe timeout is safe (idempotency key derived from payment row)
 */

// ──────────────────────────────────────────────────────────────
// Mocks
// ──────────────────────────────────────────────────────────────

// In-memory store for mock supabase
let depositRows: any[] = []
let serviceFeeRows: any[] = []
let dealRows: any[] = []
let depositPaymentRows: any[] = []
let stripeSessionStore: Record<string, any> = {}
let stripeCreateCallCount = 0
let auctionDataForPrisma: any[] = []
let shortlistItemDataForPrisma: any[] = []
let inventoryItemDataForPrisma: any[] = []

function resetStores() {
  depositRows = []
  serviceFeeRows = []
  dealRows = []
  depositPaymentRows = []
  stripeSessionStore = {}
  stripeCreateCallCount = 0
  auctionDataForPrisma = []
  shortlistItemDataForPrisma = []
  inventoryItemDataForPrisma = []
}

// Build a chainable Supabase query mock
function buildChain(rows: any[], opts: { returnSingle?: boolean } = {}) {
  const state = { filters: [] as Array<{ key: string; op: string; value: any }>, insertData: null as any, updateData: null as any }

  const chain: any = {
    select: () => chain,
    eq: (key: string, value: any) => { state.filters.push({ key, op: "eq", value }); return chain },
    in: (key: string, values: any[]) => { state.filters.push({ key, op: "in", value: values }); return chain },
    limit: () => chain,
    order: () => chain,
    maybeSingle: () => {
      const matched = rows.filter(r =>
        state.filters.every(f => {
          if (f.op === "eq") return r[f.key] === f.value
          if (f.op === "in") return f.value.includes(r[f.key])
          return true
        })
      )
      return Promise.resolve({ data: matched[0] ?? null, error: null })
    },
    single: () => {
      const matched = rows.filter(r =>
        state.filters.every(f => {
          if (f.op === "eq") return r[f.key] === f.value
          if (f.op === "in") return f.value.includes(r[f.key])
          return true
        })
      )
      return Promise.resolve({ data: matched[0] ?? null, error: matched[0] ? null : { message: "not found" } })
    },
    insert: (data: any) => {
      state.insertData = data
      rows.push({ ...data, id: data.id || crypto.randomUUID() })
      return chain
    },
    update: (data: any) => {
      state.updateData = data
      // Apply update to matching rows
      rows.forEach(r => {
        const matches = state.filters.every(f => {
          if (f.op === "eq") return r[f.key] === f.value
          return true
        })
        if (matches) Object.assign(r, data)
      })
      return chain
    },
  }
  return chain
}

// Mock getSupabase + prisma
// prisma is needed by the HOLD reservation block added in BLOCKER 5 fix.
// When auctionDataForPrisma is empty, auction.findUnique returns null → HOLD block is a no-op.
vi.mock("@/lib/db", () => ({
  getSupabase: () => ({
    from: (table: string) => {
      if (table === "DepositPayment") return buildChain(depositRows)
      if (table === "ServiceFeePayment") return buildChain(serviceFeeRows)
      if (table === "SelectedDeal") return buildChain(dealRows)
      return buildChain([])
    },
  }),
  prisma: {
    auction: {
      findUnique: vi.fn(async (args: any) => {
        return auctionDataForPrisma.find((a: any) => a.id === args.where?.id) ?? null
      }),
    },
    $transaction: vi.fn(async (fn: any) => {
      const tx = {
        shortlistItem: {
          findMany: vi.fn(async (args: any) => {
            return shortlistItemDataForPrisma.filter(
              (si: any) => si.shortlistId === args.where?.shortlistId
            )
          }),
        },
        inventoryItem: {
          findMany: vi.fn(async (args: any) => {
            const ids = args.where?.id?.in || []
            return inventoryItemDataForPrisma.filter((i: any) => ids.includes(i.id))
          }),
          updateMany: vi.fn(async (args: any) => {
            const ids = args.where?.id?.in || []
            const statusFilter = args.where?.status
            let count = 0
            inventoryItemDataForPrisma.forEach((i: any) => {
              if (ids.includes(i.id) && (!statusFilter || i.status === statusFilter)) {
                Object.assign(i, args.data)
                count++
              }
            })
            return { count }
          }),
        },
      }
      return fn(tx)
    }),
  },
}))

// Mock stripe
vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(async (params: any, opts?: any) => {
          stripeCreateCallCount++
          const id = `cs_test_${stripeCreateCallCount}`
          const session = {
            id,
            url: `https://checkout.stripe.com/${id}`,
            client_secret: `secret_${id}`,
            status: "open",
            metadata: params.metadata,
          }
          stripeSessionStore[id] = session
          return session
        }),
        retrieve: vi.fn(async (sessionId: string) => {
          const session = stripeSessionStore[sessionId]
          if (!session) throw new Error("Session not found")
          return session
        }),
      },
    },
  },
}))

beforeEach(() => {
  resetStores()
  vi.clearAllMocks()
})

// ──────────────────────────────────────────────────────────────
// Import AFTER mocks are set up (vi.mock calls are hoisted by vitest)
// ──────────────────────────────────────────────────────────────

import { CheckoutService, CheckoutError } from "@/lib/services/checkout.service"

// ──────────────────────────────────────────────────────────────
// Deposit Checkout Tests
// ──────────────────────────────────────────────────────────────

describe("CheckoutService.getOrCreateDepositCheckout", () => {
  it("creates a new checkout session when no pending payment exists", async () => {
    const result = await CheckoutService.getOrCreateDepositCheckout({
      buyerId: "buyer-1",
      auctionId: "auction-1",
    })

    expect(result.sessionId).toMatch(/^cs_test_/)
    expect(result.url).toBeTruthy()
    expect(depositRows).toHaveLength(1)
    expect(depositRows[0].status).toBe("PENDING")
    expect(depositRows[0].checkoutSessionId).toBe(result.sessionId)
    expect(stripeCreateCallCount).toBe(1)
  })

  it("returns the same open session on second call (no duplicate Stripe session)", async () => {
    const first = await CheckoutService.getOrCreateDepositCheckout({
      buyerId: "buyer-1",
      auctionId: "auction-1",
    })

    const second = await CheckoutService.getOrCreateDepositCheckout({
      buyerId: "buyer-1",
      auctionId: "auction-1",
    })

    expect(second.sessionId).toBe(first.sessionId)
    expect(second.url).toBe(first.url)
    // Only one Stripe session.create call should have been made
    expect(stripeCreateCallCount).toBe(1)
    // Only one deposit row should exist
    expect(depositRows.filter(r => r.buyerId === "buyer-1" && r.auctionId === "auction-1")).toHaveLength(1)
  })

  it("creates a fresh session when the previous session is expired", async () => {
    const first = await CheckoutService.getOrCreateDepositCheckout({
      buyerId: "buyer-1",
      auctionId: "auction-1",
    })

    // Simulate session expiration
    stripeSessionStore[first.sessionId].status = "expired"

    const second = await CheckoutService.getOrCreateDepositCheckout({
      buyerId: "buyer-1",
      auctionId: "auction-1",
    })

    expect(second.sessionId).not.toBe(first.sessionId)
    expect(stripeCreateCallCount).toBe(2)
  })

  it("creates a fresh session when the previous session is complete", async () => {
    const first = await CheckoutService.getOrCreateDepositCheckout({
      buyerId: "buyer-1",
      auctionId: "auction-1",
    })

    // Simulate session completion
    stripeSessionStore[first.sessionId].status = "complete"

    const second = await CheckoutService.getOrCreateDepositCheckout({
      buyerId: "buyer-1",
      auctionId: "auction-1",
    })

    expect(second.sessionId).not.toBe(first.sessionId)
    expect(stripeCreateCallCount).toBe(2)
  })

  it("does not create duplicate pending rows under repeated calls", async () => {
    await CheckoutService.getOrCreateDepositCheckout({ buyerId: "b1", auctionId: "a1" })
    await CheckoutService.getOrCreateDepositCheckout({ buyerId: "b1", auctionId: "a1" })
    await CheckoutService.getOrCreateDepositCheckout({ buyerId: "b1", auctionId: "a1" })

    const matching = depositRows.filter(r => r.buyerId === "b1" && r.auctionId === "a1")
    expect(matching).toHaveLength(1)
  })

  it("rejects when deposit is already paid (SUCCEEDED)", async () => {
    depositRows.push({
      id: "paid-1",
      buyerId: "buyer-1",
      auctionId: "auction-1",
      status: "SUCCEEDED",
      refunded: false,
    })

    await expect(
      CheckoutService.getOrCreateDepositCheckout({ buyerId: "buyer-1", auctionId: "auction-1" })
    ).rejects.toThrow("Deposit already paid")
  })

  it("rejects when deposit is already paid (PAID)", async () => {
    depositRows.push({
      id: "paid-2",
      buyerId: "buyer-1",
      auctionId: "auction-1",
      status: "PAID",
      refunded: false,
    })

    await expect(
      CheckoutService.getOrCreateDepositCheckout({ buyerId: "buyer-1", auctionId: "auction-1" })
    ).rejects.toThrow("Deposit already paid")
  })

  it("uses payment-row-derived idempotency key (not buyer+auction)", async () => {
    const { stripe } = await import("@/lib/stripe")
    const createMock = stripe.checkout.sessions.create as any

    await CheckoutService.getOrCreateDepositCheckout({ buyerId: "b1", auctionId: "a1" })

    const [, opts] = createMock.mock.calls[0]
    expect(opts.idempotencyKey).toMatch(/^deposit_cs_/)
    // Key should contain the payment row id, not just buyerId_auctionId
    expect(opts.idempotencyKey).not.toContain("b1_a1")
  })

  it("increments attempt counter when creating a fresh session after expired", async () => {
    const { stripe } = await import("@/lib/stripe")
    const createMock = stripe.checkout.sessions.create as any

    const first = await CheckoutService.getOrCreateDepositCheckout({ buyerId: "b1", auctionId: "a1" })
    stripeSessionStore[first.sessionId].status = "expired"

    await CheckoutService.getOrCreateDepositCheckout({ buyerId: "b1", auctionId: "a1" })

    const firstKey = createMock.mock.calls[0][1].idempotencyKey
    const secondKey = createMock.mock.calls[1][1].idempotencyKey
    expect(firstKey).not.toBe(secondKey)
    // Both should start with deposit_cs_ prefix
    expect(firstKey).toMatch(/^deposit_cs_/)
    expect(secondKey).toMatch(/^deposit_cs_/)
  })

  it("checkoutAttempt does NOT increment when reusing an open session", async () => {
    await CheckoutService.getOrCreateDepositCheckout({ buyerId: "b1", auctionId: "a1" })

    // After first call, attempt should be 1
    const row = depositRows.find(r => r.buyerId === "b1" && r.auctionId === "a1")
    expect(row.checkoutAttempt).toBe(1)

    // Second call reuses — attempt should still be 1
    await CheckoutService.getOrCreateDepositCheckout({ buyerId: "b1", auctionId: "a1" })
    expect(row.checkoutAttempt).toBe(1)
  })

  it("persists checkoutSessionId on the payment row and reuses it on next call", async () => {
    const first = await CheckoutService.getOrCreateDepositCheckout({ buyerId: "b1", auctionId: "a1" })

    const row = depositRows.find(r => r.buyerId === "b1" && r.auctionId === "a1")
    expect(row.checkoutSessionId).toBe(first.sessionId)

    // On second call, the service reads the persisted checkoutSessionId and retrieves the Stripe session
    const { stripe } = await import("@/lib/stripe")
    const retrieveMock = stripe.checkout.sessions.retrieve as any

    await CheckoutService.getOrCreateDepositCheckout({ buyerId: "b1", auctionId: "a1" })

    // Retrieve should have been called with the persisted session ID
    expect(retrieveMock).toHaveBeenCalledWith(first.sessionId)
    // No new session.create call
    expect(stripeCreateCallCount).toBe(1)
  })

  it("checkoutAttempt increments when expired session forces a new one", async () => {
    const first = await CheckoutService.getOrCreateDepositCheckout({ buyerId: "b1", auctionId: "a1" })

    const row = depositRows.find(r => r.buyerId === "b1" && r.auctionId === "a1")
    expect(row.checkoutAttempt).toBe(1)

    stripeSessionStore[first.sessionId].status = "expired"
    await CheckoutService.getOrCreateDepositCheckout({ buyerId: "b1", auctionId: "a1" })

    expect(row.checkoutAttempt).toBe(2)
    expect(row.checkoutSessionId).not.toBe(first.sessionId)
  })

  it("second buyer checkout on same inventory throws INVENTORY_UNAVAILABLE", async () => {
    // Set up an inventory item
    inventoryItemDataForPrisma.push({ id: "inv-item-1", status: "AVAILABLE" })

    // Buyer 1's auction with shortlist referencing the item
    shortlistItemDataForPrisma.push({ shortlistId: "shortlist-1", inventoryItemId: "inv-item-1" })
    auctionDataForPrisma.push({ id: "auction-1", shortlistId: "shortlist-1" })

    // Buyer 2's auction with shortlist referencing the same item
    shortlistItemDataForPrisma.push({ shortlistId: "shortlist-2", inventoryItemId: "inv-item-1" })
    auctionDataForPrisma.push({ id: "auction-2", shortlistId: "shortlist-2" })

    // First buyer HOLDs the item
    await CheckoutService.getOrCreateDepositCheckout({
      buyerId: "buyer-1",
      auctionId: "auction-1",
    })

    // Verify item is now HOLD
    expect(inventoryItemDataForPrisma[0].status).toBe("HOLD")

    // Second buyer should be rejected
    await expect(
      CheckoutService.getOrCreateDepositCheckout({
        buyerId: "buyer-2",
        auctionId: "auction-2",
      })
    ).rejects.toThrow("are no longer available")
  })

  it("already HOLD inventory fails checkout with INVENTORY_UNAVAILABLE", async () => {
    inventoryItemDataForPrisma.push({ id: "inv-hold-1", status: "HOLD" })
    shortlistItemDataForPrisma.push({ shortlistId: "sl-hold", inventoryItemId: "inv-hold-1" })
    auctionDataForPrisma.push({ id: "auc-hold", shortlistId: "sl-hold" })

    await expect(
      CheckoutService.getOrCreateDepositCheckout({
        buyerId: "buyer-hold",
        auctionId: "auc-hold",
      })
    ).rejects.toThrow("are no longer available")
  })

  it("already SOLD inventory fails checkout with INVENTORY_UNAVAILABLE", async () => {
    inventoryItemDataForPrisma.push({ id: "inv-sold-1", status: "SOLD" })
    shortlistItemDataForPrisma.push({ shortlistId: "sl-sold", inventoryItemId: "inv-sold-1" })
    auctionDataForPrisma.push({ id: "auc-sold", shortlistId: "sl-sold" })

    await expect(
      CheckoutService.getOrCreateDepositCheckout({
        buyerId: "buyer-sold",
        auctionId: "auc-sold",
      })
    ).rejects.toThrow("are no longer available")
  })

  it("partial update protection: if one shortlisted item is unavailable, checkout fails and no Stripe session is created", async () => {
    inventoryItemDataForPrisma.push({ id: "inv-ok-1", status: "AVAILABLE" })
    inventoryItemDataForPrisma.push({ id: "inv-bad-1", status: "SOLD" })
    shortlistItemDataForPrisma.push({ shortlistId: "sl-partial", inventoryItemId: "inv-ok-1" })
    shortlistItemDataForPrisma.push({ shortlistId: "sl-partial", inventoryItemId: "inv-bad-1" })
    auctionDataForPrisma.push({ id: "auc-partial", shortlistId: "sl-partial" })

    const countBefore = stripeCreateCallCount

    await expect(
      CheckoutService.getOrCreateDepositCheckout({
        buyerId: "buyer-partial",
        auctionId: "auc-partial",
      })
    ).rejects.toThrow("are no longer available")

    // No Stripe session should have been created
    expect(stripeCreateCallCount).toBe(countBefore)
  })

  it("successful path: AVAILABLE items become HOLD then Stripe session is created", async () => {
    inventoryItemDataForPrisma.push({ id: "inv-succ-1", status: "AVAILABLE" })
    inventoryItemDataForPrisma.push({ id: "inv-succ-2", status: "AVAILABLE" })
    shortlistItemDataForPrisma.push({ shortlistId: "sl-succ", inventoryItemId: "inv-succ-1" })
    shortlistItemDataForPrisma.push({ shortlistId: "sl-succ", inventoryItemId: "inv-succ-2" })
    auctionDataForPrisma.push({ id: "auc-succ", shortlistId: "sl-succ" })

    const result = await CheckoutService.getOrCreateDepositCheckout({
      buyerId: "buyer-succ",
      auctionId: "auc-succ",
    })

    // Items should be HOLDed
    const item1 = inventoryItemDataForPrisma.find(i => i.id === "inv-succ-1")
    const item2 = inventoryItemDataForPrisma.find(i => i.id === "inv-succ-2")
    expect(item1.status).toBe("HOLD")
    expect(item2.status).toBe("HOLD")
    expect(item1.reservedAt).toBeInstanceOf(Date)
    expect(item2.reservedAt).toBeInstanceOf(Date)

    // Stripe session should have been created
    expect(result.sessionId).toMatch(/^cs_test_/)
    expect(result.url).toBeTruthy()
  })

  it("HOLD transaction executes before Stripe session creation", async () => {
    inventoryItemDataForPrisma.push({ id: "inv-order-1", status: "AVAILABLE" })
    shortlistItemDataForPrisma.push({ shortlistId: "sl-order", inventoryItemId: "inv-order-1" })
    auctionDataForPrisma.push({ id: "auc-order", shortlistId: "sl-order" })

    const { stripe: stripeMock } = await import("@/lib/stripe")
    let inventoryStatusAtStripeCallTime: string | undefined

    // Replace stripe create for THIS call only — capture inventory state at call time
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(stripeMock.checkout.sessions.create as any).mockImplementationOnce(async (params: any) => {
      inventoryStatusAtStripeCallTime = inventoryItemDataForPrisma.find(
        (i: { id: string }) => i.id === "inv-order-1"
      )?.status
      stripeCreateCallCount++
      const id = `cs_test_${stripeCreateCallCount}`
      const session = {
        id,
        url: `https://checkout.stripe.com/${id}`,
        client_secret: `secret_${id}`,
        status: "open",
        metadata: params.metadata,
      }
      stripeSessionStore[id] = session
      return session
    })

    await CheckoutService.getOrCreateDepositCheckout({
      buyerId: "buyer-order",
      auctionId: "auc-order",
    })

    // At the time Stripe was called, inventory should already be HOLDed
    expect(inventoryStatusAtStripeCallTime).toBe("HOLD")
  })
})

// ──────────────────────────────────────────────────────────────
// Service Fee Checkout Tests
// ──────────────────────────────────────────────────────────────

describe("CheckoutService.getOrCreateServiceFeeCheckout", () => {
  beforeEach(() => {
    dealRows.push({
      id: "deal-1",
      buyerId: "buyer-1",
      status: "FEE_PENDING",
    })
  })

  it("creates a new checkout session for valid deal", async () => {
    const result = await CheckoutService.getOrCreateServiceFeeCheckout({
      buyerId: "buyer-1",
      dealId: "deal-1",
    })

    expect(result.sessionId).toMatch(/^cs_test_/)
    expect(serviceFeeRows).toHaveLength(1)
    expect(serviceFeeRows[0].status).toBe("PENDING")
    expect(serviceFeeRows[0].checkoutSessionId).toBe(result.sessionId)
  })

  it("returns the same open session on second call", async () => {
    const first = await CheckoutService.getOrCreateServiceFeeCheckout({
      buyerId: "buyer-1",
      dealId: "deal-1",
    })

    const second = await CheckoutService.getOrCreateServiceFeeCheckout({
      buyerId: "buyer-1",
      dealId: "deal-1",
    })

    expect(second.sessionId).toBe(first.sessionId)
    expect(stripeCreateCallCount).toBe(1)
  })

  it("creates a fresh session when the previous is expired", async () => {
    const first = await CheckoutService.getOrCreateServiceFeeCheckout({
      buyerId: "buyer-1",
      dealId: "deal-1",
    })

    stripeSessionStore[first.sessionId].status = "expired"

    const second = await CheckoutService.getOrCreateServiceFeeCheckout({
      buyerId: "buyer-1",
      dealId: "deal-1",
    })

    expect(second.sessionId).not.toBe(first.sessionId)
    expect(stripeCreateCallCount).toBe(2)
  })

  it("rejects when deal does not belong to the buyer (ownership)", async () => {
    await expect(
      CheckoutService.getOrCreateServiceFeeCheckout({
        buyerId: "other-buyer",
        dealId: "deal-1",
      })
    ).rejects.toThrow("Unauthorized: deal does not belong to this buyer")
  })

  it("rejects when deal is in invalid lifecycle state", async () => {
    dealRows[0].status = "COMPLETED"

    await expect(
      CheckoutService.getOrCreateServiceFeeCheckout({
        buyerId: "buyer-1",
        dealId: "deal-1",
      })
    ).rejects.toThrow("Deal is not in a valid state for fee payment")
  })

  it("rejects when deal status is CANCELLED", async () => {
    dealRows[0].status = "CANCELLED"

    await expect(
      CheckoutService.getOrCreateServiceFeeCheckout({
        buyerId: "buyer-1",
        dealId: "deal-1",
      })
    ).rejects.toThrow("Deal is not in a valid state for fee payment")
  })

  it("rejects when service fee is already paid (PAID)", async () => {
    serviceFeeRows.push({
      id: "fee-1",
      dealId: "deal-1",
      status: "PAID",
    })

    await expect(
      CheckoutService.getOrCreateServiceFeeCheckout({
        buyerId: "buyer-1",
        dealId: "deal-1",
      })
    ).rejects.toThrow("Service fee already paid")
  })

  it("rejects when service fee is already paid (SUCCEEDED)", async () => {
    serviceFeeRows.push({
      id: "fee-2",
      dealId: "deal-1",
      status: "SUCCEEDED",
    })

    await expect(
      CheckoutService.getOrCreateServiceFeeCheckout({
        buyerId: "buyer-1",
        dealId: "deal-1",
      })
    ).rejects.toThrow("Service fee already paid")
  })

  it("rejects when deal is not found", async () => {
    await expect(
      CheckoutService.getOrCreateServiceFeeCheckout({
        buyerId: "buyer-1",
        dealId: "nonexistent-deal",
      })
    ).rejects.toThrow("Deal not found")
  })

  it("uses payment-row-derived idempotency key", async () => {
    const { stripe } = await import("@/lib/stripe")
    const createMock = stripe.checkout.sessions.create as any

    await CheckoutService.getOrCreateServiceFeeCheckout({
      buyerId: "buyer-1",
      dealId: "deal-1",
    })

    const [, opts] = createMock.mock.calls[0]
    expect(opts.idempotencyKey).toMatch(/^svc_fee_cs_/)
    expect(opts.idempotencyKey).not.toContain("buyer-1_deal-1")
  })

  it("accepts deal in each eligible status", async () => {
    const eligibleStatuses = ["SELECTED", "FINANCING_APPROVED", "FEE_PENDING", "FINANCING_PENDING"]

    for (const status of eligibleStatuses) {
      resetStores()
      dealRows.push({ id: "deal-1", buyerId: "buyer-1", status })

      const result = await CheckoutService.getOrCreateServiceFeeCheckout({
        buyerId: "buyer-1",
        dealId: "deal-1",
      })

      expect(result.sessionId).toBeTruthy()
    }
  })

  it("checkoutAttempt does NOT increment when reusing an open service-fee session", async () => {
    const first = await CheckoutService.getOrCreateServiceFeeCheckout({
      buyerId: "buyer-1",
      dealId: "deal-1",
    })

    const row = serviceFeeRows.find(r => r.dealId === "deal-1")
    expect(row.checkoutAttempt).toBe(1)

    // Reuse — attempt stays at 1
    await CheckoutService.getOrCreateServiceFeeCheckout({
      buyerId: "buyer-1",
      dealId: "deal-1",
    })
    expect(row.checkoutAttempt).toBe(1)
  })

  it("persists checkoutSessionId on service-fee row and reuses it", async () => {
    const first = await CheckoutService.getOrCreateServiceFeeCheckout({
      buyerId: "buyer-1",
      dealId: "deal-1",
    })

    const row = serviceFeeRows.find(r => r.dealId === "deal-1")
    expect(row.checkoutSessionId).toBe(first.sessionId)

    const { stripe } = await import("@/lib/stripe")
    const retrieveMock = stripe.checkout.sessions.retrieve as any

    await CheckoutService.getOrCreateServiceFeeCheckout({
      buyerId: "buyer-1",
      dealId: "deal-1",
    })

    expect(retrieveMock).toHaveBeenCalledWith(first.sessionId)
    expect(stripeCreateCallCount).toBe(1)
  })

  it("checkoutAttempt increments when expired service-fee session forces a new one", async () => {
    const first = await CheckoutService.getOrCreateServiceFeeCheckout({
      buyerId: "buyer-1",
      dealId: "deal-1",
    })

    const row = serviceFeeRows.find(r => r.dealId === "deal-1")
    expect(row.checkoutAttempt).toBe(1)

    stripeSessionStore[first.sessionId].status = "expired"

    await CheckoutService.getOrCreateServiceFeeCheckout({
      buyerId: "buyer-1",
      dealId: "deal-1",
    })

    expect(row.checkoutAttempt).toBe(2)
    expect(row.checkoutSessionId).not.toBe(first.sessionId)
  })

  it("does not create duplicate service-fee rows under repeated calls", async () => {
    await CheckoutService.getOrCreateServiceFeeCheckout({ buyerId: "buyer-1", dealId: "deal-1" })
    await CheckoutService.getOrCreateServiceFeeCheckout({ buyerId: "buyer-1", dealId: "deal-1" })
    await CheckoutService.getOrCreateServiceFeeCheckout({ buyerId: "buyer-1", dealId: "deal-1" })

    const matching = serviceFeeRows.filter(r => r.dealId === "deal-1")
    expect(matching).toHaveLength(1)
  })
})

// ──────────────────────────────────────────────────────────────
// CheckoutError class
// ──────────────────────────────────────────────────────────────

describe("CheckoutError", () => {
  it("has the correct name and code", () => {
    const err = new CheckoutError("test message", "TEST_CODE")
    expect(err.name).toBe("CheckoutError")
    expect(err.code).toBe("TEST_CODE")
    expect(err.message).toBe("test message")
    expect(err).toBeInstanceOf(Error)
  })
})

