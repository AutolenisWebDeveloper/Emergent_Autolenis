import { prisma } from "@/lib/prisma"

/**
 * Inventory Search Service
 * Search across verified and market inventory lanes.
 */

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 20

export type SourceType = "verified" | "market"
export type TrustLabel = "Verified Available" | "Likely Available" | "Availability Unconfirmed"

export interface SearchParams {
  query?: string
  make?: string
  model?: string
  yearMin?: number
  yearMax?: number
  priceMin?: number
  priceMax?: number
  bodyStyle?: string
  zip?: string
  radiusMiles?: number
  source?: "all" | "verified" | "market"
  sortBy?: string
  page?: number
  perPage?: number
  maxBudgetCents?: number
}

export interface SearchResult {
  id: string
  vin: string | null
  year: number
  make: string
  model: string
  trim: string | null
  mileage: number | null
  priceCents: number | null
  bodyStyle: string | null
  exteriorColor: string | null
  images: string[]
  status: string
  sourceType: SourceType
  trustLabel: TrustLabel
  dealerId?: string
  dealerName?: string | null
  dealerZip?: string | null
  confidence?: number
}

function trustLabelFor(sourceType: SourceType, confidence?: number): TrustLabel {
  if (sourceType === "verified") return "Verified Available"
  if (confidence != null && confidence >= 0.75) return "Likely Available"
  return "Availability Unconfirmed"
}

