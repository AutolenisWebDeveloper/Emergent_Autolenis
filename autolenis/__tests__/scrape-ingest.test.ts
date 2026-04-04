import { describe, it, expect, vi, beforeEach } from "vitest"

// --------------- hoisted mocks ---------------
const { mockFrom, mockScrape } = vi.hoisted(() => {
  const mockEq = vi.fn()
  const mockSingle = vi.fn()
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()

  // Default: successful insert chain for scrape_jobs
  mockInsert.mockReturnValue({
    select: mockSelect.mockReturnValue({
      single: mockSingle.mockResolvedValue({
        data: { id: "job-1" },
        error: null,
      }),
    }),
  })

  mockUpdate.mockReturnValue({
    eq: mockEq.mockResolvedValue({ error: null }),
  })

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "scrape_jobs") {
      return { insert: mockInsert, update: mockUpdate }
    }
    // scrape_raw_listings
    return {
      insert: vi.fn().mockResolvedValue({ error: null }),
    }
  })

  return {
    mockFrom,
    mockInsert,
    mockSelect,
    mockSingle,
    mockUpdate,
    mockEq,
    mockScrape: vi.fn(),
  }
})

// --------------- mocks ---------------
vi.mock("@/lib/db", () => ({
  getSupabase: vi.fn().mockReturnValue({ from: mockFrom }),
}))

vi.mock("@/lib/services/inventory-sourcing/scraper.service", () => ({
  scrapeListingsByZip: mockScrape,
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

// --------------- import under test after mocks ---------------
import { runZipIngestion } from "@/lib/services/inventory-sourcing/ingest.service"

// --------------- tests ---------------
describe("runZipIngestion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset default mocking behavior
    mockFrom.mockImplementation((table: string) => {
      if (table === "scrape_jobs") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "job-1" },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })
  })

  it("creates a job, scrapes, inserts listings, and marks job completed", async () => {
    mockScrape.mockResolvedValue([
      {
        title: "2023 Honda Civic",
        price: "$25,000",
        mileage: "10,000 mi",
        dealerName: "Test Dealer",
        listingUrl: "/vehicle/123",
      },
      {
        title: "2022 Toyota Camry",
        price: "$22,500",
        mileage: "15,000 mi",
        dealerName: "Another Dealer",
        listingUrl: "/vehicle/456",
      },
    ])

    const count = await runZipIngestion("75001")

    expect(count).toBe(2)
    // Job was created
    expect(mockFrom).toHaveBeenCalledWith("scrape_jobs")
    // Raw listings were inserted
    expect(mockFrom).toHaveBeenCalledWith("scrape_raw_listings")
  })

  it("returns 0 when scraper finds no listings", async () => {
    mockScrape.mockResolvedValue([])

    const count = await runZipIngestion("90210")

    expect(count).toBe(0)
  })

  it("throws when job creation fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "scrape_jobs") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "DB error" },
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) }
    })

    await expect(runZipIngestion("75001")).rejects.toThrow("Failed to create scrape job")
  })

  it("marks job as failed when scraper throws", async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === "scrape_jobs") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "job-fail" },
                error: null,
              }),
            }),
          }),
          update: updateMock,
        }
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) }
    })

    mockScrape.mockRejectedValue(new Error("Browser crash"))

    await expect(runZipIngestion("75001")).rejects.toThrow("Browser crash")

    // Verify job was marked as failed
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        error: "Browser crash",
      }),
    )
  })

  it("parses price and mileage strings to integers", async () => {
    const rawListingInsert = vi.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === "scrape_jobs") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "job-parse" },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      return { insert: rawListingInsert }
    })

    mockScrape.mockResolvedValue([
      {
        title: "Test Car",
        price: "$25,000",
        mileage: "10,000 mi",
        dealerName: "Dealer",
        listingUrl: "/v/1",
      },
    ])

    await runZipIngestion("75001")

    expect(rawListingInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 25000,
        mileage: 10000,
        source: "cars_com",
      }),
    )
  })
})
