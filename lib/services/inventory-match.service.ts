import { prisma } from "@/lib/prisma"

/**
 * Inventory Match Service
 * Match buyer requests to available inventory across verified and market lanes.
 */

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 20

export interface VehicleSpec {
  make: string
  model: string
  year: number
  priceCents?: number
  mileage?: number
  bodyStyle?: string
}

export interface RequestSpec {
  make: string
  model?: string
  yearMin: number
  yearMax: number
  budgetCents?: number
  mileageMax?: number
  bodyStyle?: string
}

export function scoreMatch(vehicle: VehicleSpec, request: RequestSpec): number {
  let score = 0
  let factors = 0

  // Make match (required)
  if (vehicle.make.toLowerCase() !== request.make.toLowerCase()) return 0
  score += 1
  factors += 1

  // Model match
  if (request.model) {
    factors += 1
    if (vehicle.model.toLowerCase() === request.model.toLowerCase()) {
      score += 1
    }
  }

  // Year range
  factors += 1
  if (vehicle.year >= request.yearMin && vehicle.year <= request.yearMax) {
    score += 1
  } else {
    // Partial credit for close years
    const yearDist = Math.min(
      Math.abs(vehicle.year - request.yearMin),
      Math.abs(vehicle.year - request.yearMax)
    )
    if (yearDist <= 2) score += 0.5
  }

  // Budget
  if (request.budgetCents && vehicle.priceCents) {
    factors += 1
    if (vehicle.priceCents <= request.budgetCents) {
      score += 1
    } else {
      const overBudgetPct = (vehicle.priceCents - request.budgetCents) / request.budgetCents
      if (overBudgetPct <= 0.1) score += 0.5
    }
  }

  // Mileage
  if (request.mileageMax && vehicle.mileage != null) {
    factors += 1
    if (vehicle.mileage <= request.mileageMax) {
      score += 1
    } else {
      const overMileagePct = (vehicle.mileage - request.mileageMax) / request.mileageMax
      if (overMileagePct <= 0.15) score += 0.5
    }
  }

  // Body style
  if (request.bodyStyle && vehicle.bodyStyle) {
    factors += 1
    if (vehicle.bodyStyle.toLowerCase() === request.bodyStyle.toLowerCase()) {
      score += 1
    }
  }

  return factors > 0 ? score / factors : 0
}

export async function matchBuyerRequest(buyerRequestId: string): Promise<{
  matchesCreated: number
  verifiedMatches: number
  marketMatches: number
}> {
  if (!buyerRequestId) throw new Error("buyerRequestId is required")

  const requestItems = await prisma.vehicleRequestItem.findMany({
    where: { caseId: buyerRequestId },
  })
  if (requestItems.length === 0) {
    throw new Error(`No request items found for case: ${buyerRequestId}`)
  }

  let totalCreated = 0
  let verifiedCount = 0
  let marketCount = 0

  for (const item of requestItems) {
    const requestSpec: RequestSpec = {
      make: item.make,
      model: item.model ?? undefined,
      yearMin: item.yearMin,
      yearMax: item.yearMax,
      budgetCents: item.budgetTargetCents,
      mileageMax: item.mileageMax ?? undefined,
    }

    // Search verified vehicles
    const verifiedVehicles = await prisma.inventoryVerifiedVehicle.findMany({
      where: {
        status: "AVAILABLE" as never,
        make: { equals: item.make, mode: "insensitive" },
        year: { gte: item.yearMin, lte: item.yearMax },
        ...(item.model ? { model: { equals: item.model, mode: "insensitive" } } : {}),
      },
      take: 50,
    })

    for (const v of verifiedVehicles) {
      const vehicleSpec: VehicleSpec = {
        make: v.make,
        model: v.model,
        year: v.year,
        priceCents: v.priceCents ?? undefined,
        mileage: v.mileage ?? undefined,
        bodyStyle: v.bodyStyle ?? undefined,
      }
      const matchScore = scoreMatch(vehicleSpec, requestSpec)
      if (matchScore >= 0.5) {
        await prisma.buyerRequestInventoryMatch.create({
          data: {
            buyerRequestId,
            verifiedVehicleId: v.id,
            coverageType: "verified",
            matchScore,
          },
        })
        verifiedCount++
        totalCreated++
      }
    }

    // Search market vehicles
    const marketVehicles = await prisma.inventoryMarketVehicle.findMany({
      where: {
        status: "ACTIVE" as never,
        make: { equals: item.make, mode: "insensitive" },
        year: { gte: item.yearMin, lte: item.yearMax },
        ...(item.model ? { model: { equals: item.model, mode: "insensitive" } } : {}),
      },
      take: 50,
    })

    for (const v of marketVehicles) {
      const vehicleSpec: VehicleSpec = {
        make: v.make,
        model: v.model,
        year: v.year,
        priceCents: v.priceCents ?? undefined,
        mileage: v.mileage ?? undefined,
        bodyStyle: v.bodyStyle ?? undefined,
      }
      const matchScore = scoreMatch(vehicleSpec, requestSpec)
      if (matchScore >= 0.5) {
        await prisma.buyerRequestInventoryMatch.create({
          data: {
            buyerRequestId,
            marketVehicleId: v.id,
            coverageType: "market",
            matchScore,
          },
        })
        marketCount++
        totalCreated++
      }
    }
  }

  return { matchesCreated: totalCreated, verifiedMatches: verifiedCount, marketMatches: marketCount }
}

