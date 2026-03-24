import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { NextResponse } from "next/server"

/**
 * Release expired holds cron route — behavioral tests
 *
 * Tests the GET handler by mocking Prisma and cron security,
 * then exercising the handler directly with real Request objects.
 */

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mockPrisma = vi.hoisted(() => ({
  inventoryItem: {
    findMany: vi.fn().mockResolvedValue([]),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  depositPayment: {
    findFirst: vi.fn().mockResolvedValue(null),
  },
}))

const mockValidateCronRequest = vi.hoisted(() => vi.fn().mockResolvedValue(null))
const mockAcquireCronLock = vi.hoisted(() => vi.fn().mockResolvedValue(false))

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}))

vi.mock("@/lib/middleware/cron-security", () => ({
  validateCronRequest: mockValidateCronRequest,
  acquireCronLock: mockAcquireCronLock,
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Import the route handler AFTER mocks are registered
// ---------------------------------------------------------------------------
let GET: (req: any) => Promise<NextResponse>

beforeAll(async () => {
  const mod = await import("@/app/api/cron/release-expired-holds/route")
  GET = mod.GET as any
})

function makeRequest(): Request {
  return new Request("http://localhost:3000/api/cron/release-expired-holds", {
    method: "GET",
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Release Expired Holds Cron", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.inventoryItem.findMany.mockResolvedValue([])
    mockPrisma.inventoryItem.updateMany.mockResolvedValue({ count: 0 })
    mockPrisma.depositPayment.findFirst.mockResolvedValue(null)
    mockValidateCronRequest.mockResolvedValue(null)
    mockAcquireCronLock.mockResolvedValue(false)
  })

  it("rejects unauthorized requests according to cron auth", async () => {
    const unauthorizedResponse = NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    )
    mockValidateCronRequest.mockResolvedValue(unauthorizedResponse)

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    expect(mockValidateCronRequest).toHaveBeenCalledTimes(1)
  })

  it("releases expired HOLD with no successful payment", async () => {
    const expiredHold = {
      id: "item-expired-1",
      reservedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    }
    mockPrisma.inventoryItem.findMany.mockResolvedValue([expiredHold])
    mockPrisma.depositPayment.findFirst.mockResolvedValue(null)
    mockPrisma.inventoryItem.updateMany.mockResolvedValue({ count: 1 })

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.released).toBe(1)
    expect(body.itemIds).toContain("item-expired-1")

    // Verify payment lookup used inventoryItemId directly
    expect(mockPrisma.depositPayment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          inventoryItemId: "item-expired-1",
          status: "SUCCEEDED",
        }),
      }),
    )

    // Verify race-safe updateMany was used with guard conditions
    expect(mockPrisma.inventoryItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "item-expired-1",
          status: "HOLD",
        }),
        data: expect.objectContaining({
          status: "AVAILABLE",
          reservedAt: null,
        }),
      }),
    )
  })

  it("does NOT release expired HOLD with successful payment", async () => {
    const expiredHold = {
      id: "item-paid-1",
      reservedAt: new Date(Date.now() - 60 * 60 * 1000),
    }
    mockPrisma.inventoryItem.findMany.mockResolvedValue([expiredHold])
    mockPrisma.depositPayment.findFirst.mockResolvedValue({
      id: "payment-1",
    })

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.released).toBe(0)
    expect(body.itemIds).toEqual([])
    expect(mockPrisma.inventoryItem.updateMany).not.toHaveBeenCalled()

    // Verify payment lookup used inventoryItemId directly
    expect(mockPrisma.depositPayment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          inventoryItemId: "item-paid-1",
          status: "SUCCEEDED",
        }),
      }),
    )
  })

  it("does NOT release non-expired HOLDs", async () => {
    // findMany returns no stale items because none match the threshold
    mockPrisma.inventoryItem.findMany.mockResolvedValue([])

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.released).toBe(0)
    expect(body.itemIds).toEqual([])
    expect(mockPrisma.depositPayment.findFirst).not.toHaveBeenCalled()
    expect(mockPrisma.inventoryItem.updateMany).not.toHaveBeenCalled()
  })

  it("returns released count and item IDs correctly", async () => {
    const holds = [
      { id: "item-a", reservedAt: new Date(Date.now() - 60 * 60 * 1000) },
      { id: "item-b", reservedAt: new Date(Date.now() - 50 * 60 * 1000) },
    ]
    mockPrisma.inventoryItem.findMany.mockResolvedValue(holds)
    mockPrisma.depositPayment.findFirst.mockResolvedValue(null)
    mockPrisma.inventoryItem.updateMany.mockResolvedValue({ count: 1 })

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.released).toBe(2)
    expect(body.itemIds).toEqual(["item-a", "item-b"])
  })

  it("guards release update so already-changed rows are not falsely counted", async () => {
    const expiredHold = {
      id: "item-race",
      reservedAt: new Date(Date.now() - 60 * 60 * 1000),
    }
    mockPrisma.inventoryItem.findMany.mockResolvedValue([expiredHold])
    mockPrisma.depositPayment.findFirst.mockResolvedValue(null)
    // Simulate race: row was already changed by another process
    mockPrisma.inventoryItem.updateMany.mockResolvedValue({ count: 0 })

    const res = await GET(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    // count: 0 means no row was actually changed, so released should be 0
    expect(body.released).toBe(0)
    expect(body.itemIds).toEqual([])
  })
})
