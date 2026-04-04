import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mock Prisma BEFORE importing the service
// ---------------------------------------------------------------------------
vi.mock("@/lib/db", () => ({
  prisma: {
    dealer: { count: vi.fn() },
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
  AdminSubStatus,
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
// 1. Notes CRUD
// ---------------------------------------------------------------------------
describe("SourcingService.addNote", () => {
  it("creates a note and logs an event", async () => {
    const mockCase = { id: "case-1", buyerId: "buyer-1", status: "SUBMITTED" }
    const mockNote = { id: "note-1", caseId: "case-1", content: "Test note", authorUserId: "admin-1", authorRole: "ADMIN", isInternal: true }

    vi.mocked(prisma.vehicleRequestCase.findUnique).mockResolvedValue(mockCase as never)
    vi.mocked(prisma.caseNote.create).mockResolvedValue(mockNote as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    const result = await service.addNote("case-1", { content: "Test note" }, "admin-1", "ADMIN")
    expect(result).toEqual(mockNote)

    expect(prisma.caseNote.create).toHaveBeenCalledWith({
      data: {
        caseId: "case-1",
        authorUserId: "admin-1",
        authorRole: "ADMIN",
        content: "Test note",
        isInternal: true,
      },
    })

    // Verify event log was created
    expect(prisma.caseEventLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        caseId: "case-1",
        action: "NOTE_ADDED",
        actorUserId: "admin-1",
      }),
    })
  })

  it("throws when case not found", async () => {
    vi.mocked(prisma.vehicleRequestCase.findUnique).mockResolvedValue(null)

    await expect(service.addNote("nonexistent", { content: "test" }, "admin-1", "ADMIN"))
      .rejects.toThrow("Case not found")
  })

  it("respects isInternal=false when specified", async () => {
    const mockCase = { id: "case-1", buyerId: "buyer-1", status: "SUBMITTED" }
    vi.mocked(prisma.vehicleRequestCase.findUnique).mockResolvedValue(mockCase as never)
    vi.mocked(prisma.caseNote.create).mockResolvedValue({ id: "note-2" } as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    await service.addNote("case-1", { content: "Visible note", isInternal: false }, "admin-1", "ADMIN")

    expect(prisma.caseNote.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isInternal: false,
      }),
    })
  })
})

describe("SourcingService.listNotes", () => {
  it("returns notes ordered by createdAt desc", async () => {
    const mockNotes = [
      { id: "note-2", content: "Second", createdAt: new Date("2025-02-01") },
      { id: "note-1", content: "First", createdAt: new Date("2025-01-01") },
    ]
    vi.mocked(prisma.caseNote.findMany).mockResolvedValue(mockNotes as never)

    const result = await service.listNotes("case-1")
    expect(result).toEqual(mockNotes)
    expect(prisma.caseNote.findMany).toHaveBeenCalledWith({
      where: { caseId: "case-1" },
      orderBy: { createdAt: "desc" },
    })
  })
})

// ---------------------------------------------------------------------------
// 2. Admin listing filters
// ---------------------------------------------------------------------------
describe("SourcingService.listCasesForAdmin – filters", () => {
  beforeEach(() => {
    vi.mocked(prisma.vehicleRequestCase.findMany).mockResolvedValue([] as never)
  })

  it("applies dateFrom and dateTo filters", async () => {
    await service.listCasesForAdmin({
      dateFrom: "2025-01-01",
      dateTo: "2025-06-30",
    })

    const call = vi.mocked(prisma.vehicleRequestCase.findMany).mock.calls[0]
    const where = call[0]?.where as Record<string, unknown>
    expect(where.createdAt).toEqual({
      gte: new Date("2025-01-01"),
      lte: new Date("2025-06-30"),
    })
  })

  it("applies marketZip filter", async () => {
    await service.listCasesForAdmin({ marketZip: "90210" })

    const call = vi.mocked(prisma.vehicleRequestCase.findMany).mock.calls[0]
    const where = call[0]?.where as Record<string, unknown>
    expect(where.marketZip).toBe("90210")
  })

  it("applies make filter with case-insensitive search", async () => {
    await service.listCasesForAdmin({ make: "Toyota" })

    const call = vi.mocked(prisma.vehicleRequestCase.findMany).mock.calls[0]
    const where = call[0]?.where as Record<string, unknown>
    expect(where.items).toEqual({
      some: { make: { contains: "Toyota", mode: "insensitive" } },
    })
  })

  it("applies budget range filter", async () => {
    await service.listCasesForAdmin({ budgetMin: 2000000, budgetMax: 5000000 })

    const call = vi.mocked(prisma.vehicleRequestCase.findMany).mock.calls[0]
    const where = call[0]?.where as Record<string, unknown>
    expect((where.items as Record<string, unknown>)).toBeDefined()
  })

  it("applies oldest sort order", async () => {
    await service.listCasesForAdmin({ sortBy: "oldest" })

    const call = vi.mocked(prisma.vehicleRequestCase.findMany).mock.calls[0]
    expect(call[0]?.orderBy).toEqual({ createdAt: "asc" })
  })

  it("defaults to newest sort", async () => {
    await service.listCasesForAdmin({})

    const call = vi.mocked(prisma.vehicleRequestCase.findMany).mock.calls[0]
    expect(call[0]?.orderBy).toEqual({ createdAt: "desc" })
  })

  it("applies workspaceId when provided", async () => {
    await service.listCasesForAdmin({}, "ws-123")

    const call = vi.mocked(prisma.vehicleRequestCase.findMany).mock.calls[0]
    const where = call[0]?.where as Record<string, unknown>
    expect(where.workspaceId).toBe("ws-123")
  })
})

