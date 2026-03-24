import { describe, it, expect, vi, beforeEach } from "vitest"
import { createHash } from "node:crypto"

// Mock the DB BEFORE importing the service
vi.mock("@/lib/db", () => ({
  prisma: {
    dealer: { count: vi.fn(), findFirst: vi.fn() },
    dealerCoverageGapSignal: { create: vi.fn() },
    vehicleRequestCase: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    sourcingOutreachLog: { create: vi.fn() },
    sourcedOffer: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    dealerInvite: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    caseEventLog: { create: vi.fn() },
    selectedDeal: { create: vi.fn() },
    buyerProfile: { findFirst: vi.fn(), findUnique: vi.fn() },
  },
}))

import { prisma } from "@/lib/db"
import {
  SourcingService,
  BuyerCaseStatus,
  AdminSubStatus,
  SourcedOfferStatus,
  DealerInviteStatus,
  OfferSourceType,
} from "@/lib/services/sourcing.service"
import type { CreateCaseInput, CreateCaseItemInput } from "@/lib/services/sourcing.service"

const service = new SourcingService()

function makeItem(overrides: Partial<CreateCaseItemInput> = {}): CreateCaseItemInput {
  return {
    vehicleType: "SUV",
    condition: "NEW",
    yearMin: 2023,
    yearMax: 2025,
    make: "Toyota",
    budgetType: "TOTAL_PRICE",
    budgetTargetCents: 0,
    maxTotalOtdBudgetCents: 3500000,
    desiredDownPaymentCents: 500000,
    ...overrides,
  }
}

