import { prisma } from "@/lib/prisma"

/**
 * Inventory Dedupe Service
 * Detect and group duplicate inventory across sources.
 */

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 20

export async function findDuplicatesByVin(vin: string) {
  if (!vin || typeof vin !== "string") {
    throw new Error("VIN is required")
  }

  const normalized = vin.trim().toUpperCase()
  if (normalized.length !== 17) {
    throw new Error("VIN must be 17 characters")
  }

  return prisma.inventoryMarketVehicle.findMany({
    where: { vin: normalized, status: { not: "SUPPRESSED" } },
    orderBy: { lastSeenAt: "desc" },
  })
}

export async function createDuplicateGroup(vin: string, vehicleIds: string[]) {
  if (!vin) throw new Error("VIN is required")
  if (!vehicleIds || vehicleIds.length < 2) {
    throw new Error("At least 2 vehicle IDs are required to form a duplicate group")
  }

  const group = await prisma.inventoryDuplicateGroup.create({
    data: {
      vin: vin.trim().toUpperCase(),
      status: "pending",
    },
  })

  const memberInserts = vehicleIds.map((vehicleId) =>
    prisma.inventoryDuplicateGroupMember.create({
      data: {
        groupId: group.id,
        marketVehicleId: vehicleId,
        isPrimary: false,
      },
    })
  )

  await Promise.all(memberInserts)

  return prisma.inventoryDuplicateGroup.findUnique({
    where: { id: group.id },
    include: { members: { include: { marketVehicle: true } } },
  })
}

export async function getDuplicateGroups(filters: {
  status?: string
  page?: number
  perPage?: number
}): Promise<{ groups: unknown[]; total: number; page: number; perPage: number }> {
  const page = Math.max(1, filters.page ?? DEFAULT_PAGE)
  const perPage = Math.min(100, Math.max(1, filters.perPage ?? DEFAULT_PER_PAGE))

  const where: Record<string, unknown> = {}
  if (filters.status) where.status = filters.status

  const [groups, total] = await Promise.all([
    prisma.inventoryDuplicateGroup.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        members: {
          include: {
            marketVehicle: {
              select: { id: true, vin: true, make: true, model: true, year: true, priceCents: true },
            },
          },
        },
      },
    }),
    prisma.inventoryDuplicateGroup.count({ where }),
  ])

  return { groups, total, page, perPage }
}

export async function getDuplicateGroupById(groupId: string) {
  if (!groupId) throw new Error("groupId is required")

  const group = await prisma.inventoryDuplicateGroup.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { marketVehicle: true, verifiedVehicle: true },
      },
    },
  })

  if (!group) throw new Error(`Duplicate group not found: ${groupId}`)
  return group
}

export async function resolveDuplicateGroup(
  groupId: string,
  primaryId: string,
  resolvedBy: string
) {
  if (!groupId) throw new Error("groupId is required")
  if (!primaryId) throw new Error("primaryId is required")
  if (!resolvedBy) throw new Error("resolvedBy is required")

  const group = await prisma.inventoryDuplicateGroup.findUnique({
    where: { id: groupId },
    include: { members: true },
  })

  if (!group) throw new Error(`Duplicate group not found: ${groupId}`)

  const memberIds = group.members.map((m: { marketVehicleId: string | null }) => m.marketVehicleId).filter(Boolean)
  if (!memberIds.includes(primaryId)) {
    throw new Error(`primaryId ${primaryId} is not a member of this group`)
  }

  // Mark the primary member
  const memberUpdates = group.members.map((m: { id: string; marketVehicleId: string | null }) =>
    prisma.inventoryDuplicateGroupMember.update({
      where: { id: m.id },
      data: { isPrimary: m.marketVehicleId === primaryId },
    })
  )

  const [updatedGroup] = await Promise.all([
    prisma.inventoryDuplicateGroup.update({
      where: { id: groupId },
      data: {
        status: "resolved",
        resolvedAt: new Date(),
        resolvedBy,
        resolution: `Primary selected: ${primaryId}`,
      },
    }),
    ...memberUpdates,
  ])

  return updatedGroup
}

export async function runDeduplication(): Promise<{
  groupsCreated: number
  vehiclesProcessed: number
  duplicatesFound: number
}> {
  // Find all VINs with more than one market vehicle
  const duplicateVins = await prisma.inventoryMarketVehicle.groupBy({
    by: ["vin"],
    where: {
      vin: { not: null },
      status: { not: "SUPPRESSED" },
    },
    having: {
      vin: { _count: { gt: 1 } },
    },
  })

  let groupsCreated = 0
  let duplicatesFound = 0

  for (const entry of duplicateVins) {
    if (!entry.vin) continue

    // Skip if there's already an active group for this VIN
    const existingGroup = await prisma.inventoryDuplicateGroup.findFirst({
      where: { vin: entry.vin, status: "pending" },
    })
    if (existingGroup) continue

    const vehicles = await prisma.inventoryMarketVehicle.findMany({
      where: { vin: entry.vin, status: { not: "SUPPRESSED" } },
      select: { id: true },
    })

    if (vehicles.length < 2) continue

    await createDuplicateGroup(
      entry.vin,
      vehicles.map((v: { id: string }) => v.id)
    )
    groupsCreated++
    duplicatesFound += vehicles.length
  }

  return {
    groupsCreated,
    vehiclesProcessed: duplicateVins.length,
    duplicatesFound,
  }
}