export async function searchInventory(params: SearchParams): Promise<{
  results: SearchResult[]
  total: number
  page: number
  perPage: number
}> {
  const page = Math.max(1, params.page ?? DEFAULT_PAGE)
  const perPage = Math.min(100, Math.max(1, params.perPage ?? DEFAULT_PER_PAGE))
  const sourceFilter = params.source ?? "all"

  const verifiedResults: SearchResult[] = []
  const marketResults: SearchResult[] = []
  let verifiedTotal = 0
  let marketTotal = 0

  if (sourceFilter === "all" || sourceFilter === "verified") {
    const where = buildVerifiedWhere(params)
    const [rows, count] = await Promise.all([
      prisma.inventoryVerifiedVehicle.findMany({
        where,
        orderBy: buildSortOrder(params.sortBy),
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.inventoryVerifiedVehicle.count({ where }),
    ])
    verifiedTotal = count

    for (const r of rows) {
      verifiedResults.push({
        id: r.id,
        vin: r.vin,
        year: r.year,
        make: r.make,
        model: r.model,
        trim: r.trim,
        mileage: r.mileage,
        priceCents: r.priceCents,
        bodyStyle: r.bodyStyle,
        exteriorColor: r.exteriorColor,
        images: r.images,
        status: String(r.status),
        sourceType: "verified",
        trustLabel: "Verified Available",
        dealerId: r.dealerId,
      })
    }
  }

  if (sourceFilter === "all" || sourceFilter === "market") {
    const where = buildMarketWhere(params)
    const [rows, count] = await Promise.all([
      prisma.inventoryMarketVehicle.findMany({
        where,
        orderBy: buildSortOrder(params.sortBy),
        skip: sourceFilter === "market" ? (page - 1) * perPage : 0,
        take: sourceFilter === "market" ? perPage : Math.max(0, perPage - verifiedResults.length),
      }),
      prisma.inventoryMarketVehicle.count({ where }),
    ])
    marketTotal = count

    for (const r of rows) {
      marketResults.push({
        id: r.id,
        vin: r.vin ?? null,
        year: r.year,
        make: r.make,
        model: r.model,
        trim: r.trim,
        mileage: r.mileage,
        priceCents: r.priceCents,
        bodyStyle: r.bodyStyle,
        exteriorColor: r.exteriorColor,
        images: r.images,
        status: String(r.status),
        sourceType: "market",
        trustLabel: trustLabelFor("market", r.confidence),
        dealerName: r.dealerName,
        dealerZip: r.dealerZip,
        confidence: r.confidence,
      })
    }
  }

  // Suppress market results that duplicate a verified result for the same VIN
  const verifiedVins = new Set(
    verifiedResults
      .filter((v) => v.vin)
      .map((v) => v.vin),
  )
  const dedupedMarket = marketResults.filter((m) => {
    if (!m.vin) return true
    return !verifiedVins.has(m.vin)
  })

  // Verified results come first
  const results = [...verifiedResults, ...dedupedMarket]
  const total = verifiedTotal + dedupedMarket.length

  return { results, total, page, perPage }
}

export async function getVerifiedVehicleById(id: string) {
  if (!id) throw new Error("id is required")

  const vehicle = await prisma.inventoryVerifiedVehicle.findUnique({
    where: { id },
    include: { priceHistory: { orderBy: { recordedAt: "desc" }, take: 10 } },
  })
  if (!vehicle) throw new Error(`Verified vehicle not found: ${id}`)
  return vehicle
}

export async function getMarketVehicleById(id: string) {
  if (!id) throw new Error("id is required")

  const vehicle = await prisma.inventoryMarketVehicle.findUnique({
    where: { id },
    include: { priceHistory: { orderBy: { recordedAt: "desc" }, take: 10 } },
  })
  if (!vehicle) throw new Error(`Market vehicle not found: ${id}`)
  return vehicle
}

export async function getAvailableFilters(): Promise<{
  makes: string[]
  models: string[]
  bodyStyles: string[]
  yearRange: { min: number; max: number } | null
}> {
  const [verifiedAgg, marketAgg] = await Promise.all([
    prisma.inventoryVerifiedVehicle.findMany({
      where: { status: "AVAILABLE" as never },
      select: { make: true, model: true, bodyStyle: true, year: true },
      distinct: ["make", "model", "bodyStyle", "year"],
    }),
    prisma.inventoryMarketVehicle.findMany({
      where: { status: "ACTIVE" as never },
      select: { make: true, model: true, bodyStyle: true, year: true },
      distinct: ["make", "model", "bodyStyle", "year"],
    }),
  ])

  const all = [...verifiedAgg, ...marketAgg]

  const makes = [...new Set(all.map((v) => v.make))].sort()
  const models = [...new Set(all.map((v) => v.model))].sort()
  const bodyStyles = [...new Set(all.map((v) => v.bodyStyle).filter(Boolean) as string[])].sort()

  const years = all.map((v) => v.year)
  const yearRange =
    years.length > 0
      ? { min: Math.min(...years), max: Math.max(...years) }
      : null

  return { makes, models, bodyStyles, yearRange }
}

/* ── helpers ──────────────────────────────────────────────────── */

function buildVerifiedWhere(params: SearchParams) {
  const where: Record<string, unknown> = { status: "AVAILABLE" }
  if (params.make) where.make = { contains: params.make, mode: "insensitive" }
  if (params.model) where.model = { contains: params.model, mode: "insensitive" }
  if (params.yearMin || params.yearMax) {
    where.year = {
      ...(params.yearMin ? { gte: params.yearMin } : {}),
      ...(params.yearMax ? { lte: params.yearMax } : {}),
    }
  }
  if (params.priceMin || params.priceMax || params.maxBudgetCents) {
    const maxPrice = params.maxBudgetCents ?? params.priceMax
    where.priceCents = {
      ...(params.priceMin ? { gte: params.priceMin } : {}),
      ...(maxPrice ? { lte: maxPrice } : {}),
    }
  }
  if (params.bodyStyle) where.bodyStyle = { equals: params.bodyStyle, mode: "insensitive" }
  if (params.zip) where.location = { contains: params.zip }
  return where
}

function buildMarketWhere(params: SearchParams) {
  const where: Record<string, unknown> = { status: "ACTIVE" }
  if (params.make) where.make = { contains: params.make, mode: "insensitive" }
  if (params.model) where.model = { contains: params.model, mode: "insensitive" }
  if (params.yearMin || params.yearMax) {
    where.year = {
      ...(params.yearMin ? { gte: params.yearMin } : {}),
      ...(params.yearMax ? { lte: params.yearMax } : {}),
    }
  }
  if (params.priceMin || params.priceMax || params.maxBudgetCents) {
    const maxPrice = params.maxBudgetCents ?? params.priceMax
    where.priceCents = {
      ...(params.priceMin ? { gte: params.priceMin } : {}),
      ...(maxPrice ? { lte: maxPrice } : {}),
    }
  }
  if (params.bodyStyle) where.bodyStyle = { equals: params.bodyStyle, mode: "insensitive" }
  if (params.zip) where.dealerZip = params.zip
  return where
}

function buildSortOrder(sortBy?: string): Record<string, string> {
  switch (sortBy) {
    case "price_asc":
      return { priceCents: "asc" }
    case "price_desc":
      return { priceCents: "desc" }
    case "year_desc":
      return { year: "desc" }
    case "year_asc":
      return { year: "asc" }
    case "mileage_asc":
      return { mileage: "asc" }
    default:
      return { createdAt: "desc" }
  }
}