function makeCaseInput(itemCount = 1): CreateCaseInput {
  return {
    marketZip: "90210",
    radiusMiles: 50,
    items: Array.from({ length: itemCount }, () => makeItem()),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// 1. BuyerCaseStatus enum tests
// ---------------------------------------------------------------------------
describe("BuyerCaseStatus enum", () => {
  it("has all expected values", () => {
    expect(BuyerCaseStatus.DRAFT).toBe("DRAFT")
    expect(BuyerCaseStatus.SUBMITTED).toBe("SUBMITTED")
    expect(BuyerCaseStatus.SOURCING).toBe("SOURCING")
    expect(BuyerCaseStatus.OFFERS_AVAILABLE).toBe("OFFERS_AVAILABLE")
    expect(BuyerCaseStatus.OFFER_SELECTED).toBe("OFFER_SELECTED")
    expect(BuyerCaseStatus.DEALER_INVITED).toBe("DEALER_INVITED")
    expect(BuyerCaseStatus.IN_PLATFORM_TRANSACTION).toBe("IN_PLATFORM_TRANSACTION")
    expect(BuyerCaseStatus.CLOSED_WON).toBe("CLOSED_WON")
    expect(BuyerCaseStatus.CLOSED_LOST).toBe("CLOSED_LOST")
    expect(BuyerCaseStatus.CLOSED_CANCELLED).toBe("CLOSED_CANCELLED")
  })

  it("has exactly 10 status values", () => {
    expect(Object.keys(BuyerCaseStatus)).toHaveLength(10)
  })
})

// ---------------------------------------------------------------------------
// 2. Max 3 items enforcement
// ---------------------------------------------------------------------------
describe("createCase – item count enforcement", () => {
  const buyerId = "buyer-1"

  it("creates a case with 1 item", async () => {
    const mockCase = { id: "case-1", status: "DRAFT", items: [{ id: "item-1" }] }
    vi.mocked(prisma.vehicleRequestCase.create).mockResolvedValue(mockCase as never)

    const result = await service.createCase(buyerId, makeCaseInput(1))
    expect(result).toEqual(mockCase)
    expect(prisma.vehicleRequestCase.create).toHaveBeenCalledOnce()
  })

  it("creates a case with 3 items (max)", async () => {
    const mockCase = { id: "case-2", status: "DRAFT", items: [{}, {}, {}] }
    vi.mocked(prisma.vehicleRequestCase.create).mockResolvedValue(mockCase as never)

    const result = await service.createCase(buyerId, makeCaseInput(3))
    expect(result).toEqual(mockCase)
  })

  it("throws when 4 items are provided", async () => {
    await expect(service.createCase(buyerId, makeCaseInput(4))).rejects.toThrow(
      "Maximum 3 items per case",
    )
    expect(prisma.vehicleRequestCase.create).not.toHaveBeenCalled()
  })

  it("throws when 0 items are provided", async () => {
    await expect(
      service.createCase(buyerId, { marketZip: "90210", items: [] }),
    ).rejects.toThrow("At least one vehicle request item is required")
    expect(prisma.vehicleRequestCase.create).not.toHaveBeenCalled()
  })

  it("passes workspaceId to prisma when provided", async () => {
    const mockCase = { id: "case-ws", status: "DRAFT", items: [] }
    vi.mocked(prisma.vehicleRequestCase.create).mockResolvedValue(mockCase as never)

    await service.createCase(buyerId, makeCaseInput(1), "ws-1")

    const callArg = vi.mocked(prisma.vehicleRequestCase.create).mock.calls[0][0] as {
      data: Record<string, unknown>
    }
    expect(callArg.data.workspaceId).toBe("ws-1")
  })

  it("stores buyerLocationJson when location is provided", async () => {
    const mockCase = { id: "case-loc", status: "DRAFT", items: [] }
    vi.mocked(prisma.vehicleRequestCase.create).mockResolvedValue(mockCase as never)

    const input: CreateCaseInput = {
      ...makeCaseInput(1),
      location: { state: "CA", zip: "90210", city: "Beverly Hills" },
    }
    await service.createCase(buyerId, input)

    const callArg = vi.mocked(prisma.vehicleRequestCase.create).mock.calls[0][0] as {
      data: Record<string, unknown>
    }
    expect(callArg.data.buyerLocationJson).toEqual({ state: "CA", zip: "90210", city: "Beverly Hills" })
  })

  it("omits buyerLocationJson when location is not provided", async () => {
    const mockCase = { id: "case-noloc", status: "DRAFT", items: [] }
    vi.mocked(prisma.vehicleRequestCase.create).mockResolvedValue(mockCase as never)

    await service.createCase(buyerId, makeCaseInput(1))

    const callArg = vi.mocked(prisma.vehicleRequestCase.create).mock.calls[0][0] as {
      data: Record<string, unknown>
    }
    expect(callArg.data.buyerLocationJson).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 3. Status transition validation
// ---------------------------------------------------------------------------
describe("Status transition validation", () => {
  const buyerId = "buyer-1"
  const caseId = "case-1"
  const adminId = "admin-1"

  function mockExistingCase(status: string) {
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: caseId,
      buyerId,
      status,
    } as never)
    vi.mocked(prisma.vehicleRequestCase.findUnique).mockResolvedValue({
      id: caseId,
      buyerId,
      status,
      assignedAdminUserId: null,
      firstAdminActionAt: null,
    } as never)
  }

  describe("submitCase (DRAFT → SUBMITTED)", () => {
    it("succeeds from DRAFT", async () => {
      mockExistingCase("DRAFT")
      const updated = { id: caseId, status: "SUBMITTED", items: [] }
      vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue(updated as never)
      vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

      const result = await service.submitCase(caseId, buyerId)
      expect(result.status).toBe("SUBMITTED")
    })

    it("fails from SOURCING", async () => {
      mockExistingCase("SOURCING")

      await expect(service.submitCase(caseId, buyerId)).rejects.toThrow(
        "Invalid status transition: SOURCING → SUBMITTED",
      )
    })
  })

  describe("updateCaseStatus", () => {
    it("SUBMITTED → SOURCING (valid)", async () => {
      mockExistingCase("SUBMITTED")
      vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({
        id: caseId,
        status: "SOURCING",
      } as never)
      vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

      const result = await service.updateCaseStatus(
        caseId,
        BuyerCaseStatus.SOURCING,
        undefined,
        adminId,
        "ADMIN",
      )
      expect(result.status).toBe("SOURCING")
    })

    it("SOURCING → OFFERS_AVAILABLE (valid)", async () => {
      mockExistingCase("SOURCING")
      vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({
        id: caseId,
        status: "OFFERS_AVAILABLE",
      } as never)
      vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

      const result = await service.updateCaseStatus(
        caseId,
        BuyerCaseStatus.OFFERS_AVAILABLE,
        undefined,
        adminId,
        "ADMIN",
      )
      expect(result.status).toBe("OFFERS_AVAILABLE")
    })

    it("DRAFT → SOURCING (invalid)", async () => {
      mockExistingCase("DRAFT")

      await expect(
        service.updateCaseStatus(caseId, BuyerCaseStatus.SOURCING, undefined, adminId, "ADMIN"),
      ).rejects.toThrow("Invalid status transition: DRAFT → SOURCING")
    })

    it("CLOSED_WON → SUBMITTED (invalid, terminal)", async () => {
      mockExistingCase("CLOSED_WON")

      await expect(
        service.updateCaseStatus(caseId, BuyerCaseStatus.SUBMITTED, undefined, adminId, "ADMIN"),
      ).rejects.toThrow("Invalid status transition: CLOSED_WON → SUBMITTED")
    })

    it("CLOSED_LOST → SOURCING (invalid, terminal)", async () => {
      mockExistingCase("CLOSED_LOST")

      await expect(
        service.updateCaseStatus(caseId, BuyerCaseStatus.SOURCING, undefined, adminId, "ADMIN"),
      ).rejects.toThrow("Invalid status transition: CLOSED_LOST → SOURCING")
    })

    it("CLOSED_CANCELLED → DRAFT (invalid, terminal)", async () => {
      mockExistingCase("CLOSED_CANCELLED")

      await expect(
        service.updateCaseStatus(caseId, BuyerCaseStatus.DRAFT, undefined, adminId, "ADMIN"),
      ).rejects.toThrow("Invalid status transition: CLOSED_CANCELLED → DRAFT")
    })

    it("sets closedAt when transitioning to a closed status", async () => {
      mockExistingCase("SOURCING")
      vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({
        id: caseId,
        status: "CLOSED_LOST",
      } as never)
      vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

      await service.updateCaseStatus(
        caseId,
        BuyerCaseStatus.CLOSED_LOST,
        undefined,
        adminId,
        "ADMIN",
      )

      const updateArg = vi.mocked(prisma.vehicleRequestCase.update).mock.calls[0][0] as {
        data: Record<string, unknown>
      }
      expect(updateArg.data.closedAt).toBeInstanceOf(Date)
    })

    it("case not found throws", async () => {
      vi.mocked(prisma.vehicleRequestCase.findUnique).mockResolvedValue(null as never)

      await expect(
        service.updateCaseStatus(caseId, BuyerCaseStatus.SOURCING, undefined, adminId, "ADMIN"),
      ).rejects.toThrow("Case not found")
    })
  })

  describe("cancelCase", () => {
    it("allows cancel from DRAFT", async () => {
      mockExistingCase("DRAFT")
      vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({
        id: caseId,
        status: "CLOSED_CANCELLED",
      } as never)
      vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

      const result = await service.cancelCase(caseId, buyerId)
      expect(result.status).toBe("CLOSED_CANCELLED")
    })

    it("rejects cancel from CLOSED_WON", async () => {
      mockExistingCase("CLOSED_WON")

      await expect(service.cancelCase(caseId, buyerId)).rejects.toThrow(
        "Invalid status transition: CLOSED_WON → CLOSED_CANCELLED",
      )
    })
  })
})

// ---------------------------------------------------------------------------
// 4. Dealer invite token generation & verification
// ---------------------------------------------------------------------------
describe("Dealer invite tokens", () => {
  const caseId = "case-1"
  const offerId = "offer-1"
  const adminId = "admin-1"

  beforeEach(() => {
    vi.mocked(prisma.vehicleRequestCase.findUnique).mockResolvedValue({
      id: caseId,
      status: "OFFER_SELECTED",
    } as never)
    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({} as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)
  })

  it("stores a hashed token, not the raw token", async () => {
    vi.mocked(prisma.dealerInvite.create).mockImplementation(((args: {
      data: { tokenHash: string }
    }) => {
      // The stored tokenHash should be a 64-char hex sha256 hash
      expect(args.data.tokenHash).toMatch(/^[a-f0-9]{64}$/)
      return Promise.resolve({ id: "invite-1", ...args.data })
    }) as never)

    const { rawToken, invite } = await service.createDealerInvite(
      caseId,
      offerId,
      "dealer@test.com",
      "Test Dealer",
      adminId,
    )

    // rawToken is a 64-char hex string (32 bytes)
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/)
    // tokenHash stored is NOT the raw token
    expect(invite.tokenHash).not.toBe(rawToken)
  })

  it("claimDealerInvite finds by hash of provided token", async () => {
    const fakeRaw = "a".repeat(64)
    const expectedHash = createHash("sha256").update(fakeRaw).digest("hex")

    vi.mocked(prisma.dealerInvite.findUnique).mockResolvedValue({
      id: "invite-1",
      tokenHash: expectedHash,
      tokenExpiresAt: new Date(Date.now() + 86400000),
      status: "SENT",
    } as never)
    vi.mocked(prisma.dealerInvite.update).mockResolvedValue({
      id: "invite-1",
      status: "CLAIMED",
    } as never)

    const result = await service.claimDealerInvite(fakeRaw)
    expect(result.status).toBe("CLAIMED")
    expect(prisma.dealerInvite.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: expectedHash },
    })
  })

  it("rejects expired token", async () => {
    const fakeRaw = "b".repeat(64)
    const hash = createHash("sha256").update(fakeRaw).digest("hex")

    vi.mocked(prisma.dealerInvite.findUnique).mockResolvedValue({
      id: "invite-2",
      tokenHash: hash,
      tokenExpiresAt: new Date(Date.now() - 1000), // expired
      status: "SENT",
    } as never)

    await expect(service.claimDealerInvite(fakeRaw)).rejects.toThrow(
      "Invite token has expired",
    )
  })

  it("rejects invalid (non-existent) token", async () => {
    vi.mocked(prisma.dealerInvite.findUnique).mockResolvedValue(null as never)

    await expect(service.claimDealerInvite("nonexistent")).rejects.toThrow(
      "Invalid invite token",
    )
  })

  it("rejects already-claimed token (single-use enforcement)", async () => {
    const fakeRaw = "c".repeat(64)
    const hash = createHash("sha256").update(fakeRaw).digest("hex")

    vi.mocked(prisma.dealerInvite.findUnique).mockResolvedValue({
      id: "invite-3",
      tokenHash: hash,
      tokenExpiresAt: new Date(Date.now() + 86400000),
      status: "CLAIMED", // already used
    } as never)

    await expect(service.claimDealerInvite(fakeRaw)).rejects.toThrow(
      "Invite has already been used",
    )
  })
})

// ---------------------------------------------------------------------------
// 4b. Validate dealer invite (read-only)
// ---------------------------------------------------------------------------
describe("validateDealerInvite", () => {
  it("validates a valid SENT token without mutating", async () => {
    const fakeRaw = "d".repeat(64)
    const expectedHash = createHash("sha256").update(fakeRaw).digest("hex")

    vi.mocked(prisma.dealerInvite.findUnique).mockResolvedValue({
      id: "invite-v1",
      tokenHash: expectedHash,
      tokenExpiresAt: new Date(Date.now() + 86400000),
      status: "SENT",
      dealerEmail: "dealer@test.com",
      dealerName: "Test Dealer",
      caseId: "case-v1",
    } as never)

    const result = await service.validateDealerInvite(fakeRaw)
    expect(result.id).toBe("invite-v1")
    expect(result.status).toBe("SENT")
    // Validate that update was NOT called (read-only)
    expect(prisma.dealerInvite.update).not.toHaveBeenCalled()
  })

  it("rejects already-claimed token on validate", async () => {
    const fakeRaw = "e".repeat(64)
    const hash = createHash("sha256").update(fakeRaw).digest("hex")

    vi.mocked(prisma.dealerInvite.findUnique).mockResolvedValue({
      id: "invite-v2",
      tokenHash: hash,
      tokenExpiresAt: new Date(Date.now() + 86400000),
      status: "CLAIMED",
    } as never)

    await expect(service.validateDealerInvite(fakeRaw)).rejects.toThrow(
      "Invite has already been used",
    )
  })
})

// ---------------------------------------------------------------------------
// 4c. Complete dealer invite → SelectedDeal creation
// ---------------------------------------------------------------------------
describe("completeDealerInvite", () => {
  it("creates SelectedDeal with proper sourcing FKs (no FK overloading)", async () => {
    const inviteId = "invite-comp-1"
    const dealerUserId = "dealer-user-1"

    vi.mocked(prisma.dealerInvite.findUnique).mockResolvedValue({
      id: inviteId,
      caseId: "case-comp-1",
      offerId: "offer-comp-1",
      status: "CLAIMED",
      offer: {
        id: "offer-comp-1",
        vin: "1HGCM82633A004352",
        year: 2024,
        make: "Honda",
        modelName: "Accord",
        pricingBreakdownJson: { cashOtdCents: 3500000, taxCents: 250000 },
      },
    } as never)

    vi.mocked(prisma.vehicleRequestCase.findUnique).mockResolvedValue({
      id: "case-comp-1",
      buyerId: "buyer-comp-1",
      workspaceId: "ws-1",
    } as never)

    vi.mocked(prisma.buyerProfile.findUnique).mockResolvedValue({
      id: "bp-1",
      userId: "buyer-comp-1",
    } as never)

    vi.mocked(prisma.dealer.findFirst).mockResolvedValue({
      id: "dealer-1",
      userId: dealerUserId,
    } as never)

    vi.mocked(prisma.dealerInvite.update).mockResolvedValue({
      id: inviteId,
      status: "COMPLETED",
    } as never)

    vi.mocked(prisma.selectedDeal.create).mockResolvedValue({
      id: "sd-1",
      buyerId: "bp-1",
      status: "SELECTED",
    } as never)

    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({} as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    const result = await service.completeDealerInvite(inviteId, dealerUserId)
    expect(result.selectedDealId).toBe("sd-1")

    // Verify proper FK fields are used
    const createCall = vi.mocked(prisma.selectedDeal.create).mock.calls[0][0]
    expect(createCall.data).toMatchObject({
      buyerId: "bp-1",
      dealerId: "dealer-1",
      status: "SELECTED",
      sourcingCaseId: "case-comp-1",
      sourcedOfferId: "offer-comp-1",
    })

    // Verify NO FK overloading: auctionId, offerId, inventoryItemId must NOT be set
    expect(createCall.data).not.toHaveProperty("auctionId")
    expect(createCall.data).not.toHaveProperty("offerId")
    expect(createCall.data).not.toHaveProperty("inventoryItemId")
  })

  it("rejects if invite is not yet claimed", async () => {
    vi.mocked(prisma.dealerInvite.findUnique).mockResolvedValue({
      id: "invite-unc",
      status: "SENT",
      offer: {},
    } as never)

    await expect(
      service.completeDealerInvite("invite-unc", "dealer-1"),
    ).rejects.toThrow("Invite must be claimed first")
  })
})

// ---------------------------------------------------------------------------
// 5. Offer acceptance
// ---------------------------------------------------------------------------
describe("acceptOffer", () => {
  const caseId = "case-1"
  const buyerId = "buyer-1"
  const offerId = "offer-1"
  const otherOfferId = "offer-2"

  it("succeeds with a PRESENTED offer", async () => {
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: caseId,
      buyerId,
      status: "OFFERS_AVAILABLE",
      offers: [
        { id: offerId, status: "PRESENTED" },
        { id: otherOfferId, status: "PRESENTED" },
      ],
    } as never)
    vi.mocked(prisma.sourcedOffer.update).mockResolvedValue({} as never)
    vi.mocked(prisma.sourcedOffer.updateMany).mockResolvedValue({ count: 1 } as never)
    const updatedCase = { id: caseId, status: "OFFER_SELECTED", lockedAt: new Date() }
    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue(updatedCase as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    const result = await service.acceptOffer(caseId, offerId, buyerId)
    expect(result.status).toBe("OFFER_SELECTED")
  })

  it("fails with a non-PRESENTED offer", async () => {
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: caseId,
      buyerId,
      status: "OFFERS_AVAILABLE",
      offers: [{ id: offerId, status: "DRAFT" }],
    } as never)

    await expect(service.acceptOffer(caseId, offerId, buyerId)).rejects.toThrow(
      "Only presented offers can be accepted",
    )
  })

  it("sets lockedAt on the case", async () => {
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: caseId,
      buyerId,
      status: "OFFERS_AVAILABLE",
      offers: [{ id: offerId, status: "PRESENTED" }],
    } as never)
    vi.mocked(prisma.sourcedOffer.update).mockResolvedValue({} as never)
    vi.mocked(prisma.sourcedOffer.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({
      id: caseId,
      status: "OFFER_SELECTED",
    } as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    await service.acceptOffer(caseId, offerId, buyerId)

    const updateArg = vi.mocked(prisma.vehicleRequestCase.update).mock.calls[0][0] as {
      data: Record<string, unknown>
    }
    expect(updateArg.data.lockedAt).toBeInstanceOf(Date)
    expect(updateArg.data.buyerResponseAt).toBeInstanceOf(Date)
  })

  it("declines other presented offers", async () => {
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: caseId,
      buyerId,
      status: "OFFERS_AVAILABLE",
      offers: [
        { id: offerId, status: "PRESENTED" },
        { id: otherOfferId, status: "PRESENTED" },
        { id: "offer-3", status: "DRAFT" },
      ],
    } as never)
    vi.mocked(prisma.sourcedOffer.update).mockResolvedValue({} as never)
    vi.mocked(prisma.sourcedOffer.updateMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({} as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    await service.acceptOffer(caseId, offerId, buyerId)

    expect(prisma.sourcedOffer.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [otherOfferId] } },
      data: { status: SourcedOfferStatus.DECLINED },
    })
  })

  it("creates an audit log entry", async () => {
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: caseId,
      buyerId,
      status: "OFFERS_AVAILABLE",
      offers: [{ id: offerId, status: "PRESENTED" }],
    } as never)
    vi.mocked(prisma.sourcedOffer.update).mockResolvedValue({} as never)
    vi.mocked(prisma.sourcedOffer.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({} as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    await service.acceptOffer(caseId, offerId, buyerId)

    expect(prisma.caseEventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        caseId,
        actorUserId: buyerId,
        actorRole: "BUYER",
        action: "OFFER_ACCEPTED",
        afterValue: offerId,
      }),
    })
  })

  it("throws when case not found", async () => {
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue(null as never)

    await expect(service.acceptOffer(caseId, offerId, buyerId)).rejects.toThrow(
      "Case not found",
    )
  })

  it("throws when offer not found for this case", async () => {
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: caseId,
      buyerId,
      status: "OFFERS_AVAILABLE",
      offers: [],
    } as never)

    await expect(service.acceptOffer(caseId, offerId, buyerId)).rejects.toThrow(
      "Offer not found for this case",
    )
  })
})

