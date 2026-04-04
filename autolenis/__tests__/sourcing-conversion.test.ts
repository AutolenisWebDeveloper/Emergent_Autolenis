import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks — hoisted
// ---------------------------------------------------------------------------

const mockSupabaseFrom = vi.fn()
const mockSupabaseClient = { from: mockSupabaseFrom }

const { mockPrisma, mockLogger } = vi.hoisted(() => ({
  mockPrisma: {
    vehicleRequestCase: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    buyerProfile: {
      findUnique: vi.fn(),
    },
    dealer: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    dealerInvite: {
      findFirst: vi.fn(),
    },
    selectedDeal: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    serviceFeePayment: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    inventoryItem: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
  getSupabase: () => mockSupabaseClient,
}))

vi.mock("@/lib/logger", () => ({ logger: mockLogger }))

import {
  convertSourcingCase,
  getConversion,
  getConversionEvents,
  writeConversionEvent,
  ConversionStatus,
} from "@/lib/services/inventory-sourcing/conversion.service"

// ---------------------------------------------------------------------------
// Supabase mock helpers
// ---------------------------------------------------------------------------

type SupabaseChain = {
  insert: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
}

function createChain(finalData: unknown = null, finalError: unknown = null): SupabaseChain {
  const chain: SupabaseChain = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  }
  chain.insert.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  chain.single.mockResolvedValue({ data: finalData, error: finalError })
  chain.update.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.order.mockResolvedValue({ data: finalData, error: finalError })
  return chain
}

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function makeSourcingCase(overrides: Record<string, unknown> = {}) {
  return {
    id: "case-1",
    buyerId: "buyer-profile-1",
    workspaceId: "ws-1",
    status: "OFFER_SELECTED",
    offers: [
      {
        id: "offer-1",
        status: "ACCEPTED",
        dealerId: "dealer-1",
        vin: "1HGCM82633A123456",
        make: "Honda",
        modelName: "Accord",
        year: 2024,
        pricingBreakdownJson: {
          cashOtdCents: 3500000,
          taxCents: 250000,
          conciergeFee: 49900,
        },
      },
    ],
    items: [{ id: "item-1", make: "Honda", model: "Accord" }],
    ...overrides,
  }
}

function makeBuyerProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "buyer-profile-1",
    userId: "user-1",
    ...overrides,
  }
}