export async function getMatchesForRequest(
  buyerRequestId: string,
  page?: number
): Promise<{ matches: unknown[]; total: number; page: number; perPage: number }> {
  if (!buyerRequestId) throw new Error("buyerRequestId is required")

  const p = Math.max(1, page ?? DEFAULT_PAGE)

  const where = { buyerRequestId }

  const [matches, total] = await Promise.all([
    prisma.buyerRequestInventoryMatch.findMany({
      where,
      orderBy: { matchScore: "desc" },
      skip: (p - 1) * DEFAULT_PER_PAGE,
      take: DEFAULT_PER_PAGE,
      include: {
        verifiedVehicle: true,
        marketVehicle: true,
      },
    }),
    prisma.buyerRequestInventoryMatch.count({ where }),
  ])

  return { matches, total, page: p, perPage: DEFAULT_PER_PAGE }
}

export async function getMatchStatus(buyerRequestId: string): Promise<{
  total: number
  byStatus: Record<string, number>
  byCoverageType: Record<string, number>
}> {
  if (!buyerRequestId) throw new Error("buyerRequestId is required")

  const matches = await prisma.buyerRequestInventoryMatch.findMany({
    where: { buyerRequestId },
    select: { status: true, coverageType: true },
  })

  const byStatus: Record<string, number> = {}
  const byCoverageType: Record<string, number> = {}

  for (const m of matches) {
    const status = String(m.status)
    byStatus[status] = (byStatus[status] ?? 0) + 1
    if (m.coverageType) {
      byCoverageType[m.coverageType] = (byCoverageType[m.coverageType] ?? 0) + 1
    }
  }

  return { total: matches.length, byStatus, byCoverageType }
}

export async function updateMatchStatus(
  matchId: string,
  status: string,
  auctionInvitationId?: string,
  dealerInviteId?: string
) {
  if (!matchId) throw new Error("matchId is required")
  if (!status) throw new Error("status is required")

  const match = await prisma.buyerRequestInventoryMatch.findUnique({
    where: { id: matchId },
  })
  if (!match) throw new Error(`Match not found: ${matchId}`)

  return prisma.buyerRequestInventoryMatch.update({
    where: { id: matchId },
    data: {
      status: status as never,
      ...(auctionInvitationId ? { auctionInvitationId } : {}),
      ...(dealerInviteId ? { dealerInviteId } : {}),
    },
  })
}