// ---------------------------------------------------------------------------
// 6. RBAC isolation tests
// ---------------------------------------------------------------------------
describe("RBAC isolation – buyer can only see own cases", () => {
  const buyerId = "buyer-1"
  const caseId = "case-1"

  it("getCaseForBuyer filters by buyerId", async () => {
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue(null as never)

    await service.getCaseForBuyer(caseId, buyerId)

    expect(prisma.vehicleRequestCase.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: caseId, buyerId },
      }),
    )
  })

  it("listCasesForBuyer filters by buyerId", async () => {
    vi.mocked(prisma.vehicleRequestCase.findMany).mockResolvedValue([] as never)

    await service.listCasesForBuyer(buyerId)

    expect(prisma.vehicleRequestCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { buyerId },
      }),
    )
  })

  it("listCasesForBuyer includes workspaceId when provided", async () => {
    vi.mocked(prisma.vehicleRequestCase.findMany).mockResolvedValue([] as never)

    await service.listCasesForBuyer(buyerId, "ws-1")

    expect(prisma.vehicleRequestCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { buyerId, workspaceId: "ws-1" },
      }),
    )
  })

  it("getOffersForBuyer only returns PRESENTED/ACCEPTED offers", async () => {
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: caseId,
      buyerId,
    } as never)
    vi.mocked(prisma.sourcedOffer.findMany).mockResolvedValue([] as never)

    await service.getOffersForBuyer(caseId, buyerId)

    expect(prisma.sourcedOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          caseId,
          buyerId,
          status: { in: [SourcedOfferStatus.PRESENTED, SourcedOfferStatus.ACCEPTED] },
        },
      }),
    )
  })

  it("getOffersForBuyer throws when case not found", async () => {
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue(null as never)

    await expect(service.getOffersForBuyer(caseId, buyerId)).rejects.toThrow(
      "Case not found",
    )
  })

  it("getCaseForBuyer includes only PRESENTED/ACCEPTED offers", async () => {
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue(null as never)

    await service.getCaseForBuyer(caseId, buyerId)

    const callArg = vi.mocked(prisma.vehicleRequestCase.findFirst).mock.calls[0][0] as {
      include: { offers: { where: { status: { in: string[] } } } }
    }
    expect(callArg.include.offers.where.status.in).toEqual([
      SourcedOfferStatus.PRESENTED,
      SourcedOfferStatus.ACCEPTED,
    ])
  })
})

