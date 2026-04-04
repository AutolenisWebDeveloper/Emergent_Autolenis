import { prisma } from "@/lib/db"
import { InventoryStatus } from "@/lib/constants/statuses"

export interface SearchFilters {
  makes?: string[]
  models?: string[]
  bodyStyles?: string[]
  minYear?: number
  maxYear?: number
  maxMileage?: number
  minMileage?: number
  maxPrice?: number
  minPrice?: number
  maxPriceCents?: number
  minPriceCents?: number
  isNew?: boolean
  radiusMiles?: number
  sortBy?: "price_asc" | "price_desc" | "year_desc" | "year_asc" | "mileage_asc" | "mileage_desc"
  page?: number
  pageSize?: number
  budgetOnly?: boolean
  dealerId?: string
  status?: string
  search?: string
}

const BODY_STYLES = ["Sedan", "SUV", "Truck", "Coupe", "Convertible", "Hatchback", "Wagon", "Van", "Minivan"]

function normalizeBodyStyle(input: string | undefined): string {
  if (!input) return "Other"
  const normalized = input.trim().toLowerCase()
  for (const style of BODY_STYLES) {
    if (normalized.includes(style.toLowerCase())) return style
  }
  return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase()
}

function normalizeMake(input: string): string {
  const makeMap: Record<string, string> = {
    "b.m.w.": "BMW",
    bmw: "BMW",
    mercedes: "Mercedes-Benz",
    "mercedes benz": "Mercedes-Benz",
    chevy: "Chevrolet",
    vw: "Volkswagen",
  }
  const key = input.toLowerCase().trim()
  return makeMap[key] || input.charAt(0).toUpperCase() + input.slice(1).toLowerCase()
}

