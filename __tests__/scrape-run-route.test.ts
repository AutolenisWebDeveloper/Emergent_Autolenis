import { describe, it, expect, vi, beforeEach } from "vitest"

// --------------- hoisted mocks ---------------
const { mockFrom, mockGetSessionUser, mockIsAdminRole } = vi.hoisted(() => {
  const mockInsert = vi.fn()
  const mockSelect = vi.fn()
  const mockSingle = vi.fn()
  const mockUpdate = vi.fn()
  const mockEq = vi.fn()

  // Build chainable mock per table
  const mockFrom = vi.fn().mockReturnValue({
    insert: mockInsert.mockReturnValue({
      select: mockSelect.mockReturnValue({
        single: mockSingle.mockResolvedValue({
          data: { id: "job-1" },
          error: null,
        }),
      }),
    }),
    update: mockUpdate.mockReturnValue({
      eq: mockEq.mockResolvedValue({ error: null }),
    }),
  })

  return {
    mockFrom,
    mockInsert,
    mockSelect,
    mockSingle,
    mockUpdate,
    mockEq,
    mockGetSessionUser: vi.fn(),
    mockIsAdminRole: vi.fn(),
  }
})

// --------------- mocks ---------------
vi.mock("@/lib/auth-server", () => ({
  getSessionUser: mockGetSessionUser,
  isAdminRole: mockIsAdminRole,
}))

vi.mock("@/lib/db", () => ({
  getSupabase: vi.fn().mockReturnValue({ from: mockFrom }),
}))

vi.mock("@/lib/services/inventory-sourcing/scraper.service", () => ({
  scrapeListingsByZip: vi.fn().mockResolvedValue([
    {
      title: "2023 Honda Civic",
      price: "$25,000",
      mileage: "10,000 mi",
      dealerName: "Test Dealer",
      listingUrl: "/vehicle/123",
    },
  ]),
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

// --------------- import under test after mocks ---------------
import { POST } from "@/app/api/admin/scrape/run/route"
import { NextRequest } from "next/server"

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/admin/scrape/run", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

// --------------- tests ---------------
describe("POST /api/admin/scrape/run", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when user is not authenticated", async () => {
    mockGetSessionUser.mockResolvedValue(null)

    const res = await POST(makeRequest({ zip: "75001" }))
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 401 when user role is not admin", async () => {
    mockGetSessionUser.mockResolvedValue({ role: "BUYER", id: "u-1" })
    mockIsAdminRole.mockReturnValue(false)

    const res = await POST(makeRequest({ zip: "75001" }))
    expect(res.status).toBe(401)
  })

  it("accepts ADMIN role via isAdminRole", async () => {
    mockGetSessionUser.mockResolvedValue({ role: "ADMIN", id: "u-1" })
    mockIsAdminRole.mockReturnValue(true)

    const res = await POST(makeRequest({ zip: "75001" }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.count).toBe(1)
  })

  it("accepts SUPER_ADMIN role via isAdminRole", async () => {
    mockGetSessionUser.mockResolvedValue({ role: "SUPER_ADMIN", id: "u-2" })
    mockIsAdminRole.mockReturnValue(true)

    const res = await POST(makeRequest({ zip: "75001" }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("returns 400 for invalid ZIP (too short)", async () => {
    mockGetSessionUser.mockResolvedValue({ role: "ADMIN", id: "u-1" })
    mockIsAdminRole.mockReturnValue(true)

    const res = await POST(makeRequest({ zip: "750" }))
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 for invalid ZIP (non-numeric)", async () => {
    mockGetSessionUser.mockResolvedValue({ role: "ADMIN", id: "u-1" })
    mockIsAdminRole.mockReturnValue(true)

    const res = await POST(makeRequest({ zip: "abcde" }))
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 when ZIP is missing", async () => {
    mockGetSessionUser.mockResolvedValue({ role: "ADMIN", id: "u-1" })
    mockIsAdminRole.mockReturnValue(true)

    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })
})