// ---------------------------------------------------------------------------
// 7. Coverage gap signal creation
// ---------------------------------------------------------------------------
describe("checkDealerCoverage", () => {
  const buyerId = "buyer-1"
  const marketZip = "90210"
  const radiusMiles = 50

  it("returns hasCoverage: true when active dealers exist", async () => {
    vi.mocked(prisma.dealer.count).mockResolvedValue(3 as never)

    const result = await service.checkDealerCoverage(buyerId, marketZip, radiusMiles)

    expect(result).toEqual({ hasCoverage: true })
    expect(prisma.dealerCoverageGapSignal.create).not.toHaveBeenCalled()
  })

  it("creates a gap signal when no dealers found", async () => {
    vi.mocked(prisma.dealer.count).mockResolvedValue(0 as never)
    vi.mocked(prisma.dealerCoverageGapSignal.create).mockResolvedValue({
      id: "signal-1",
      reasonCode: "NO_ACTIVE_DEALERS",
    } as never)

    const result = await service.checkDealerCoverage(buyerId, marketZip, radiusMiles)

    expect(result.hasCoverage).toBe(false)
    expect(result.signal).toEqual({ id: "signal-1", reasonCode: "NO_ACTIVE_DEALERS" })
    expect(prisma.dealerCoverageGapSignal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        buyerId,
        marketZip,
        radiusMiles,
        reasonCode: "NO_ACTIVE_DEALERS",
      }),
    })
  })

  it("passes workspaceId to dealer query and signal when provided", async () => {
    vi.mocked(prisma.dealer.count).mockResolvedValue(0 as never)
    vi.mocked(prisma.dealerCoverageGapSignal.create).mockResolvedValue({
      id: "signal-2",
      reasonCode: "NO_ACTIVE_DEALERS",
    } as never)

    await service.checkDealerCoverage(buyerId, marketZip, radiusMiles, "ws-1")

    const countArg = vi.mocked(prisma.dealer.count).mock.calls[0][0] as {
      where: Record<string, unknown>
    }
    expect(countArg.where.workspaceId).toBe("ws-1")

    expect(prisma.dealerCoverageGapSignal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ workspaceId: "ws-1" }),
    })
  })

  it("filters by verified and active dealers", async () => {
    vi.mocked(prisma.dealer.count).mockResolvedValue(1 as never)

    await service.checkDealerCoverage(buyerId, marketZip, radiusMiles)

    const countArg = vi.mocked(prisma.dealer.count).mock.calls[0][0] as {
      where: Record<string, unknown>
    }
    expect(countArg.where.verified).toBe(true)
    expect(countArg.where.active).toBe(true)
    expect(countArg.where.zip).toBe(marketZip)
  })
})

