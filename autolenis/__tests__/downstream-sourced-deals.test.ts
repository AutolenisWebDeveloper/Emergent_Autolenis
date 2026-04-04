import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Downstream pipeline compatibility tests for SOURCED deals
// Verifies InsuranceService + DealService handle sourced deals correctly
// ---------------------------------------------------------------------------

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    selectedDeal: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    sourcedOffer: {
      findUnique: vi.fn(),
    },
    auctionOffer: {
      findUnique: vi.fn(),
    },
    dealer: {
      findUnique: vi.fn(),
    },
    buyerProfile: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    insuranceQuote: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    insurancePolicy: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    financingOffer: {
      updateMany: vi.fn(),
    },
    externalPreApprovalSubmission: {
      findFirst: vi.fn(),
    },
    feeFinancingDisclosure: {
      findFirst: vi.fn(),
    },
    depositPayment: {
      findFirst: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
  },
}))

// Mock PaymentService to avoid cascading deps
vi.mock("@/lib/services/payment.service", () => ({
  PaymentService: {
    getFeeOptions: vi.fn().mockResolvedValue({ options: [] }),
  },
}))

import { prisma } from "@/lib/db"

// Sourced deal fixtures
const SOURCED_DEAL = {
  id: "deal-sourced-1",
  workspaceId: "ws-1",
  buyerId: "bp-1",
  dealerId: "dealer-1",
  user_id: "user-1",
  status: "SELECTED",
  auctionId: null,
  offerId: null,
  inventoryItemId: null,
  sourcingCaseId: "case-1",
  sourcedOfferId: "soffer-1",
  cashOtd: 30000,
  taxAmount: 2500,
  total_otd_amount_cents: 3250000,
  totalOtdAmountCents: 3250000,
  feesBreakdown: { docFee: 500 },
  payment_type: "CASH",
  concierge_fee_method: null,
  concierge_fee_status: null,
  insurance_status: "NOT_SELECTED",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-02"),
  auctionOffer: null,
  inventoryItem: null,
  dealer: { id: "dealer-1", businessName: "Sourced Auto" },
  buyer: { id: "bp-1", user: { firstName: "John", first_name: "John", lastName: "Doe", last_name: "Doe", email: "john@test.com", phone: "555-0001" } },
  financingOffers: [],
  insurancePolicy: null,
  serviceFeePayment: null,
  contractDocuments: [],
  esignEnvelope: null,
  pickupAppointment: null,
}

const SOURCED_OFFER = {
  id: "soffer-1",
  vin: "1HGCM82633A999999",
  year: 2024,
  make: "Honda",
  modelName: "Civic",
  trim: "Sport",
  mileage: 100,
  condition: "NEW",
  sourceDealerName: "Sourced Auto",
  paymentTermsJson: { monthlyCents: 45000, apr: 4.5, termMonths: 60 },
  pricingBreakdownJson: { cashOtd: 3000000, taxes: 250000, fees: 50000 },
}

