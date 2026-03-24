import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the DB BEFORE importing the service
vi.mock("@/lib/db", () => ({
  prisma: {
    selectedDeal: {
      findFirst: vi.fn(),
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
  },
}))

import { prisma } from "@/lib/db"
import { dealContextService, type DealContext } from "@/lib/services/deal-context.service"

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Deal context resolver — auction deals
// ---------------------------------------------------------------------------
describe("resolveDealContextForBuyer — AUCTION deals", () => {
  const auctionDeal = {
    id: "deal-a1",
    workspaceId: "ws-1",
    buyerId: "bp-1",
    dealerId: "dealer-1",
    status: "SELECTED",
    auctionId: "auction-1",
    offerId: "offer-1",
    inventoryItemId: "inv-1",
    sourcingCaseId: null,
    sourcedOfferId: null,
    cashOtd: 35000,
    taxAmount: 2500,
    feesBreakdown: { docFee: 300 },
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-02"),
  }

  it("resolves an AUCTION deal with full vehicle/dealer context", async () => {
    vi.mocked(prisma.selectedDeal.findFirst).mockResolvedValue(auctionDeal as never)
    vi.mocked(prisma.auctionOffer.findUnique).mockResolvedValue({
      id: "offer-1",
      dealer: { id: "dealer-1", businessName: "Acme Motors" },
      inventoryItem: {
        mileage: 15000,
        condition: "USED",
        vin: "1HGCM82633A004352",
        year: 2022,
        make: "Honda",
        model: "Accord",
        trim: "EX-L",
      },
    } as never)

    vi.mocked(prisma.dealer.findUnique).mockResolvedValue({
      id: "dealer-1",
      businessName: "Acme Motors",
      address: "123 Main St",
      city: "Los Angeles",
      state: "CA",
      zip: "90001",
      phone: "555-1234",
      email: "acme@test.com",
    } as never)

    const ctx = await dealContextService.resolveDealContextForBuyer("bp-1", "deal-a1")

    expect(ctx).not.toBeNull()
    expect(ctx!.source).toBe("AUCTION")
    expect(ctx!.dealId).toBe("deal-a1")
    expect(ctx!.vehicle.make).toBe("Honda")
    expect(ctx!.vehicle.model).toBe("Accord")
    expect(ctx!.vehicle.vin).toBe("1HGCM82633A004352")
    expect(ctx!.dealerName).toBe("Acme Motors")
    expect(ctx!.dealer.businessName).toBe("Acme Motors")
    expect(ctx!.dealer.city).toBe("Los Angeles")
    expect(ctx!.dealer.state).toBe("CA")
    expect(ctx!.pricing.cashOtdCents).toBe(3500000)
    expect(ctx!.pricing.taxesCents).toBe(250000)
    expect(ctx!.references.auctionId).toBe("auction-1")
    expect(ctx!.references.offerId).toBe("offer-1")
    expect(ctx!.references.sourcingCaseId).toBeNull()
    expect(ctx!.references.sourcedOfferId).toBeNull()
  })

  it("returns null when deal not found", async () => {
    vi.mocked(prisma.selectedDeal.findFirst).mockResolvedValue(null as never)

    const ctx = await dealContextService.resolveDealContextForBuyer("bp-1", "nonexistent")
    expect(ctx).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Deal context resolver — sourced deals
// ---------------------------------------------------------------------------
describe("resolveDealContextForBuyer — SOURCED deals", () => {
  const sourcedDeal = {
    id: "deal-s1",
    workspaceId: "ws-1",
    buyerId: "bp-2",
    dealerId: "dealer-2",
    status: "SELECTED",
    auctionId: null,
    offerId: null,
    inventoryItemId: null,
    sourcingCaseId: "case-1",
    sourcedOfferId: "soffer-1",
    cashOtd: 28000,
    taxAmount: 2000,
    feesBreakdown: { adminFee: 150 },
    createdAt: new Date("2025-02-01"),
    updatedAt: new Date("2025-02-02"),
  }

  it("resolves a SOURCED deal from SourcedOffer without touching Auction tables", async () => {
    vi.mocked(prisma.selectedDeal.findFirst).mockResolvedValue(sourcedDeal as never)
    vi.mocked(prisma.sourcedOffer.findUnique).mockResolvedValue({
      id: "soffer-1",
      vin: "2T1BURHE5FC123456",
      year: 2023,
      make: "Toyota",
      modelName: "Camry",
      trim: "SE",
      mileage: 5000,
      condition: "NEW",
      sourceDealerName: "Best Toyota",
      paymentTermsJson: { monthlyCents: 45000, apr: 3.9, termMonths: 60 },
    } as never)
    vi.mocked(prisma.dealer.findUnique).mockResolvedValue({
      id: "dealer-2",
      businessName: "Best Toyota",
      address: "456 Auto Blvd",
      city: "Dallas",
      state: "TX",
      zip: "75201",
      phone: "555-5678",
      email: "best@test.com",
    } as never)

    const ctx = await dealContextService.resolveDealContextForBuyer("bp-2", "deal-s1")

    expect(ctx).not.toBeNull()
    expect(ctx!.source).toBe("SOURCED")
    expect(ctx!.vehicle.make).toBe("Toyota")
    expect(ctx!.vehicle.model).toBe("Camry")
    expect(ctx!.vehicle.vin).toBe("2T1BURHE5FC123456")
    expect(ctx!.dealerName).toBe("Best Toyota")
    expect(ctx!.dealer.businessName).toBe("Best Toyota")
    expect(ctx!.dealer.city).toBe("Dallas")
    expect(ctx!.dealer.state).toBe("TX")
    expect(ctx!.pricing.cashOtdCents).toBe(2800000)
    expect(ctx!.pricing.monthlyCents).toBe(45000)
    expect(ctx!.pricing.apr).toBe(3.9)
    expect(ctx!.references.auctionId).toBeNull()
    expect(ctx!.references.offerId).toBeNull()
    expect(ctx!.references.inventoryItemId).toBeNull()
    expect(ctx!.references.sourcingCaseId).toBe("case-1")
    expect(ctx!.references.sourcedOfferId).toBe("soffer-1")

    // CRITICAL: Auction tables must NOT be queried for sourced deals
    expect(prisma.auctionOffer.findUnique).not.toHaveBeenCalled()
  })

  it("resolves for dealer with resolveDealContextForDealer", async () => {
    vi.mocked(prisma.selectedDeal.findFirst).mockResolvedValue(sourcedDeal as never)
    vi.mocked(prisma.sourcedOffer.findUnique).mockResolvedValue({
      id: "soffer-1",
      vin: null,
      year: 2023,
      make: "Toyota",
      modelName: "Camry",
      trim: null,
      mileage: null,
      condition: null,
      sourceDealerName: null,
      paymentTermsJson: null,
    } as never)
    vi.mocked(prisma.dealer.findUnique).mockResolvedValue({
      id: "dealer-2",
      businessName: "Fallback Motors",
    } as never)

    const ctx = await dealContextService.resolveDealContextForDealer("dealer-2", "deal-s1")
    expect(ctx).not.toBeNull()
    expect(ctx!.dealerName).toBe("Fallback Motors")
    expect(ctx!.source).toBe("SOURCED")
  })
})

// ---------------------------------------------------------------------------
// Regression: ensure auction pipeline is unchanged
// ---------------------------------------------------------------------------
describe("AUCTION pipeline regression", () => {
  it("auction deal context returns identical data structure to what pages expect", async () => {
    const deal = {
      id: "deal-reg",
      workspaceId: "ws-1",
      buyerId: "bp-reg",
      dealerId: "dealer-reg",
      status: "FEE_PAID",
      auctionId: "auc-reg",
      offerId: "off-reg",
      inventoryItemId: "inv-reg",
      sourcingCaseId: null,
      sourcedOfferId: null,
      cashOtd: 40000,
      taxAmount: 3000,
      feesBreakdown: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(prisma.selectedDeal.findFirst).mockResolvedValue(deal as never)
    vi.mocked(prisma.auctionOffer.findUnique).mockResolvedValue({
      id: "off-reg",
      dealer: { id: "dealer-reg", businessName: "Reg Dealer" },
      inventoryItem: {
        mileage: 10000,
        condition: "USED",
        vin: "VIN123", year: 2021, make: "Ford", model: "F-150", trim: "XLT",
      },
    } as never)

    vi.mocked(prisma.dealer.findUnique).mockResolvedValue({
      id: "dealer-reg",
      businessName: "Reg Dealer",
      address: "789 Test Rd",
      city: "Chicago",
      state: "IL",
      zip: "60601",
      phone: null,
      email: null,
    } as never)

    const ctx = await dealContextService.resolveDealContextForBuyer("bp-reg", "deal-reg")

    // All expected fields populated
    expect(ctx!.source).toBe("AUCTION")
    expect(ctx!.references.auctionId).toBe("auc-reg")
    expect(ctx!.references.offerId).toBe("off-reg")
    expect(ctx!.references.inventoryItemId).toBe("inv-reg")
    expect(ctx!.vehicle.year).toBe(2021)
    expect(ctx!.vehicle.make).toBe("Ford")
    expect(ctx!.dealerName).toBe("Reg Dealer")
    expect(ctx!.dealer.businessName).toBe("Reg Dealer")
    expect(ctx!.dealer.city).toBe("Chicago")
    expect(ctx!.pricing.cashOtdCents).toBe(4000000)
  })
})