// ---------------------------------------------------------------------------
// Additional enum & type coverage
// ---------------------------------------------------------------------------
describe("Supporting enums", () => {
  it("AdminSubStatus has expected values", () => {
    expect(Object.values(AdminSubStatus)).toContain("NEW")
    expect(Object.values(AdminSubStatus)).toContain("STALE")
    expect(Object.values(AdminSubStatus)).toContain("ESCALATED")
  })

  it("SourcedOfferStatus has expected values", () => {
    expect(SourcedOfferStatus.DRAFT).toBe("DRAFT")
    expect(SourcedOfferStatus.PRESENTED).toBe("PRESENTED")
    expect(SourcedOfferStatus.ACCEPTED).toBe("ACCEPTED")
    expect(SourcedOfferStatus.DECLINED).toBe("DECLINED")
    expect(SourcedOfferStatus.EXPIRED).toBe("EXPIRED")
  })

  it("DealerInviteStatus has expected values", () => {
    expect(DealerInviteStatus.SENT).toBe("SENT")
    expect(DealerInviteStatus.CLAIMED).toBe("CLAIMED")
    expect(DealerInviteStatus.COMPLETED).toBe("COMPLETED")
    expect(DealerInviteStatus.EXPIRED).toBe("EXPIRED")
  })

  it("OfferSourceType has expected values", () => {
    expect(OfferSourceType.ADMIN_ENTERED).toBe("ADMIN_ENTERED")
    expect(OfferSourceType.DEALER_SUBMITTED).toBe("DEALER_SUBMITTED")
  })
})