const DEALER_RECORD = {
  id: "dealer-1",
  businessName: "Sourced Auto",
  address: "123 Main St",
  city: "Houston",
  state: "TX",
  zip: "77001",
  phone: "555-1234",
  email: "dealer@test.com",
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// DealService.getSelectedDealForBuyer — sourced deal enrichment
// ---------------------------------------------------------------------------
describe("DealService.getSelectedDealForBuyer — sourced deals", () => {
  it("enriches sourced deal with sourcedDealContext", async () => {
    // Dynamic import to get mocked version
    const { DealService } = await import("@/lib/services/deal.service")

    vi.mocked(prisma.buyerProfile.findUnique).mockResolvedValue({ id: "bp-1", userId: "user-1" } as any)
    vi.mocked(prisma.selectedDeal.findUnique).mockResolvedValue(SOURCED_DEAL as any)
    vi.mocked(prisma.externalPreApprovalSubmission.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.feeFinancingDisclosure.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.depositPayment.findFirst).mockResolvedValue(null)

    // DealContext resolver mocks (called inside getSelectedDealForBuyer)
    vi.mocked(prisma.selectedDeal.findFirst).mockResolvedValue(SOURCED_DEAL as any)
    vi.mocked(prisma.sourcedOffer.findUnique).mockResolvedValue(SOURCED_OFFER as any)
    vi.mocked(prisma.dealer.findUnique).mockResolvedValue(DEALER_RECORD as any)

    const result = await DealService.getSelectedDealForBuyer("user-1", "deal-sourced-1")

    // Must include sourcedDealContext
    expect(result.deal.sourcedDealContext).toBeDefined()
    expect(result.deal.sourcedDealContext.source).toBe("SOURCED")
    expect(result.deal.sourcedDealContext.vehicle.make).toBe("Honda")
    expect(result.deal.sourcedDealContext.vehicle.model).toBe("Civic")
    expect(result.deal.sourcedDealContext.dealer.businessName).toBe("Sourced Auto")
    expect(result.deal.sourcedDealContext.dealer.city).toBe("Houston")

    // Must NOT query AuctionOffer for sourced deals
    expect(prisma.auctionOffer.findUnique).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// DealService.getDealForDealer — sourced deal vehicle resolution
// ---------------------------------------------------------------------------
describe("DealService.getDealForDealer — sourced deals", () => {
  it("returns vehicle info for sourced deals from DealContext", async () => {
    const { DealService } = await import("@/lib/services/deal.service")

    vi.mocked(prisma.selectedDeal.findUnique).mockResolvedValue(SOURCED_DEAL as any)
    // DealContext resolver mocks
    vi.mocked(prisma.selectedDeal.findFirst).mockResolvedValue(SOURCED_DEAL as any)
    vi.mocked(prisma.sourcedOffer.findUnique).mockResolvedValue(SOURCED_OFFER as any)
    vi.mocked(prisma.dealer.findUnique).mockResolvedValue(DEALER_RECORD as any)

    const result = await DealService.getDealForDealer("dealer-1", "deal-sourced-1")

    expect(result.vehicle).toBeDefined()
    expect(result.vehicle.year).toBe(2024)
    expect(result.vehicle.make).toBe("Honda")
    expect(result.vehicle.model).toBe("Civic")
    expect(result.vehicle.vin).toBe("1HGCM82633A999999")
  })
})

// ---------------------------------------------------------------------------
// InsuranceService.getInsuranceOverview — sourced deal (no auctionOffer needed)
// ---------------------------------------------------------------------------
describe("InsuranceService — sourced deals", () => {
  it("getInsuranceOverview works for sourced deals (no AuctionOffer required)", async () => {
    const { InsuranceService } = await import("@/lib/services/insurance.service")

    vi.mocked(prisma.selectedDeal.findFirst).mockResolvedValue({
      ...SOURCED_DEAL,
      insurancePolicy: null,
    } as any)
    vi.mocked(prisma.insuranceQuote.findMany).mockResolvedValue([])
    vi.mocked(prisma.insurancePolicy.findMany).mockResolvedValue([])

    const result = await InsuranceService.getInsuranceOverview("user-1", "deal-sourced-1")

    expect(result.selectedDeal.id).toBe("deal-sourced-1")
    expect(result.selectedDeal.insuranceStatus).toBe("NOT_SELECTED")
    expect(result.quotes).toEqual([])
    expect(result.policies).toEqual([])
  })

  it("requestQuotes resolves vehicle from DealContext for sourced deals", async () => {
    const { InsuranceService } = await import("@/lib/services/insurance.service")

    // requestQuotes includes auctionOffer join — returns null for sourced deals
    const dealWithJoin = {
      ...SOURCED_DEAL,
      auctionOffer: null, // sourced deal: no auction offer
    }
    vi.mocked(prisma.selectedDeal.findFirst).mockResolvedValue(dealWithJoin as any)
    vi.mocked(prisma.buyerProfile.findFirst).mockResolvedValue({
      firstName: "John",
      lastName: "Doe",
      date_of_birth: new Date("1990-01-01"),
      dateOfBirth: new Date("1990-01-01"),
      address_line1: "123 Test St",
      address: "123 Test St",
      address_line2: null,
      addressLine2: null,
      city: "Houston",
      state: "TX",
      postal_code: "77001",
      postalCode: "77001",
      zip: "77001",
      phone: "555-1234",
    } as any)

    // DealContext mocks for vehicle resolution
    vi.mocked(prisma.sourcedOffer.findUnique).mockResolvedValue(SOURCED_OFFER as any)
    vi.mocked(prisma.dealer.findUnique).mockResolvedValue(DEALER_RECORD as any)

    // Provider returns empty quotes (default provider behavior)
    const result = await InsuranceService.requestQuotes("user-1", "deal-sourced-1")
    expect(result).toEqual([])

    // Verify DealContext was used (sourcedOffer queried, not auctionOffer)
    expect(prisma.sourcedOffer.findUnique).toHaveBeenCalled()
  })

  it("bindPolicy works for sourced deals (no AuctionOffer join)", async () => {
    const { InsuranceService } = await import("@/lib/services/insurance.service")

    // bindPolicy only needs deal existence + quote — no AuctionOffer join
    vi.mocked(prisma.selectedDeal.findFirst).mockResolvedValue(SOURCED_DEAL as any)
    vi.mocked(prisma.insuranceQuote.findUnique).mockResolvedValue({
      id: "quote-1",
      buyerId: "user-1",
      vehicleId: "vehicle-1",
      carrier: "TestCarrier",
      coverageType: "FULL",
      monthlyPremium: 150.00,
      sixMonthPremium: 900.00,
      coverageLimits: {},
      deductibles: {},
      expiresAt: new Date("2027-12-31"),
      productName: "FULL",
      coverageJson: null,
      workspaceId: null,
      createdAt: new Date(),
    } as any)
    vi.mocked(prisma.buyerProfile.findFirst).mockResolvedValue({
      userId: "user-1",
      firstName: "John",
      lastName: "Doe",
      date_of_birth: new Date("1990-01-01"),
      address_line1: "123 Main St",
      address: "123 Main St",
      city: "Houston",
      state: "TX",
      postal_code: "77001",
      zip: "77001",
    } as any)
    vi.mocked(prisma.insurancePolicy.create).mockResolvedValue({
      id: "policy-1",
      policyNumber: "POL-001",
      carrier: "TestCarrier",
      start_date: new Date("2026-03-01"),
      end_date: new Date("2027-03-01"),
      documentUrl: "https://example.com/policy.pdf",
    } as any)
    vi.mocked(prisma.insuranceQuote.update).mockResolvedValue({} as any)
    vi.mocked(prisma.selectedDeal.update).mockResolvedValue({} as any)
    vi.mocked(prisma.insurancePolicy.findFirst).mockResolvedValue(null)

    // bindPolicy will throw because the default provider returns an error,
    // but the key assertion is that it reaches the provider call WITHOUT
    // requiring AuctionOffer/InventoryItem joins (which would crash for sourced deals).
    await expect(
      InsuranceService.bindPolicy("user-1", "deal-sourced-1", "quote-1", new Date("2026-03-01"))
    ).rejects.toThrow("Failed to bind policy")

    // Verify NO AuctionOffer query was made (the include was removed)
    expect(prisma.auctionOffer.findUnique).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Non-regression: AUCTION deals remain unaffected
// ---------------------------------------------------------------------------
describe("Non-regression: AUCTION pipeline", () => {
  const AUCTION_DEAL = {
    id: "deal-auction-1",
    workspaceId: "ws-1",
    buyerId: "bp-2",
    dealerId: "dealer-2",
    user_id: "user-2",
    status: "FEE_PAID",
    auctionId: "auction-1",
    offerId: "offer-1",
    inventoryItemId: "inv-1",
    sourcingCaseId: null,
    sourcedOfferId: null,
    cashOtd: 40000,
    taxAmount: 3000,
    total_otd_amount_cents: 4300000,
    totalOtdAmountCents: 4300000,
    feesBreakdown: {},
    payment_type: "CASH",
    concierge_fee_method: null,
    concierge_fee_status: null,
    insurance_status: "NOT_SELECTED",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-02"),
    auctionOffer: { id: "offer-1", financingOptions: [] },
    inventoryItem: { id: "inv-1", year: 2023, make: "Toyota", model: "Camry", vin: "VIN123" },
    dealer: { id: "dealer-2", businessName: "Auction Dealer" },
    buyer: { id: "bp-2", user: { firstName: "Jane", first_name: "Jane", lastName: "Smith", last_name: "Smith", email: "jane@test.com", phone: "555-0002" } },
    financingOffers: [],
    insurancePolicy: null,
    serviceFeePayment: null,
    contractDocuments: [],
    esignEnvelope: null,
    pickupAppointment: null,
  }

  it("DealService.getSelectedDealForBuyer returns deal WITHOUT sourcedDealContext for auction deals", async () => {
    const { DealService } = await import("@/lib/services/deal.service")

    vi.mocked(prisma.buyerProfile.findUnique).mockResolvedValue({ id: "bp-2", userId: "user-2" } as any)
    vi.mocked(prisma.selectedDeal.findUnique).mockResolvedValue(AUCTION_DEAL as any)
    vi.mocked(prisma.externalPreApprovalSubmission.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.feeFinancingDisclosure.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.depositPayment.findFirst).mockResolvedValue(null)

    const result = await DealService.getSelectedDealForBuyer("user-2", "deal-auction-1")

    // Auction deal does NOT have sourcedDealContext
    expect(result.deal.sourcedDealContext).toBeUndefined()
    // Auction deal retains its inventoryItem and auctionOffer
    expect(result.deal.inventoryItem).toBeDefined()
    expect(result.deal.auctionOffer).toBeDefined()
  })

  it("DealService.getDealForDealer returns vehicle from inventoryItem for auction deals", async () => {
    const { DealService } = await import("@/lib/services/deal.service")

    vi.mocked(prisma.selectedDeal.findUnique).mockResolvedValue(AUCTION_DEAL as any)

    const result = await DealService.getDealForDealer("dealer-2", "deal-auction-1")

    expect(result.vehicle).toBeDefined()
    expect(result.vehicle.year).toBe(2023)
    expect(result.vehicle.make).toBe("Toyota")
    expect(result.vehicle.model).toBe("Camry")
  })
})