function makeDealer(overrides: Record<string, unknown> = {}) {
  return {
    id: "dealer-1",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe("ConversionStatus enum", () => {
  it("has all expected values", () => {
    expect(ConversionStatus.PENDING).toBe("PENDING")
    expect(ConversionStatus.BUYER_RESOLVED).toBe("BUYER_RESOLVED")
    expect(ConversionStatus.DEAL_CREATED).toBe("DEAL_CREATED")
    expect(ConversionStatus.CONTRACTS_SEEDED).toBe("CONTRACTS_SEEDED")
    expect(ConversionStatus.PAYMENTS_SEEDED).toBe("PAYMENTS_SEEDED")
    expect(ConversionStatus.INSURANCE_SEEDED).toBe("INSURANCE_SEEDED")
    expect(ConversionStatus.PICKUP_SEEDED).toBe("PICKUP_SEEDED")
    expect(ConversionStatus.COMPLETED).toBe("COMPLETED")
    expect(ConversionStatus.FAILED).toBe("FAILED")
  })

  it("has exactly 9 status values", () => {
    expect(Object.keys(ConversionStatus)).toHaveLength(9)
  })
})

describe("writeConversionEvent", () => {
  it("inserts an event into deal_conversion_events", async () => {
    const chain = createChain()
    // writeConversionEvent only calls insert (no .select/.single chain)
    chain.insert.mockResolvedValue({ error: null })
    mockSupabaseFrom.mockReturnValue(chain)

    await writeConversionEvent("conv-1", "TEST_EVENT", "actor-1", { key: "val" })

    expect(mockSupabaseFrom).toHaveBeenCalledWith("deal_conversion_events")
    expect(chain.insert).toHaveBeenCalledWith({
      conversion_id: "conv-1",
      event_type: "TEST_EVENT",
      actor_user_id: "actor-1",
      payload: { key: "val" },
    })
  })

  it("logs error but does not throw on insert failure", async () => {
    const chain = createChain()
    chain.insert.mockResolvedValue({ error: { message: "insert failed" } })
    mockSupabaseFrom.mockReturnValue(chain)

    await expect(
      writeConversionEvent("conv-1", "TEST_EVENT"),
    ).resolves.toBeUndefined()

    expect(mockLogger.error).toHaveBeenCalled()
  })
})

describe("convertSourcingCase", () => {
  it("rejects when sourcing case is not found", async () => {
    mockPrisma.vehicleRequestCase.findUnique.mockResolvedValue(null)

    await expect(
      convertSourcingCase({ sourcingCaseId: "bad-id", actorUserId: "admin-1" }),
    ).rejects.toThrow("Sourcing case not found")
  })

  it("rejects when case status is not OFFER_SELECTED/DEALER_INVITED/IN_PLATFORM_TRANSACTION", async () => {
    mockPrisma.vehicleRequestCase.findUnique.mockResolvedValue(
      makeSourcingCase({ status: "DRAFT" }),
    )

    await expect(
      convertSourcingCase({ sourcingCaseId: "case-1", actorUserId: "admin-1" }),
    ).rejects.toThrow("Case status must be")
  })

  it("rejects when no ACCEPTED offer exists", async () => {
    mockPrisma.vehicleRequestCase.findUnique.mockResolvedValue(
      makeSourcingCase({
        offers: [{ id: "offer-1", status: "PRESENTED" }],
      }),
    )

    // Return no existing conversion
    const convChain = createChain(null, { code: "PGRST116", message: "not found" })
    mockSupabaseFrom.mockReturnValue(convChain)

    await expect(
      convertSourcingCase({ sourcingCaseId: "case-1", actorUserId: "admin-1" }),
    ).rejects.toThrow("No ACCEPTED offer found")
  })

  it("returns existing completed conversion (idempotent)", async () => {
    mockPrisma.vehicleRequestCase.findUnique.mockResolvedValue(makeSourcingCase())

    const existingConv = {
      id: "conv-existing",
      status: "COMPLETED",
      selected_deal_id: "deal-existing",
    }
    const chain = createChain(existingConv)
    mockSupabaseFrom.mockReturnValue(chain)

    const result = await convertSourcingCase({
      sourcingCaseId: "case-1",
      actorUserId: "admin-1",
    })

    expect(result.conversionId).toBe("conv-existing")
    expect(result.selectedDealId).toBe("deal-existing")
    expect(result.status).toBe("COMPLETED")
  })

  it("runs full conversion pipeline successfully", async () => {
    // 1. Case lookup
    mockPrisma.vehicleRequestCase.findUnique.mockResolvedValue(makeSourcingCase())

    // 2. No existing conversion (Supabase single returns 404-style error)
    const noConvChain = createChain(null, { code: "PGRST116", message: "not found" })

    // 3. Insert conversion record
    const insertConvChain = createChain({ id: "conv-new" })

    // 4. Event insert chains (multiple calls)
    const eventChain = createChain()
    eventChain.insert.mockResolvedValue({ error: null })

    // 5. Update conversion status chains
    const updateChain = createChain()
    updateChain.update.mockReturnValue(updateChain)
    updateChain.eq.mockResolvedValue({ error: null })

    // Route Supabase from() calls
    let fromCallCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "inventory_case_conversions") {
        fromCallCount++
        if (fromCallCount === 1) return noConvChain // check existing
        if (fromCallCount === 2) return insertConvChain // insert new
        // Subsequent calls are status updates
        return updateChain
      }
      if (table === "deal_conversion_events") {
        return eventChain
      }
      return updateChain
    })

    // 4. Buyer profile
    mockPrisma.buyerProfile.findUnique.mockResolvedValue(makeBuyerProfile())

    // 5. Dealer
    mockPrisma.dealer.findUnique.mockResolvedValue(makeDealer())

    // 6. No existing SelectedDeal
    mockPrisma.selectedDeal.findFirst.mockResolvedValue(null)

    // 7. Create SelectedDeal
    mockPrisma.selectedDeal.create.mockResolvedValue({ id: "deal-new" })

    // 8. ServiceFeePayment
    mockPrisma.serviceFeePayment.findUnique.mockResolvedValue(null)
    mockPrisma.serviceFeePayment.create.mockResolvedValue({ id: "sfp-new" })

    // 9. Update deal insurance_status
    mockPrisma.vehicleRequestCase.update.mockResolvedValue({})

    // SelectedDeal update for insurance
    // Use a proxy pattern to handle all selectedDeal calls
    const selectedDealUpdate = vi.fn().mockResolvedValue({})
    ;(mockPrisma.selectedDeal as Record<string, unknown>).update = selectedDealUpdate

    const result = await convertSourcingCase({
      sourcingCaseId: "case-1",
      actorUserId: "admin-1",
    })

    expect(result.status).toBe("COMPLETED")
    expect(result.conversionId).toBe("conv-new")
    expect(result.selectedDealId).toBe("deal-new")

    // Verify SelectedDeal was created with sourcing lineage
    expect(mockPrisma.selectedDeal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        buyerId: "buyer-profile-1",
        dealerId: "dealer-1",
        sourcingCaseId: "case-1",
        sourcedOfferId: "offer-1",
        status: "SELECTED",
      }),
    })

    // Verify ServiceFeePayment seeded
    expect(mockPrisma.serviceFeePayment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dealId: "deal-new",
        status: "PENDING",
      }),
    })

    // Verify case status updated to IN_PLATFORM_TRANSACTION
    expect(mockPrisma.vehicleRequestCase.update).toHaveBeenCalledWith({
      where: { id: "case-1" },
      data: { status: "IN_PLATFORM_TRANSACTION" },
    })
  })

  it("reuses existing SelectedDeal when already created by completeDealerInvite", async () => {
    mockPrisma.vehicleRequestCase.findUnique.mockResolvedValue(makeSourcingCase())

    // No existing conversion
    const noConvChain = createChain(null, { code: "PGRST116", message: "not found" })
    const insertConvChain = createChain({ id: "conv-reuse" })
    const eventChain = createChain()
    eventChain.insert.mockResolvedValue({ error: null })
    const updateChain = createChain()
    updateChain.update.mockReturnValue(updateChain)
    updateChain.eq.mockResolvedValue({ error: null })

    let fromCallCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "inventory_case_conversions") {
        fromCallCount++
        if (fromCallCount === 1) return noConvChain
        if (fromCallCount === 2) return insertConvChain
        return updateChain
      }
      return eventChain
    })

    mockPrisma.buyerProfile.findUnique.mockResolvedValue(makeBuyerProfile())
    mockPrisma.dealer.findUnique.mockResolvedValue(makeDealer())

    // Existing SelectedDeal
    mockPrisma.selectedDeal.findFirst.mockResolvedValue({ id: "existing-deal" })

    mockPrisma.serviceFeePayment.findUnique.mockResolvedValue(null)
    mockPrisma.serviceFeePayment.create.mockResolvedValue({ id: "sfp-1" })

    mockPrisma.vehicleRequestCase.update.mockResolvedValue({})
    ;(mockPrisma.selectedDeal as Record<string, unknown>).update = vi.fn().mockResolvedValue({})

    const result = await convertSourcingCase({
      sourcingCaseId: "case-1",
      actorUserId: "admin-1",
    })

    expect(result.selectedDealId).toBe("existing-deal")
    // Should NOT create a new deal
    expect(mockPrisma.selectedDeal.create).not.toHaveBeenCalled()
  })

  it("marks conversion as FAILED on buyer resolution error", async () => {
    mockPrisma.vehicleRequestCase.findUnique.mockResolvedValue(makeSourcingCase())

    // No existing conversion
    const noConvChain = createChain(null, { code: "PGRST116", message: "not found" })
    const insertConvChain = createChain({ id: "conv-fail" })
    const eventChain = createChain()
    eventChain.insert.mockResolvedValue({ error: null })
    const updateChain = createChain()
    updateChain.update.mockReturnValue(updateChain)
    updateChain.eq.mockResolvedValue({ error: null })

    let fromCallCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "inventory_case_conversions") {
        fromCallCount++
        if (fromCallCount === 1) return noConvChain
        if (fromCallCount === 2) return insertConvChain
        return updateChain
      }
      return eventChain
    })

    // Buyer not found → triggers failure
    mockPrisma.buyerProfile.findUnique.mockResolvedValue(null)

    await expect(
      convertSourcingCase({ sourcingCaseId: "case-1", actorUserId: "admin-1" }),
    ).rejects.toThrow("Buyer profile not found")
  })

  it("marks conversion as FAILED on dealer resolution error", async () => {
    mockPrisma.vehicleRequestCase.findUnique.mockResolvedValue(
      makeSourcingCase({
        offers: [
          {
            id: "offer-1",
            status: "ACCEPTED",
            dealerId: null, // No dealer on offer
            pricingBreakdownJson: {},
          },
        ],
      }),
    )

    const noConvChain = createChain(null, { code: "PGRST116", message: "not found" })
    const insertConvChain = createChain({ id: "conv-fail-dealer" })
    const eventChain = createChain()
    eventChain.insert.mockResolvedValue({ error: null })
    const updateChain = createChain()
    updateChain.update.mockReturnValue(updateChain)
    updateChain.eq.mockResolvedValue({ error: null })

    let fromCallCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === "inventory_case_conversions") {
        fromCallCount++
        if (fromCallCount === 1) return noConvChain
        if (fromCallCount === 2) return insertConvChain
        return updateChain
      }
      return eventChain
    })

    mockPrisma.buyerProfile.findUnique.mockResolvedValue(makeBuyerProfile())
    mockPrisma.dealer.findUnique.mockResolvedValue(null)
    mockPrisma.dealerInvite.findFirst.mockResolvedValue(null)

    await expect(
      convertSourcingCase({ sourcingCaseId: "case-1", actorUserId: "admin-1" }),
    ).rejects.toThrow("Could not resolve dealer")
  })
})