// ---------------------------------------------------------------------------
// getOfferBuyerContact
// ---------------------------------------------------------------------------
describe("getOfferBuyerContact", () => {
  it("returns buyer email and name when offer has linked case/buyer", async () => {
    vi.mocked(prisma.sourcedOffer.findUnique).mockResolvedValue({
      case: {
        buyer: {
          id: "bp-1",
          firstName: "Jane",
          lastName: "Doe",
          user: { id: "user-1", email: "jane@example.com" },
        },
      },
    } as never)

    const result = await service.getOfferBuyerContact("offer-1")

    expect(result).toEqual({
      email: "jane@example.com",
      buyerName: "Jane Doe",
      userId: "user-1",
    })
  })

  it("returns null when offer is not found", async () => {
    vi.mocked(prisma.sourcedOffer.findUnique).mockResolvedValue(null as never)

    const result = await service.getOfferBuyerContact("offer-missing")

    expect(result).toBeNull()
  })

  it("returns null when buyer has no email", async () => {
    vi.mocked(prisma.sourcedOffer.findUnique).mockResolvedValue({
      case: {
        buyer: {
          id: "bp-1",
          firstName: "Jane",
          lastName: null,
          user: { id: "user-1", email: null },
        },
      },
    } as never)

    const result = await service.getOfferBuyerContact("offer-1")

    expect(result).toBeNull()
  })

  it("uses 'Customer' as fallback when buyer has no name", async () => {
    vi.mocked(prisma.sourcedOffer.findUnique).mockResolvedValue({
      case: {
        buyer: {
          id: "bp-1",
          firstName: null,
          lastName: null,
          user: { id: "user-1", email: "anon@example.com" },
        },
      },
    } as never)

    const result = await service.getOfferBuyerContact("offer-1")

    expect(result).toEqual({
      email: "anon@example.com",
      buyerName: "Customer",
      userId: "user-1",
    })
  })
})
