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

describe("InventoryService - findOrCreateVehicle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null when VIN is not provided and no spec match exists", async () => {
    vi.mocked(prisma.vehicle.findFirst).mockResolvedValueOnce(null)

    const result = await InventoryService.findOrCreateVehicle({
      make: "Honda",
      model: "Civic",
      year: 2021,
    })
    expect(result).toBeNull()
    expect(prisma.vehicle.create).not.toHaveBeenCalled()
  })

  it("returns existing vehicle when VIN matches", async () => {
    vi.mocked(prisma.vehicle.findFirst).mockResolvedValueOnce({
      id: "v-1",
      vin: "1HGBH41JXMN109186",
      make: "Honda",
      model: "Civic",
      year: 2021,
    } as any)

    const result = await InventoryService.findOrCreateVehicle({
      vin: "1HGBH41JXMN109186",
      make: "Honda",
      model: "Civic",
      year: 2021,
    })
    expect(result).toMatchObject({ id: "v-1" })
  })

  it("creates new Vehicle when VIN is provided but not found", async () => {
    vi.mocked(prisma.vehicle.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.vehicle.create).mockResolvedValue({
      id: "v-new",
      vin: "1HGBH41JXMN109186",
      make: "Honda",
      model: "Civic",
      year: 2021,
      bodyStyle: "Sedan",
      mileage: 5000,
    } as any)

    const result = await InventoryService.findOrCreateVehicle({
      vin: "1HGBH41JXMN109186",
      make: "Honda",
      model: "Civic",
      year: 2021,
      bodyStyle: "Sedan",
      mileage: 5000,
    })
    expect(result).toMatchObject({ id: "v-new" })
    expect(prisma.vehicle.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          vin: "1HGBH41JXMN109186",
          bodyStyle: "Sedan",
          mileage: 5000,
        }),
      }),
    )
  })

  it("defaults bodyStyle to 'Other' and mileage to 0 when not provided", async () => {
    vi.mocked(prisma.vehicle.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.vehicle.create).mockResolvedValue({
      id: "v-new",
      vin: "1HGBH41JXMN109186",
      make: "Honda",
      model: "Civic",
      year: 2021,
      bodyStyle: "Other",
      mileage: 0,
    } as any)

    await InventoryService.findOrCreateVehicle({
      vin: "1HGBH41JXMN109186",
      make: "Honda",
      model: "Civic",
      year: 2021,
    })
    expect(prisma.vehicle.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bodyStyle: "Other",
          mileage: 0,
        }),
      }),
    )
  })
})

describe("InventoryService - filter methods query inventoryItem", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("getAvailableMakes queries inventoryItem with AVAILABLE status", async () => {
    vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([
      { make: "Honda" },
      { make: "Toyota" },
    ] as any)

    const makes = await InventoryService.getAvailableMakes()
    expect(makes).toEqual(["Honda", "Toyota"])
    expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "AVAILABLE" },
        distinct: ["make"],
      }),
    )
  })

  it("getAvailableBodyStyles queries inventoryItem with AVAILABLE status", async () => {
    vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([
      { bodyStyle: "Sedan" },
      { bodyStyle: "SUV" },
    ] as any)

    const styles = await InventoryService.getAvailableBodyStyles()
    expect(styles).toEqual(["Sedan", "SUV"])
    expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "AVAILABLE" },
        distinct: ["bodyStyle"],
      }),
    )
  })

  it("getModelsForMake queries inventoryItem scoped by make", async () => {
    vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([
      { model: "Civic" },
      { model: "Accord" },
    ] as any)

    const models = await InventoryService.getModelsForMake("Honda")
    expect(models).toEqual(["Civic", "Accord"])
    expect(prisma.inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "AVAILABLE",
          make: { equals: "Honda", mode: "insensitive" },
        }),
        distinct: ["model"],
      }),
    )
  })
})
