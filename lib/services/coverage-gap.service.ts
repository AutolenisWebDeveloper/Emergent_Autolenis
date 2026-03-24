import { prisma } from "@/lib/prisma"

/**
 * Coverage Gap Service
 * Detect and manage coverage gaps where buyer requests lack matching inventory or dealers.
 */

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 20

export async function detectGaps(buyerRequestId: string): Promise<{
  hasGap: boolean
  verifiedCount: number
  marketCount: number
  networkDealerCount: number
}> {
  if (!buyerRequestId) throw new Error("buyerRequestId is required")

  const requestCase = await prisma.vehicleRequestCase.findUnique({
    where: { id: buyerRequestId },
    select: { id: true, marketZip: true, radiusMiles: true },
  })
  if (!requestCase) throw new Error(`Buyer request case not found: ${buyerRequestId}`)

  const items = await prisma.vehicleRequestItem.findMany({
    where: { caseId: buyerRequestId },
    select: { make: true, model: true, yearMin: true, yearMax: true },
  })

  if (items.length === 0) {
    return { hasGap: true, verifiedCount: 0, marketCount: 0, networkDealerCount: 0 }
  }

  // Check verified matches
  const verifiedCount = await prisma.buyerRequestInventoryMatch.count({
    where: {
      buyerRequestId,
      verifiedVehicleId: { not: null },
      status: "PENDING" as never,
    },
  })

  // Check market matches
  const marketCount = await prisma.buyerRequestInventoryMatch.count({
    where: {
      buyerRequestId,
      marketVehicleId: { not: null },
      status: "PENDING" as never,
    },
  })

  // Check network dealers in area
  const networkDealerCount = await prisma.dealerProspect.count({
    where: {
      zip: requestCase.marketZip,
      status: "CONVERTED" as never,
    },
  })

  const hasGap = verifiedCount === 0 && networkDealerCount === 0

  return { hasGap, verifiedCount, marketCount, networkDealerCount }
}

export async function createGapTask(params: {
  buyerRequestId?: string
  marketZip: string
  radiusMiles?: number
  make?: string
  model?: string
  yearMin?: number
  yearMax?: number
}): Promise<unknown> {
  if (!params.marketZip) throw new Error("marketZip is required")

  return prisma.coverageGapTask.create({
    data: {
      buyerRequestId: params.buyerRequestId ?? null,
      marketZip: params.marketZip,
      radiusMiles: params.radiusMiles ?? 50,
      make: params.make ?? null,
      model: params.model ?? null,
      yearMin: params.yearMin ?? null,
      yearMax: params.yearMax ?? null,
      status: "OPEN" as never,
    },
  })
}

export async function getGapTasks(filters: {
  status?: string
  marketZip?: string
  page?: number
  perPage?: number
}): Promise<{ tasks: unknown[]; total: number; page: number; perPage: number }> {
  const page = Math.max(1, filters.page ?? DEFAULT_PAGE)
  const perPage = Math.min(100, Math.max(1, filters.perPage ?? DEFAULT_PER_PAGE))

  const where: Record<string, unknown> = {}
  if (filters.status) where.status = filters.status
  if (filters.marketZip) where.marketZip = filters.marketZip

  const [tasks, total] = await Promise.all([
    prisma.coverageGapTask.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.coverageGapTask.count({ where }),
  ])

  return { tasks, total, page, perPage }
}

export async function getGapTaskById(taskId: string) {
  if (!taskId) throw new Error("taskId is required")

  const task = await prisma.coverageGapTask.findUnique({
    where: { id: taskId },
  })
  if (!task) throw new Error(`Coverage gap task not found: ${taskId}`)
  return task
}

export async function resolveGapTask(
  taskId: string,
  resolvedBy: string,
  resolution: string
) {
  if (!taskId) throw new Error("taskId is required")
  if (!resolvedBy) throw new Error("resolvedBy is required")
  if (!resolution) throw new Error("resolution is required")

  const task = await prisma.coverageGapTask.findUnique({
    where: { id: taskId },
  })
  if (!task) throw new Error(`Coverage gap task not found: ${taskId}`)

  return prisma.coverageGapTask.update({
    where: { id: taskId },
    data: {
      status: "RESOLVED" as never,
      resolvedAt: new Date(),
      resolvedBy,
      resolution,
    },
  })
}

export async function dismissGapTask(taskId: string, resolvedBy: string) {
  if (!taskId) throw new Error("taskId is required")
  if (!resolvedBy) throw new Error("resolvedBy is required")

  const task = await prisma.coverageGapTask.findUnique({
    where: { id: taskId },
  })
  if (!task) throw new Error(`Coverage gap task not found: ${taskId}`)

  return prisma.coverageGapTask.update({
    where: { id: taskId },
    data: {
      status: "DISMISSED" as never,
      resolvedAt: new Date(),
      resolvedBy,
      resolution: "Dismissed",
    },
  })
}

export async function inviteForGap(
  taskId: string,
  prospectId: string,
  performedBy: string
): Promise<{ invite: unknown; token: string }> {
  if (!taskId) throw new Error("taskId is required")
  if (!prospectId) throw new Error("prospectId is required")
  if (!performedBy) throw new Error("performedBy is required")

  const task = await prisma.coverageGapTask.findUnique({
    where: { id: taskId },
  })
  if (!task) throw new Error(`Coverage gap task not found: ${taskId}`)

  const prospect = await prisma.dealerProspect.findUnique({
    where: { id: prospectId },
    select: { id: true, email: true, businessName: true, phone: true, status: true },
  })
  if (!prospect) throw new Error(`Prospect not found: ${prospectId}`)

  const { createHash, randomBytes } = await import("crypto")
  const rawToken = randomBytes(32).toString("hex")
  const tokenHash = createHash("sha256").update(rawToken).digest("hex")

  const invite = await prisma.dealerIntelligenceInvite.create({
    data: {
      prospectId,
      tokenHash,
      tokenExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      dealerEmail: prospect.email,
      dealerName: prospect.businessName,
      dealerPhone: prospect.phone,
      coverageGapTaskId: taskId,
      buyerRequestId: task.buyerRequestId ?? null,
      status: "sent",
    },
  })

  // Update prospect status if still DISCOVERED
  if (prospect.status === "DISCOVERED") {
    await prisma.dealerProspect.update({
      where: { id: prospectId },
      data: { status: "CONTACTED" as never },
    })
  }

  await prisma.dealerLifecycleEvent.create({
    data: {
      prospectId,
      eventType: "INVITED_FOR_GAP",
      fromStatus: String(prospect.status),
      toStatus: prospect.status === "DISCOVERED" ? "CONTACTED" : String(prospect.status),
      performedBy,
      metadata: { coverageGapTaskId: taskId },
    },
  })

  return { invite, token: rawToken }
}
