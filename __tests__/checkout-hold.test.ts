import { vi, describe, it, expect, beforeEach } from "vitest"

// ── In-memory data stores for prisma mock ──
let auctionData: any[] = []
let shortlistItemData: any[] = []
let inventoryItemData: any[] = []

function resetStores() {
  auctionData = []
  shortlistItemData = []
  inventoryItemData = []
}

vi.mock("@/lib/db", () => ({
  getSupabase: vi.fn(() => mockSupabase),
  prisma: {
    auction: {
      findUnique: vi.fn(async (args: any) => {
        return auctionData.find((a: any) => a.id === args.where?.id) ?? null
      }),
    },
    $transaction: vi.fn(async (fn: any) => {
      const tx = {
        shortlistItem: {
          findMany: vi.fn(async (args: any) => {
            return shortlistItemData.filter(
              (si: any) => si.shortlistId === args.where?.shortlistId
            )
          }),
        },
        inventoryItem: {
          findMany: vi.fn(async (args: any) => {
            const ids = args.where?.id?.in || []
            return inventoryItemData.filter((i: any) => ids.includes(i.id))
          }),
          updateMany: vi.fn(async (args: any) => {
            const ids = args.where?.id?.in || []
            const statusFilter = args.where?.status
            let count = 0
            inventoryItemData.forEach((i: any) => {
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

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(async () => ({
          id: "cs_test_1",
          url: "https://checkout.stripe.com/cs_test_1",
          client_secret: "secret_1",
          status: "open",
        })),
        retrieve: vi.fn(),
      },
    },
  },
}))

vi.mock("@/lib/constants", () => ({
  DEPOSIT_AMOUNT: 500,
  DEPOSIT_AMOUNT_CENTS: 50000,
  PREMIUM_FEE: 495,
  FEE_ELIGIBLE_DEAL_STATUSES: ["FINANCING_APPROVED", "FEE_PENDING"],
}))

vi.mock("@/lib/constants/statuses", () => ({
  InventoryStatus: {
    AVAILABLE: "AVAILABLE",
    HOLD: "HOLD",
    SOLD: "SOLD",
    REMOVED: "REMOVED",
  },
}))

const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  in: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  maybeSingle: vi.fn(),
  single: vi.fn(),
}

import { CheckoutService, CheckoutError } from "@/lib/services/checkout.service"

describe("CheckoutService - getOrCreateDepositCheckout HOLD reservation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStores()
    // Default supabase: no paid deposit, no pending payment, insert succeeds
    mockSupabase.maybeSingle.mockResolvedValue({ data: null })
    mockSupabase.insert.mockReturnValue(mockSupabase)
    mockSupabase.update.mockReturnValue(mockSupabase)
    mockSupabase.eq.mockReturnValue(mockSupabase)
  })

  it("throws INVENTORY_UNAVAILABLE when inventory item is SOLD", async () => {
    inventoryItemData.push({ id: "item-1", status: "SOLD" })
    shortlistItemData.push({ shortlistId: "sl-1", inventoryItemId: "item-1" })
    auctionData.push({ id: "auction-1", shortlistId: "sl-1" })

    await expect(
      CheckoutService.getOrCreateDepositCheckout({
        buyerId: "buyer-1",
        auctionId: "auction-1",
      }),
    ).rejects.toMatchObject({ code: "INVENTORY_UNAVAILABLE" })
  })

  it("throws INVENTORY_UNAVAILABLE when inventory item is HOLD", async () => {
    inventoryItemData.push({ id: "item-1", status: "HOLD" })
    shortlistItemData.push({ shortlistId: "sl-1", inventoryItemId: "item-1" })
    auctionData.push({ id: "auction-1", shortlistId: "sl-1" })

    await expect(
      CheckoutService.getOrCreateDepositCheckout({
        buyerId: "buyer-1",
        auctionId: "auction-1",
      }),
    ).rejects.toMatchObject({ code: "INVENTORY_UNAVAILABLE" })
  })

  it("throws INVENTORY_UNAVAILABLE when inventory item is REMOVED", async () => {
    inventoryItemData.push({ id: "item-1", status: "REMOVED" })
    shortlistItemData.push({ shortlistId: "sl-1", inventoryItemId: "item-1" })
    auctionData.push({ id: "auction-1", shortlistId: "sl-1" })

    await expect(
      CheckoutService.getOrCreateDepositCheckout({
        buyerId: "buyer-1",
        auctionId: "auction-1",
      }),
    ).rejects.toMatchObject({ code: "INVENTORY_UNAVAILABLE" })
  })

  it("throws CheckoutError with ALREADY_PAID when deposit already paid", async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: "paid-deposit" } }) // paid exists

    await expect(
      CheckoutService.getOrCreateDepositCheckout({
        buyerId: "buyer-1",
        auctionId: "auction-1",
      }),
    ).rejects.toMatchObject({ code: "ALREADY_PAID" })
  })

  it("second buyer blocked when inventory already HOLDed by first buyer", async () => {
    inventoryItemData.push({ id: "item-1", status: "AVAILABLE" })
    shortlistItemData.push({ shortlistId: "sl-1", inventoryItemId: "item-1" })
    shortlistItemData.push({ shortlistId: "sl-2", inventoryItemId: "item-1" })
    auctionData.push({ id: "auction-1", shortlistId: "sl-1" })
    auctionData.push({ id: "auction-2", shortlistId: "sl-2" })

    // First buyer succeeds
    await CheckoutService.getOrCreateDepositCheckout({
      buyerId: "buyer-1",
      auctionId: "auction-1",
    })

    expect(inventoryItemData[0].status).toBe("HOLD")

    // Second buyer is blocked
    await expect(
      CheckoutService.getOrCreateDepositCheckout({
        buyerId: "buyer-2",
        auctionId: "auction-2",
      }),
    ).rejects.toMatchObject({ code: "INVENTORY_UNAVAILABLE" })
  })

  it("AVAILABLE items become HOLD with reservedAt before Stripe session", async () => {
    inventoryItemData.push({ id: "item-1", status: "AVAILABLE" })
    shortlistItemData.push({ shortlistId: "sl-1", inventoryItemId: "item-1" })
    auctionData.push({ id: "auction-1", shortlistId: "sl-1" })

    await CheckoutService.getOrCreateDepositCheckout({
      buyerId: "buyer-1",
      auctionId: "auction-1",
    })

    expect(inventoryItemData[0].status).toBe("HOLD")
    expect(inventoryItemData[0].reservedAt).toBeInstanceOf(Date)
  })
})

describe("CheckoutService - CheckoutError", () => {
  it("has correct code and message", () => {
    const err = new CheckoutError("test message", "TEST_CODE")
    expect(err.code).toBe("TEST_CODE")
    expect(err.message).toBe("test message")
    expect(err instanceof Error).toBe(true)
  })
})
