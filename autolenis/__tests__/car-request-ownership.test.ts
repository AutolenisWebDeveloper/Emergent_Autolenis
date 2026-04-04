import { describe, it, expect, vi, beforeEach } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

// ---------------------------------------------------------------------------
// Mock Prisma BEFORE importing the service
// ---------------------------------------------------------------------------
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
    caseNote: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    selectedDeal: { create: vi.fn() },
    buyerProfile: { findFirst: vi.fn(), findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}))

import { prisma } from "@/lib/db"
import {
  SourcingService,
  BuyerCaseStatus,
  BuyerProfileMissingError,
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
// 1. resolveBuyerProfileId
// ---------------------------------------------------------------------------

describe("SourcingService.resolveBuyerProfileId", () => {
  it("returns BuyerProfile.id when profile exists", async () => {
    vi.mocked(prisma.buyerProfile.findUnique).mockResolvedValue({
      id: "bp-123",
    } as never)

    const result = await service.resolveBuyerProfileId("user-abc")
    expect(result).toBe("bp-123")

    expect(prisma.buyerProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-abc" },
      select: { id: true },
    })
  })

  it("throws BUYER_PROFILE_MISSING when no profile exists", async () => {
    vi.mocked(prisma.buyerProfile.findUnique).mockResolvedValue(null)

    await expect(service.resolveBuyerProfileId("user-abc")).rejects.toThrow(
      "Please complete your buyer profile before submitting a vehicle request.",
    )

    // Verify the error is a BuyerProfileMissingError with the expected code
    try {
      await service.resolveBuyerProfileId("user-abc")
    } catch (err) {
      expect(err).toBeInstanceOf(BuyerProfileMissingError)
      expect((err as BuyerProfileMissingError).code).toBe("BUYER_PROFILE_MISSING")
    }
  })
})

// ---------------------------------------------------------------------------
// 2. Canonical ownership: buyerId = BuyerProfile.id, not User.id
// ---------------------------------------------------------------------------

describe("Canonical ownership model — buyerId is BuyerProfile.id", () => {
  it("createCase passes buyerId directly to prisma.create", async () => {
    const BUYER_PROFILE_ID = "bp-canonical-id"
    vi.mocked(prisma.vehicleRequestCase.create).mockResolvedValue({
      id: "case-1",
      buyerId: BUYER_PROFILE_ID,
      status: BuyerCaseStatus.DRAFT,
      items: [],
    } as never)

    const input = makeCaseInput()
    await service.createCase(BUYER_PROFILE_ID, input)

    const call = vi.mocked(prisma.vehicleRequestCase.create).mock.calls[0]
    expect(call[0]?.data?.buyerId).toBe(BUYER_PROFILE_ID)
  })

  it("listCasesForBuyer queries by buyerId (BuyerProfile.id)", async () => {
    const BUYER_PROFILE_ID = "bp-list-test"
    vi.mocked(prisma.vehicleRequestCase.findMany).mockResolvedValue([])

    await service.listCasesForBuyer(BUYER_PROFILE_ID)

    const call = vi.mocked(prisma.vehicleRequestCase.findMany).mock.calls[0]
    expect(call[0]?.where?.buyerId).toBe(BUYER_PROFILE_ID)
  })

  it("submitCase verifies ownership by buyerId (BuyerProfile.id)", async () => {
    const BUYER_PROFILE_ID = "bp-submit-test"
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: "case-1",
      buyerId: BUYER_PROFILE_ID,
      status: BuyerCaseStatus.DRAFT,
    } as never)
    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({
      id: "case-1",
      status: BuyerCaseStatus.SUBMITTED,
    } as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    await service.submitCase("case-1", BUYER_PROFILE_ID)

    const findCall = vi.mocked(prisma.vehicleRequestCase.findFirst).mock.calls[0]
    expect(findCall[0]?.where?.buyerId).toBe(BUYER_PROFILE_ID)
  })

  it("cancelCase verifies ownership by buyerId (BuyerProfile.id)", async () => {
    const BUYER_PROFILE_ID = "bp-cancel-test"
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: "case-1",
      buyerId: BUYER_PROFILE_ID,
      status: BuyerCaseStatus.SUBMITTED,
    } as never)
    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({
      id: "case-1",
      status: BuyerCaseStatus.CLOSED_CANCELLED,
    } as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    await service.cancelCase("case-1", BUYER_PROFILE_ID)

    const findCall = vi.mocked(prisma.vehicleRequestCase.findFirst).mock.calls[0]
    expect(findCall[0]?.where?.buyerId).toBe(BUYER_PROFILE_ID)
  })

  it("getCaseForBuyer filters by buyerId (BuyerProfile.id)", async () => {
    const BUYER_PROFILE_ID = "bp-get-test"
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue(null)

    await service.getCaseForBuyer("case-1", BUYER_PROFILE_ID)

    const findCall = vi.mocked(prisma.vehicleRequestCase.findFirst).mock.calls[0]
    expect(findCall[0]?.where?.buyerId).toBe(BUYER_PROFILE_ID)
  })

  it("buyer cannot submit another buyer's case (wrong buyerId)", async () => {
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue(null)

    await expect(
      service.submitCase("case-1", "bp-wrong-buyer"),
    ).rejects.toThrow("Case not found")
  })
})