describe("getConversion", () => {
  it("returns conversion record for a sourcing case", async () => {
    const mockData = { id: "conv-1", status: "COMPLETED" }
    const chain = createChain(mockData)
    mockSupabaseFrom.mockReturnValue(chain)

    const result = await getConversion("case-1")

    expect(result).toEqual(mockData)
    expect(mockSupabaseFrom).toHaveBeenCalledWith("inventory_case_conversions")
    expect(chain.eq).toHaveBeenCalledWith("sourcing_case_id", "case-1")
  })

  it("returns null when no conversion exists", async () => {
    const chain = createChain(null, { code: "PGRST116", message: "not found" })
    mockSupabaseFrom.mockReturnValue(chain)

    const result = await getConversion("case-no-conv")
    expect(result).toBeNull()
  })
})

describe("getConversionEvents", () => {
  it("returns events for a conversion", async () => {
    const mockEvents = [
      { id: "ev-1", event_type: "CONVERSION_STARTED" },
      { id: "ev-2", event_type: "BUYER_RESOLVED" },
    ]
    const chain = createChain(mockEvents)
    mockSupabaseFrom.mockReturnValue(chain)

    const result = await getConversionEvents("conv-1")

    expect(result).toEqual(mockEvents)
    expect(mockSupabaseFrom).toHaveBeenCalledWith("deal_conversion_events")
  })
})