export class InventoryService {
  static async search(filters: SearchFilters, buyerMaxOtdCents?: number) {
    const page = filters.page || 1
    const pageSize = Math.min(filters.pageSize || 20, 100)
    const skip = (page - 1) * pageSize

    const where: any = {
      status: (filters.status as InventoryStatus) || InventoryStatus.AVAILABLE,
    }

    // Price filters (convert to cents if needed)
    const minPriceCents = filters.minPriceCents || (filters.minPrice ? filters.minPrice * 100 : undefined)
    const maxPriceCents = filters.maxPriceCents || (filters.maxPrice ? filters.maxPrice * 100 : undefined)

    if (minPriceCents) {
      where.priceCents = { ...where.priceCents, gte: minPriceCents }
    }
    if (maxPriceCents) {
      where.priceCents = { ...where.priceCents, lte: maxPriceCents }
    }

    // Budget constraint from pre-qual
    if (filters.budgetOnly && buyerMaxOtdCents) {
      where.priceCents = { ...where.priceCents, lte: buyerMaxOtdCents }
    }

    // Mileage filters
    if (filters.minMileage !== undefined) {
      where.mileage = { ...where.mileage, gte: filters.minMileage }
    }
    if (filters.maxMileage !== undefined) {
      where.mileage = { ...where.mileage, lte: filters.maxMileage }
    }

    // New/Used filter
    if (filters.isNew !== undefined) {
      where.isNew = filters.isNew
    }

    // Dealer filter (for dealer portal)
    if (filters.dealerId) {
      where.dealerId = filters.dealerId
    }

    // Vehicle identity filters (now inline on InventoryItem)
    if (filters.makes && filters.makes.length > 0) {
      where.make = { in: filters.makes, mode: "insensitive" }
    }
    if (filters.models && filters.models.length > 0) {
      where.model = { in: filters.models, mode: "insensitive" }
    }
    if (filters.bodyStyles && filters.bodyStyles.length > 0) {
      where.bodyStyle = { in: filters.bodyStyles }
    }
    if (filters.minYear) {
      where.year = { ...where.year, gte: filters.minYear }
    }
    if (filters.maxYear) {
      where.year = { ...where.year, lte: filters.maxYear }
    }

    // Search filter (VIN, stock number, make, model)
    if (filters.search) {
      where.OR = [
        { vin: { contains: filters.search, mode: "insensitive" } },
        { stockNumber: { contains: filters.search, mode: "insensitive" } },
        { make: { contains: filters.search, mode: "insensitive" } },
        { model: { contains: filters.search, mode: "insensitive" } },
      ]
    }

    // Sorting
    let orderBy: any = { priceCents: "asc" }
    switch (filters.sortBy) {
      case "price_desc":
        orderBy = { priceCents: "desc" }
        break
      case "year_desc":
        orderBy = { year: "desc" }
        break
      case "year_asc":
        orderBy = { year: "asc" }
        break
      case "mileage_asc":
        orderBy = { mileage: "asc" }
        break
      case "mileage_desc":
        orderBy = { mileage: "desc" }
        break
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        include: {
          dealer: {
            select: {
              id: true,
              businessName: true,
              city: true,
              state: true,
              integrityScore: true,
            },
          },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.inventoryItem.count({ where }),
    ])

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  static async getById(id: string) {
    return prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        dealer: {
          select: {
            id: true,
            businessName: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zip: true,
            integrityScore: true,
          },
        },
      },
    })
  }

  static async findOrCreateVehicle(data: {
    vin?: string
    make: string
    model: string
    year: number
    trim?: string
    bodyStyle?: string
    drivetrain?: string
    engine?: string
    fuelType?: string
    transmission?: string
    exteriorColor?: string
    interiorColor?: string
    mileage?: number
    doors?: number
    seats?: number
    msrpCents?: number
  }) {
    const normalizedMake = normalizeMake(data.make)
    const normalizedBodyStyle = normalizeBodyStyle(data.bodyStyle)

    // Validate year
    const currentYear = new Date().getFullYear()
    if (data.year < 1990 || data.year > currentYear + 1) {
      throw new Error(`Invalid year: ${data.year}. Must be between 1990 and ${currentYear + 1}`)
    }

    // Vehicle.vin is required; skip Vehicle record creation when VIN is absent
    if (!data.vin) {
      // Try to find by make/model/year/trim combination
      const existingBySpec = await prisma.vehicle.findFirst({
        where: {
          make: { equals: normalizedMake, mode: "insensitive" },
          model: { equals: data.model, mode: "insensitive" },
          year: data.year,
          trim: data.trim ? { equals: data.trim, mode: "insensitive" } : undefined,
        },
      })
      if (existingBySpec) return existingBySpec
      // Cannot create Vehicle without a VIN — return null
      return null
    }

    // If VIN provided, try to find existing vehicle
    const existing = await prisma.vehicle.findFirst({
      where: { vin: data.vin },
    })
    if (existing) return existing

    // Create new vehicle (VIN is guaranteed non-empty here)
    // bodyStyle and mileage are required on the Vehicle model:
    //   - bodyStyle defaults to "Other" when the caller omits it or normalization yields empty
    //   - mileage defaults to 0 for new vehicle identity records (actual mileage lives on InventoryItem)
    return prisma.vehicle.create({
      data: {
        vin: data.vin,
        make: normalizedMake,
        model: data.model,
        year: data.year,
        trim: data.trim,
        bodyStyle: normalizedBodyStyle || "Other",
        mileage: data.mileage ?? 0,
        drivetrain: data.drivetrain,
        engine: data.engine,
        fuelType: data.fuelType,
        transmission: data.transmission,
        exteriorColor: data.exteriorColor,
        interiorColor: data.interiorColor,
      },
    })
  }

  static async createInventoryItem(
    dealerId: string,
    data: {
      // Vehicle data
      vin?: string
      make: string
      model: string
      year: number
      trim?: string
      bodyStyle?: string
      drivetrain?: string
      engine?: string
      fuelType?: string
      transmission?: string
      exteriorColor?: string
      interiorColor?: string
      // Inventory data
      stockNumber?: string
      priceCents: number
      mileage: number
      isNew: boolean
      locationName?: string
      locationCity?: string
      locationState?: string
      latitude?: number
      longitude?: number
      photosJson?: string[]
      source?: "MANUAL" | "CSV_UPLOAD" | "API_FEED"
      sourceReferenceId?: string
      workspaceId?: string
    },
  ) {
    // Validate price
    if (data.priceCents <= 0) {
      throw new Error("Price must be greater than 0")
    }
    // Validate mileage
    if (data.mileage < 0) {
      throw new Error("Mileage cannot be negative")
    }

    // Resolve workspaceId from dealer if not provided
    let workspaceId = data.workspaceId
    if (!workspaceId) {
      const dealer = await prisma.dealer.findUnique({
        where: { id: dealerId },
        select: { workspaceId: true },
      })
      workspaceId = dealer?.workspaceId || dealerId
    }

    // VIN uniqueness check: reject if any active inventory has this VIN
    if (data.vin) {
      const conflict = await prisma.inventoryItem.findFirst({
        where: {
          vin: data.vin,
          status: { notIn: [InventoryStatus.SOLD, InventoryStatus.REMOVED] },
        },
        select: { id: true, dealerId: true },
      })
      if (conflict) {
        throw new Error(
          `VIN_CONFLICT: VIN ${data.vin} is already listed as active inventory (id: ${conflict.id})`,
        )
      }
    }

    // Best-effort Vehicle record creation for cross-referencing.
    // InventoryItem stores vehicle data inline, so a missing Vehicle record does not
    // block inventory creation. When VIN is absent, findOrCreateVehicle returns null.
    const vehicle = await this.findOrCreateVehicle({
      vin: data.vin,
      make: data.make,
      model: data.model,
      year: data.year,
      trim: data.trim,
      bodyStyle: data.bodyStyle,
      drivetrain: data.drivetrain,
      engine: data.engine,
      fuelType: data.fuelType,
      transmission: data.transmission,
      exteriorColor: data.exteriorColor,
      interiorColor: data.interiorColor,
      mileage: data.mileage,
    })
    if (!vehicle && data.vin) {
      console.warn(`[InventoryService] Vehicle record could not be created for VIN ${data.vin}`)
    }

    // Create inventory item with inline vehicle data
    return prisma.inventoryItem.create({
      data: {
        dealerId,
        workspaceId,
        vin: data.vin,
        stockNumber: data.stockNumber || `STK-${Date.now()}`,
        priceCents: data.priceCents,
        year: data.year,
        make: data.make,
        model: data.model,
        trim: data.trim,
        bodyStyle: data.bodyStyle,
        fuelType: data.fuelType,
        transmission: data.transmission,
        exteriorColor: data.exteriorColor,
        interiorColor: data.interiorColor,
        mileage: data.mileage,
        isNew: data.isNew,
        status: InventoryStatus.AVAILABLE,
        locationName: data.locationName,
        locationCity: data.locationCity,
        locationState: data.locationState,
        latitude: data.latitude,
        longitude: data.longitude,
        photosJson: data.photosJson || [],
        source: data.source || "MANUAL",
        sourceReferenceId: data.sourceReferenceId,
        lastSyncedAt: new Date(),
      },
      include: { dealer: true },
    })
  }

  static async updateInventoryItem(
    itemId: string,
    dealerId: string,
    data: {
      priceCents?: number
      mileage?: number
      status?: InventoryStatus
      stockNumber?: string
      locationName?: string
      locationCity?: string
      locationState?: string
      exteriorColorOverride?: string
      interiorColorOverride?: string
      photosJson?: string[]
    },
  ) {
    // Verify ownership
    const existing = await prisma.inventoryItem.findFirst({
      where: { id: itemId, dealerId },
    })
    if (!existing) {
      throw new Error("Inventory item not found or not owned by dealer")
    }

    return prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })
  }

  static async changeStatus(
    itemId: string,
    dealerId: string,
    newStatus: InventoryStatus,
    isAdmin = false,
  ) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: itemId, dealerId },
    })
    if (!item) {
      throw new Error("Inventory item not found or not owned by dealer")
    }

    // Status transition rules
    const currentStatus = item.status
    const invalidTransitions: Partial<Record<InventoryStatus, InventoryStatus[]>> = {
      [InventoryStatus.SOLD]: isAdmin ? [] : [InventoryStatus.AVAILABLE, InventoryStatus.HOLD],
      [InventoryStatus.REMOVED]: isAdmin ? [] : [InventoryStatus.AVAILABLE],
    }

    if (invalidTransitions[currentStatus as InventoryStatus]?.includes(newStatus)) {
      throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`)
    }

    return prisma.inventoryItem.update({
      where: { id: itemId },
      data: { status: newStatus, updatedAt: new Date() },
    })
  }

  static async bulkImport(
    dealerId: string,
    rows: Array<{
      vin?: string
      stockNumber?: string
      year: number
      make: string
      model: string
      trim?: string
      price: number
      mileage: number
      isNew: boolean
      exteriorColor?: string
      interiorColor?: string
      bodyStyle?: string
      location?: string
    }>,
  ) {
    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as Array<{ rowIndex: number; message: string }>,
    }

    // Create import job record
    const importJob = await prisma.inventoryImportJob.create({
      data: {
        dealerId,
        status: "PROCESSING",
        totalRows: rows.length,
        startedAt: new Date(),
      },
    })

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row) continue
      
      try {
        // Validate required fields
        if (!row.make || !row.model || !row.year || row.price === undefined) {
          throw new Error("Missing required fields: make, model, year, or price")
        }

        const priceCents = Math.round(row.price * 100)
        if (priceCents <= 0) {
          throw new Error("Price must be greater than 0")
        }

        // Try to find existing inventory by VIN or stock number
        let existing = null
        if (row.vin) {
          existing = await prisma.inventoryItem.findFirst({
            where: { dealerId, vin: row.vin },
          })
        }
        if (!existing && row.stockNumber) {
          existing = await prisma.inventoryItem.findFirst({
            where: { dealerId, stockNumber: row.stockNumber },
          })
        }

        if (existing) {
          // Update existing
          await this.updateInventoryItem(existing.id, dealerId, {
            priceCents,
            mileage: row.mileage || 0,
            status: InventoryStatus.AVAILABLE,
            exteriorColorOverride: row.exteriorColor,
            interiorColorOverride: row.interiorColor,
          })
          results.updated++
        } else {
          // Create new
          await this.createInventoryItem(dealerId, {
            vin: row.vin,
            make: row.make,
            model: row.model,
            year: row.year,
            trim: row.trim,
            bodyStyle: row.bodyStyle,
            exteriorColor: row.exteriorColor,
            interiorColor: row.interiorColor,
            stockNumber: row.stockNumber,
            priceCents,
            mileage: row.mileage || 0,
            isNew: row.isNew,
            locationName: row.location,
            source: "CSV_UPLOAD",
          })
          results.created++
        }
      } catch (error: unknown) {
        results.failed++
        results.errors.push({ rowIndex: i, message: (error instanceof Error ? error.message : String(error)) })
      }
    }

    // Update import job
    await prisma.inventoryImportJob.update({
      where: { id: importJob.id },
      data: {
        status: "COMPLETED",
        createdCount: results.created,
        updatedCount: results.updated,
        failedCount: results.failed,
        errorsJson: results.errors,
        completedAt: new Date(),
      },
    })

    return results
  }

  static async markAsSoldForDeal(inventoryItemId: string) {
    // Optimistic locking: only update if still AVAILABLE or HOLD (not already SOLD/REMOVED)
    const updated = await prisma.inventoryItem.updateMany({
      where: {
        id: inventoryItemId,
        status: { in: [InventoryStatus.AVAILABLE, InventoryStatus.HOLD] },
      },
      data: { status: InventoryStatus.SOLD, soldAt: new Date(), updatedAt: new Date() },
    })
    if (updated.count === 0) {
      // Item was already sold or removed — check if it truly exists
      const item = await prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } })
      if (!item) {
        throw new Error(`Inventory item ${inventoryItemId} not found`)
      }
      if (item.status === InventoryStatus.SOLD) {
        // Idempotent: already sold, return it
        return item
      }
      throw new Error(
        `INVENTORY_ALREADY_SOLD: Item ${inventoryItemId} was already sold or removed. Concurrent transaction detected.`,
      )
    }
    return prisma.inventoryItem.findUnique({ where: { id: inventoryItemId } })
  }

  // Filter options derived from actual available inventory
  static async getAvailableMakes() {
    const items = await prisma.inventoryItem.findMany({
      where: { status: InventoryStatus.AVAILABLE },
      distinct: ["make"],
      select: { make: true },
      orderBy: { make: "asc" },
    })
    return items.map((v: { make: string | null }) => v.make).filter(Boolean)
  }

  static async getAvailableBodyStyles() {
    const items = await prisma.inventoryItem.findMany({
      where: { status: InventoryStatus.AVAILABLE },
      distinct: ["bodyStyle"],
      select: { bodyStyle: true },
      orderBy: { bodyStyle: "asc" },
    })
    return items.map((v: { bodyStyle: string | null }) => v.bodyStyle).filter(Boolean)
  }

  static async getModelsForMake(make: string) {
    const items = await prisma.inventoryItem.findMany({
      where: {
        status: InventoryStatus.AVAILABLE,
        make: { equals: make, mode: "insensitive" },
      },
      distinct: ["model"],
      select: { model: true },
      orderBy: { model: "asc" },
    })
    return items.map((v: { model: string | null }) => v.model).filter(Boolean)
  }
}

export const inventoryService = new InventoryService()
export default inventoryService
