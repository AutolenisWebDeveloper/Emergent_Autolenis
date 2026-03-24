import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  prisma: {
    inventoryItem: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    dealer: {
      findUnique: vi.fn(),
    },
    vehicle: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    inventoryImportJob: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock("@prisma/client", () => ({
  InventoryStatus: {
    AVAILABLE: "AVAILABLE",
    HOLD: "HOLD",
    SOLD: "SOLD",
    REMOVED: "REMOVED",
  },
}))

import { InventoryService } from "@/lib/services/inventory.service"
import { prisma } from "@/lib/db"

const mockVehicle = { id: "vehicle-1", make: "Honda", model: "Civic", year: 2021, vin: "1HGBH41JXMN109186" }
const mockInventoryItem = {
  id: "item-1",
  dealerId: "dealer-1",
  vehicleId: "vehicle-1",
  priceCents: 2000000,
  price: 20000,
  status: "AVAILABLE",
  vin: "1HGBH41JXMN109186",
  stockNumber: "STK-001",
  mileage: 5000,
  isNew: false,
  photosJson: [],
  source: "MANUAL",
}

describe("InventoryService - createInventoryItem", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("throws VIN_CONFLICT when an active duplicate VIN exists", async () => {
    vi.mocked(prisma.inventoryItem.findFirst).mockResolvedValueOnce({
      id: "existing-item",
      dealerId: "dealer-2",
    } as any)

    await expect(
      InventoryService.createInventoryItem("dealer-1", {
        vin: "1HGBH41JXMN109186",
        make: "Honda",
        model: "Civic",
        year: 2021,
        priceCents: 2000000,
        mileage: 5000,
        isNew: false,
      }),
    ).rejects.toThrow("VIN_CONFLICT")
  })

  it("allows creation when matching VIN is SOLD (no conflict)", async () => {
    vi.mocked(prisma.inventoryItem.findFirst).mockResolvedValueOnce(null) // no conflict
    vi.mocked(prisma.dealer.findUnique).mockResolvedValueOnce({ workspaceId: "ws-1" } as any)
    vi.mocked(prisma.vehicle.findFirst).mockResolvedValueOnce(null)
    vi.mocked(prisma.vehicle.create).mockResolvedValue(mockVehicle as any)
    vi.mocked(prisma.inventoryItem.create).mockResolvedValue({ ...mockInventoryItem, vehicle: mockVehicle, dealer: {} } as any)

    const result = await InventoryService.createInventoryItem("dealer-1", {
      vin: "1HGBH41JXMN109186",
      make: "Honda",
      model: "Civic",
      year: 2021,
      priceCents: 2000000,
      mileage: 5000,
      isNew: false,
    })
    expect(result.id).toBe("item-1")
  })

  it("throws when price is zero or negative", async () => {
    await expect(
      InventoryService.createInventoryItem("dealer-1", {
        make: "Honda",
        model: "Civic",
        year: 2021,
        priceCents: 0,
        mileage: 5000,
        isNew: false,
      }),
    ).rejects.toThrow("Price must be greater than 0")
  })

  it("throws when mileage is negative", async () => {
    await expect(
      InventoryService.createInventoryItem("dealer-1", {
        make: "Honda",
        model: "Civic",
        year: 2021,
        priceCents: 2000000,
        mileage: -1,
        isNew: false,
      }),
    ).rejects.toThrow("Mileage cannot be negative")
  })
})

describe("InventoryService - markAsSoldForDeal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("throws INVENTORY_ALREADY_SOLD when item is REMOVED (concurrent conflict)", async () => {
    vi.mocked(prisma.inventoryItem.updateMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue({
      id: "item-1",
      status: "REMOVED",
    } as any)

    await expect(InventoryService.markAsSoldForDeal("item-1")).rejects.toThrow("INVENTORY_ALREADY_SOLD")
  })

  it("returns idempotently when item is already SOLD", async () => {
    vi.mocked(prisma.inventoryItem.updateMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue({
      id: "item-1",
      status: "SOLD",
    } as any)

    const result = await InventoryService.markAsSoldForDeal("item-1")
    expect(result).toMatchObject({ id: "item-1", status: "SOLD" })
  })

  it("succeeds when item was AVAILABLE (updateMany count=1)", async () => {
    vi.mocked(prisma.inventoryItem.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue({
      id: "item-1",
      status: "SOLD",
    } as any)

    const result = await InventoryService.markAsSoldForDeal("item-1")
    expect(result).not.toBeNull()
  })

  it("throws when item does not exist", async () => {
    vi.mocked(prisma.inventoryItem.updateMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue(null)

    await expect(InventoryService.markAsSoldForDeal("nonexistent")).rejects.toThrow("not found")
  })
})

describe("InventoryService - changeStatus enum types", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects SOLD → AVAILABLE transition for non-admin", async () => {
    vi.mocked(prisma.inventoryItem.findFirst).mockResolvedValue({
      id: "item-1",
      dealerId: "dealer-1",
      status: "SOLD",
    } as any)

    await expect(
      InventoryService.changeStatus("item-1", "dealer-1", "AVAILABLE" as any, false),
    ).rejects.toThrow("Cannot transition from SOLD to AVAILABLE")
  })

  it("allows SOLD → AVAILABLE transition for admin", async () => {
    vi.mocked(prisma.inventoryItem.findFirst).mockResolvedValue({
      id: "item-1",
      dealerId: "dealer-1",
      status: "SOLD",
    } as any)
    vi.mocked(prisma.inventoryItem.update).mockResolvedValue({
      id: "item-1",
      status: "AVAILABLE",
    } as any)

    await expect(
      InventoryService.changeStatus("item-1", "dealer-1", "AVAILABLE" as any, true),
    ).resolves.not.toThrow()
  })
})