// ---------------------------------------------------------------------------
// 3. Prisma schema relation exists
// ---------------------------------------------------------------------------

describe("Prisma schema — VehicleRequestCase ↔ BuyerProfile relation", () => {
  const ROOT = join(__dirname, "..")
  const schema = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf-8")

  it("VehicleRequestCase has explicit buyer relation to BuyerProfile", () => {
    // Should have: buyer BuyerProfile @relation(fields: [buyerId], references: [id])
    expect(schema).toMatch(/model VehicleRequestCase[\s\S]*?buyer\s+BuyerProfile\s+@relation/)
  })

  it("BuyerProfile has reverse relation vehicleRequestCases", () => {
    // Should have: vehicleRequestCases VehicleRequestCase[]
    expect(schema).toMatch(/model BuyerProfile[\s\S]*?vehicleRequestCases\s+VehicleRequestCase\[\]/)
  })

  it("VehicleRequestCase.buyerId has an index", () => {
    // Should have: @@index([buyerId])
    const caseModel = schema.match(/model VehicleRequestCase \{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(caseModel).toContain("@@index([buyerId])")
  })
})

// ---------------------------------------------------------------------------
// 4. Route handlers resolve BuyerProfile.id (not session.userId)
// ---------------------------------------------------------------------------

describe("Route handlers use BuyerProfile.id, not session.userId", () => {
  const ROOT = join(__dirname, "..")

  const routeFiles = [
    "app/api/buyer/requests/route.ts",
    "app/api/buyer/requests/[caseId]/route.ts",
    "app/api/buyer/requests/[caseId]/submit/route.ts",
    "app/api/buyer/requests/[caseId]/cancel/route.ts",
  ]

  for (const file of routeFiles) {
    it(`${file} calls resolveBuyerProfileId`, () => {
      const content = readFileSync(join(ROOT, file), "utf-8")
      expect(content).toContain("resolveBuyerProfileId")
    })

    it(`${file} uses buyerProfileId (not session.userId) as ownership key`, () => {
      const content = readFileSync(join(ROOT, file), "utf-8")
      // Verify that service methods receive buyerProfileId as the ownership argument.
      // session.userId may appear as a later actorUserId arg — that's correct.
      // The key assertion: the buyerId position uses the resolved profile id.
      expect(content).not.toMatch(
        /\.createCase\(\s*session\.userId/,
      )
      expect(content).not.toMatch(
        /\.listCasesForBuyer\(\s*session\.userId/,
      )
      expect(content).not.toMatch(
        /\.getCaseForBuyer\([^,]*,\s*session\.userId/,
      )
      // submitCase/cancelCase: session.userId is allowed as 3rd arg (actorUserId)
      // but not as 2nd arg (buyerId)
      expect(content).not.toMatch(
        /\.submitCase\([^,]*,\s*session\.userId/,
      )
      expect(content).not.toMatch(
        /\.cancelCase\([^,]*,\s*session\.userId/,
      )
    })

    it(`${file} handles BuyerProfileMissingError via instanceof`, () => {
      const content = readFileSync(join(ROOT, file), "utf-8")
      expect(content).toContain("BuyerProfileMissingError")
      expect(content).toContain("instanceof BuyerProfileMissingError")
    })
  }

  // --- Additional routes that were missed in initial fix ---

  const additionalRouteFiles = [
    "app/api/buyer/requests/[caseId]/offers/route.ts",
    "app/api/buyer/requests/[caseId]/offers/[offerId]/accept/route.ts",
    "app/api/buyer/coverage-gap/route.ts",
  ]

  for (const file of additionalRouteFiles) {
    it(`${file} calls resolveBuyerProfileId`, () => {
      const content = readFileSync(join(ROOT, file), "utf-8")
      expect(content).toContain("resolveBuyerProfileId")
    })

    it(`${file} uses buyerProfileId (not session.userId) as ownership key`, () => {
      const content = readFileSync(join(ROOT, file), "utf-8")
      // Verify session.userId is NOT used in the buyerId position for these methods.
      // session.userId may appear as a later actorUserId arg — that's correct.
      expect(content).not.toMatch(
        /\.getOffersForBuyer\([^,]*,\s*session\.userId/,
      )
      expect(content).not.toMatch(
        /\.checkDealerCoverage\(\s*session\.userId/,
      )
      // acceptOffer: session.userId allowed as 4th arg (actorUserId),
      // but not as 3rd arg (buyerId)
      expect(content).not.toMatch(
        /\.acceptOffer\([^,]*,[^,]*,\s*session\.userId/,
      )
    })

    it(`${file} handles BuyerProfileMissingError`, () => {
      const content = readFileSync(join(ROOT, file), "utf-8")
      expect(content).toContain("BuyerProfileMissingError")
    })
  }
})

// ---------------------------------------------------------------------------
// 4b. Schema relation consistency
// ---------------------------------------------------------------------------

describe("Prisma schema — relation consistency with other buyer-owned models", () => {
  const ROOT = join(__dirname, "..")
  const schema = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf-8")

  it("VehicleRequestCase has onDelete: Restrict (financial-linked buyer-owned model)", () => {
    const caseModel = schema.match(/model VehicleRequestCase \{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(caseModel).toMatch(/buyer\s+BuyerProfile\s+@relation\([^)]*onDelete:\s*Restrict/)
  })

  it("Shortlist has onDelete: Cascade as reference pattern", () => {
    const shortlistModel = schema.match(/model Shortlist \{[\s\S]*?\n\}/)?.[0] ?? ""
    expect(shortlistModel).toMatch(/buyer\s+BuyerProfile\s+@relation\([^)]*onDelete:\s*Cascade/)
  })
})

// ---------------------------------------------------------------------------
// 4c. acceptOffer and getOffersForBuyer use BuyerProfile.id
// ---------------------------------------------------------------------------

describe("Offer service methods use buyerId (BuyerProfile.id)", () => {
  it("getOffersForBuyer queries case by buyerId", async () => {
    const BUYER_PROFILE_ID = "bp-offers-test"
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: "case-1",
      buyerId: BUYER_PROFILE_ID,
    } as never)
    vi.mocked(prisma.sourcedOffer.findMany).mockResolvedValue([])

    await service.getOffersForBuyer("case-1", BUYER_PROFILE_ID)

    const findCall = vi.mocked(prisma.vehicleRequestCase.findFirst).mock.calls[0]
    expect(findCall[0]?.where?.buyerId).toBe(BUYER_PROFILE_ID)
  })

  it("acceptOffer verifies case ownership by buyerId", async () => {
    const BUYER_PROFILE_ID = "bp-accept-test"
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: "case-1",
      buyerId: BUYER_PROFILE_ID,
      offers: [{ id: "offer-1", status: "PRESENTED" }],
    } as never)
    vi.mocked(prisma.sourcedOffer.update).mockResolvedValue({} as never)
    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({
      id: "case-1",
      status: BuyerCaseStatus.OFFER_SELECTED,
    } as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    await service.acceptOffer("case-1", "offer-1", BUYER_PROFILE_ID)

    const findCall = vi.mocked(prisma.vehicleRequestCase.findFirst).mock.calls[0]
    expect(findCall[0]?.where?.buyerId).toBe(BUYER_PROFILE_ID)
  })

  it("acceptOffer rejects wrong buyerId", async () => {
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue(null)

    await expect(
      service.acceptOffer("case-1", "offer-1", "bp-wrong-buyer"),
    ).rejects.toThrow("Case not found")
  })
})

// ---------------------------------------------------------------------------
// 4d. Backfill migration exists
// ---------------------------------------------------------------------------

describe("Data backfill migration", () => {
  const ROOT = join(__dirname, "..")
  const migrationPath = join(ROOT, "scripts", "migrations", "07-backfill-vehicle-request-buyer-ids.sql")

  it("backfill migration file exists", () => {
    const content = readFileSync(migrationPath, "utf-8")
    expect(content.length).toBeGreaterThan(0)
  })

  it("backfill migration handles VehicleRequestCase records", () => {
    const content = readFileSync(migrationPath, "utf-8")
    expect(content).toContain("VehicleRequestCase")
    expect(content).toContain("BuyerProfile")
  })

  it("backfill migration handles DealerCoverageGapSignal records", () => {
    const content = readFileSync(migrationPath, "utf-8")
    expect(content).toContain("DealerCoverageGapSignal")
  })

  it("backfill migration handles SourcedOffer records", () => {
    const content = readFileSync(migrationPath, "utf-8")
    expect(content).toMatch(/UPDATE\s+"SourcedOffer"/)
  })

  it("backfill migration includes diagnostic/verification queries", () => {
    const content = readFileSync(migrationPath, "utf-8")
    expect(content).toContain("DIAGNOSTIC")
    expect(content).toContain("ORPHANED")
  })

  it("backfill migration includes workspace mismatch detection", () => {
    const content = readFileSync(migrationPath, "utf-8")
    expect(content).toContain("Workspace mismatch")
    expect(content).toContain("IS DISTINCT FROM")
  })

  it("backfill migration includes offer/case ownership consistency check", () => {
    const content = readFileSync(migrationPath, "utf-8")
    // Should verify that offer.buyerId matches case.buyerId
    expect(content).toContain('"SourcedOffer"')
    expect(content).toContain('"VehicleRequestCase"')
    expect(content).toContain("offer_buyer_id")
    expect(content).toContain("case_buyer_id")
  })
})

// ---------------------------------------------------------------------------
// 4e. Event log uses authenticated User.id as actorUserId
// ---------------------------------------------------------------------------

describe("Event log actorUserId is User.id (not BuyerProfile.id)", () => {
  it("submitCase passes actorUserId (User.id) to logEvent", async () => {
    const USER_ID = "user-actor-submit"
    const BUYER_PROFILE_ID = "bp-actor-submit"
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: "case-1",
      buyerId: BUYER_PROFILE_ID,
      status: BuyerCaseStatus.DRAFT,
    } as never)
    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({
      id: "case-1",
      status: BuyerCaseStatus.SUBMITTED,
    } as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    await service.submitCase("case-1", BUYER_PROFILE_ID, USER_ID)

    const eventCall = vi.mocked(prisma.caseEventLog.create).mock.calls[0]
    expect(eventCall[0]?.data?.actorUserId).toBe(USER_ID)
    expect(eventCall[0]?.data?.actorRole).toBe("BUYER")
  })

  it("cancelCase passes actorUserId (User.id) to logEvent", async () => {
    const USER_ID = "user-actor-cancel"
    const BUYER_PROFILE_ID = "bp-actor-cancel"
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: "case-1",
      buyerId: BUYER_PROFILE_ID,
      status: BuyerCaseStatus.SUBMITTED,
    } as never)
    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({
      id: "case-1",
      status: BuyerCaseStatus.CLOSED_CANCELLED,
    } as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    await service.cancelCase("case-1", BUYER_PROFILE_ID, USER_ID)

    const eventCall = vi.mocked(prisma.caseEventLog.create).mock.calls[0]
    expect(eventCall[0]?.data?.actorUserId).toBe(USER_ID)
    expect(eventCall[0]?.data?.actorRole).toBe("BUYER")
  })

  it("acceptOffer passes actorUserId (User.id) to logEvent", async () => {
    const USER_ID = "user-actor-accept"
    const BUYER_PROFILE_ID = "bp-actor-accept"
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: "case-1",
      buyerId: BUYER_PROFILE_ID,
      offers: [{ id: "offer-1", status: "PRESENTED" }],
    } as never)
    vi.mocked(prisma.sourcedOffer.update).mockResolvedValue({} as never)
    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({
      id: "case-1",
      status: BuyerCaseStatus.OFFER_SELECTED,
    } as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    await service.acceptOffer("case-1", "offer-1", BUYER_PROFILE_ID, USER_ID)

    const eventCall = vi.mocked(prisma.caseEventLog.create).mock.calls[0]
    expect(eventCall[0]?.data?.actorUserId).toBe(USER_ID)
    expect(eventCall[0]?.data?.actorRole).toBe("BUYER")
  })

  it("submitCase falls back to buyerId when actorUserId not provided", async () => {
    const BUYER_PROFILE_ID = "bp-fallback-submit"
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: "case-1",
      buyerId: BUYER_PROFILE_ID,
      status: BuyerCaseStatus.DRAFT,
    } as never)
    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({
      id: "case-1",
      status: BuyerCaseStatus.SUBMITTED,
    } as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    // Call without actorUserId — backward compat
    await service.submitCase("case-1", BUYER_PROFILE_ID)

    const eventCall = vi.mocked(prisma.caseEventLog.create).mock.calls[0]
    expect(eventCall[0]?.data?.actorUserId).toBe(BUYER_PROFILE_ID)
  })
})

// ---------------------------------------------------------------------------
// 4f. completeDealerInvite uses BuyerProfile.id correctly
// ---------------------------------------------------------------------------

describe("completeDealerInvite uses canonical BuyerProfile.id", () => {
  it("looks up buyer profile by id (not userId) from requestCase.buyerId", async () => {
    const BUYER_PROFILE_ID = "bp-invite-test"
    const DEALER_USER_ID = "dealer-user-1"

    vi.mocked(prisma.dealerInvite.findUnique).mockResolvedValue({
      id: "invite-1",
      caseId: "case-1",
      offerId: "offer-1",
      status: "CLAIMED",
      offer: {
        id: "offer-1",
        vin: "1HGCM82633A004352",
        year: 2024,
        make: "Honda",
        modelName: "Accord",
        pricingBreakdownJson: { cashOtdCents: 3000000, taxCents: 200000 },
      },
    } as never)

    vi.mocked(prisma.vehicleRequestCase.findUnique).mockResolvedValue({
      id: "case-1",
      buyerId: BUYER_PROFILE_ID,
      workspaceId: "ws-1",
    } as never)

    // The critical fix: findUnique with { id: BUYER_PROFILE_ID }
    vi.mocked(prisma.buyerProfile.findUnique).mockResolvedValue({
      id: BUYER_PROFILE_ID,
      userId: "user-123",
    } as never)

    vi.mocked(prisma.dealer.findFirst).mockResolvedValue({
      id: "dealer-1",
      userId: DEALER_USER_ID,
    } as never)

    vi.mocked(prisma.dealerInvite.update).mockResolvedValue({ id: "invite-1" } as never)
    vi.mocked(prisma.selectedDeal.create).mockResolvedValue({ id: "deal-1" } as never)
    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({ id: "case-1" } as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    await service.completeDealerInvite("invite-1", DEALER_USER_ID)

    // Verify it looked up buyerProfile by id (not userId)
    const profileCall = vi.mocked(prisma.buyerProfile.findUnique).mock.calls[0]
    expect(profileCall[0]?.where).toEqual({ id: BUYER_PROFILE_ID })
  })
})

// ---------------------------------------------------------------------------
// 4g. Route handlers pass session.userId as actorUserId
// ---------------------------------------------------------------------------

describe("Route handlers pass session.userId to audit-aware methods", () => {
  const ROOT = join(__dirname, "..")

  const auditRouteFiles = [
    { file: "app/api/buyer/requests/[caseId]/submit/route.ts", method: "submitCase" },
    { file: "app/api/buyer/requests/[caseId]/cancel/route.ts", method: "cancelCase" },
    { file: "app/api/buyer/requests/[caseId]/offers/[offerId]/accept/route.ts", method: "acceptOffer" },
  ]

  for (const { file, method } of auditRouteFiles) {
    it(`${file} passes session.userId to ${method}`, () => {
      const content = readFileSync(join(ROOT, file), "utf-8")
      // Should pass session.userId as actorUserId alongside buyerProfileId
      expect(content).toContain("session.userId")
      expect(content).toContain(method)
    })
  }
})

// ---------------------------------------------------------------------------
// 5. Create → Submit end-to-end with BuyerProfile.id
// ---------------------------------------------------------------------------

describe("End-to-end create → submit with BuyerProfile.id", () => {
  it("full flow: resolve profile → create → submit", async () => {
    const USER_ID = "user-e2e"
    const BUYER_PROFILE_ID = "bp-e2e"
    const CASE_ID = "case-e2e"

    // 1. Resolve buyer profile
    vi.mocked(prisma.buyerProfile.findUnique).mockResolvedValue({
      id: BUYER_PROFILE_ID,
    } as never)

    const profileId = await service.resolveBuyerProfileId(USER_ID)
    expect(profileId).toBe(BUYER_PROFILE_ID)

    // 2. Create case with BuyerProfile.id
    vi.mocked(prisma.vehicleRequestCase.create).mockResolvedValue({
      id: CASE_ID,
      buyerId: BUYER_PROFILE_ID,
      status: BuyerCaseStatus.DRAFT,
      items: [],
    } as never)

    const created = await service.createCase(profileId, makeCaseInput())
    expect(created.buyerId).toBe(BUYER_PROFILE_ID)

    // 3. Submit with BuyerProfile.id
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: CASE_ID,
      buyerId: BUYER_PROFILE_ID,
      status: BuyerCaseStatus.DRAFT,
    } as never)
    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({
      id: CASE_ID,
      buyerId: BUYER_PROFILE_ID,
      status: BuyerCaseStatus.SUBMITTED,
      items: [],
    } as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    const submitted = await service.submitCase(CASE_ID, profileId)
    expect(submitted.status).toBe(BuyerCaseStatus.SUBMITTED)

    // Verify the findFirst used the correct buyerId
    const findCall = vi.mocked(prisma.vehicleRequestCase.findFirst).mock.calls[0]
    expect(findCall[0]?.where?.buyerId).toBe(BUYER_PROFILE_ID)
  })
})