// ---------------------------------------------------------------------------
// 3. getCaseForAdmin includes notes
// ---------------------------------------------------------------------------
describe("SourcingService.getCaseForAdmin – includes notes", () => {
  it("includes notes in the query", async () => {
    vi.mocked(prisma.vehicleRequestCase.findUnique).mockResolvedValue(null)

    await service.getCaseForAdmin("case-1")

    const call = vi.mocked(prisma.vehicleRequestCase.findUnique).mock.calls[0]
    expect(call[0]?.include?.notes).toEqual({ orderBy: { createdAt: "desc" } })
  })
})

// ---------------------------------------------------------------------------
// 4. Status transition validation (RBAC / workflow)
// ---------------------------------------------------------------------------
describe("SourcingService.updateCaseStatus – RBAC transitions", () => {
  it("allows DRAFT → SUBMITTED", async () => {
    const mockCase = {
      id: "case-1",
      buyerId: "buyer-1",
      status: BuyerCaseStatus.DRAFT,
      adminSubStatus: AdminSubStatus.NEW,
      assignedAdminUserId: null,
    }
    vi.mocked(prisma.vehicleRequestCase.findUnique).mockResolvedValue(mockCase as never)
    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({ ...mockCase, status: BuyerCaseStatus.SUBMITTED } as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    const result = await service.updateCaseStatus(
      "case-1",
      BuyerCaseStatus.SUBMITTED,
      undefined,
      "admin-1",
      "ADMIN",
    )
    expect(result.status).toBe(BuyerCaseStatus.SUBMITTED)
  })

  it("rejects SUBMITTED → DRAFT (invalid transition)", async () => {
    const mockCase = { id: "case-1", status: BuyerCaseStatus.SUBMITTED }
    vi.mocked(prisma.vehicleRequestCase.findUnique).mockResolvedValue(mockCase as never)

    await expect(
      service.updateCaseStatus("case-1", BuyerCaseStatus.DRAFT, undefined, "admin-1", "ADMIN"),
    ).rejects.toThrow("Invalid status transition")
  })

  it("rejects CLOSED_WON → anything (terminal state)", async () => {
    const mockCase = { id: "case-1", status: BuyerCaseStatus.CLOSED_WON }
    vi.mocked(prisma.vehicleRequestCase.findUnique).mockResolvedValue(mockCase as never)

    await expect(
      service.updateCaseStatus("case-1", BuyerCaseStatus.SOURCING, undefined, "admin-1", "ADMIN"),
    ).rejects.toThrow("Invalid status transition")
  })

  it("sets closedAt when transitioning to closed status", async () => {
    const mockCase = {
      id: "case-1",
      status: BuyerCaseStatus.IN_PLATFORM_TRANSACTION,
    }
    vi.mocked(prisma.vehicleRequestCase.findUnique).mockResolvedValue(mockCase as never)
    vi.mocked(prisma.vehicleRequestCase.update).mockResolvedValue({ ...mockCase, status: BuyerCaseStatus.CLOSED_WON } as never)
    vi.mocked(prisma.caseEventLog.create).mockResolvedValue({} as never)

    await service.updateCaseStatus("case-1", BuyerCaseStatus.CLOSED_WON, undefined, "admin-1", "ADMIN")

    const updateCall = vi.mocked(prisma.vehicleRequestCase.update).mock.calls[0]
    const data = updateCall[0]?.data as Record<string, unknown>
    expect(data.closedAt).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// 5. Case creation & submission
// ---------------------------------------------------------------------------
describe("SourcingService – case creation edge cases", () => {
  it("rejects empty items array", async () => {
    const input = makeCaseInput(0)
    input.items = []
    await expect(service.createCase("buyer-1", input)).rejects.toThrow("At least one vehicle request item")
  })

  it("rejects more than 3 items", async () => {
    const input = makeCaseInput(4)
    await expect(service.createCase("buyer-1", input)).rejects.toThrow("Maximum 3 items per case")
  })
})

describe("SourcingService.submitCase – buyer ownership", () => {
  it("throws when case not found for buyer", async () => {
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue(null)

    await expect(service.submitCase("case-1", "wrong-buyer")).rejects.toThrow("Case not found")
  })

  it("throws when case is not in DRAFT status", async () => {
    vi.mocked(prisma.vehicleRequestCase.findFirst).mockResolvedValue({
      id: "case-1",
      buyerId: "buyer-1",
      status: BuyerCaseStatus.SUBMITTED,
    } as never)

    await expect(service.submitCase("case-1", "buyer-1")).rejects.toThrow("Invalid status transition")
  })
})

// ---------------------------------------------------------------------------
// 6. Zod validation edge cases
// ---------------------------------------------------------------------------
import { createCarRequestSchema } from "@/lib/validators/car-request"

function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    marketZip: "90210",
    radiusMiles: 50,
    items: [
      {
        vehicleType: "CAR",
        condition: "EITHER",
        make: "Toyota",
        model: "Camry",
        openToSimilar: false,
        budgetType: "TOTAL_PRICE",
        maxTotalOtdBudgetCents: 3500000,
        desiredDownPaymentCents: 500000,
        mustHaveFeatures: [],
        colors: [],
        distancePreference: "EITHER",
        timeline: "FIFTEEN_30_DAYS",
      },
    ],
    ...overrides,
  }
}

describe("createCarRequestSchema – additional edge cases", () => {
  it("rejects more than 3 items", () => {
    const payload = buildPayload({
      items: Array.from({ length: 4 }, () => ({
        vehicleType: "CAR",
        condition: "EITHER",
        make: "Honda",
        budgetType: "TOTAL_PRICE",
        maxTotalOtdBudgetCents: 3500000,
        desiredDownPaymentCents: 500000,
      })),
    })
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it("rejects empty items array", () => {
    const payload = buildPayload({ items: [] })
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it("rejects invalid vehicleType", () => {
    const payload = buildPayload({
      items: [{ ...buildPayload().items[0], vehicleType: "MOTORCYCLE" }],
    })
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it("rejects negative maxTotalOtdBudgetCents", () => {
    const payload = buildPayload({
      items: [{ ...buildPayload().items[0], maxTotalOtdBudgetCents: -100 }],
    })
    const result = createCarRequestSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it("accepts all valid timeline values", () => {
    for (const tl of ["ZERO_7_DAYS", "EIGHT_14_DAYS", "FIFTEEN_30_DAYS", "THIRTY_PLUS_DAYS"]) {
      const payload = buildPayload({
        items: [{ ...buildPayload().items[0], timeline: tl }],
      })
      const result = createCarRequestSchema.safeParse(payload)
      expect(result.success).toBe(true)
    }
  })

  it("accepts all valid distancePreference values", () => {
    for (const dp of ["DELIVERY", "PICKUP", "EITHER"]) {
      const payload = buildPayload({
        items: [{ ...buildPayload().items[0], distancePreference: dp }],
      })
      const result = createCarRequestSchema.safeParse(payload)
      expect(result.success).toBe(true)
    }
  })

  it("rejects ZIP code with letters", () => {
    const result = createCarRequestSchema.safeParse(buildPayload({ marketZip: "ABCDE" }))
    expect(result.success).toBe(false)
  })

  it("accepts ZIP+4 format", () => {
    const result = createCarRequestSchema.safeParse(buildPayload({ marketZip: "90210-1234" }))
    expect(result.success).toBe(true)
  })
})
