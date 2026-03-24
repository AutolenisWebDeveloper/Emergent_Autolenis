import { prisma } from "@/lib/prisma"

/**
 * Dealer Discovery Service
 * Discover dealers from public sources, manage prospects through lifecycle.
 */

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 20

export async function discoverDealers(params: {
  zip: string
  radiusMiles: number
  keywords?: string
}): Promise<{ prospects: Array<{ id: string; businessName: string; zip: string | null; status: string }>; count: number }> {
  if (!params.zip || params.zip.length < 5) {
    throw new Error("Valid ZIP code is required")
  }
  if (params.radiusMiles <= 0 || params.radiusMiles > 500) {
    throw new Error("Radius must be between 1 and 500 miles")
  }

  // Placeholder: in production this would call an external geocoding/dealer API.
  // For now we return existing prospects near the ZIP as a passthrough.
  const prospects = await prisma.dealerProspect.findMany({
    where: {
      zip: params.zip,
      status: { not: "SUPPRESSED" },
    },
    select: {
      id: true,
      businessName: true,
      zip: true,
      status: true,
    },
    orderBy: { discoveredAt: "desc" },
    take: 50,
  })

  return { prospects, count: prospects.length }
}

export async function getProspects(filters: {
  status?: string
  zip?: string
  page?: number
  perPage?: number
}): Promise<{ prospects: unknown[]; total: number; page: number; perPage: number }> {
  const page = Math.max(1, filters.page ?? DEFAULT_PAGE)
  const perPage = Math.min(100, Math.max(1, filters.perPage ?? DEFAULT_PER_PAGE))

  const where: Record<string, unknown> = {}
  if (filters.status) where.status = filters.status
  if (filters.zip) where.zip = filters.zip

  const [prospects, total] = await Promise.all([
    prisma.dealerProspect.findMany({
      where,
      orderBy: { discoveredAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.dealerProspect.count({ where }),
  ])

  return { prospects, total, page, perPage }
}

export async function getProspectById(prospectId: string) {
  if (!prospectId) throw new Error("prospectId is required")

  const prospect = await prisma.dealerProspect.findUnique({
    where: { id: prospectId },
    include: {
      sources: true,
      lifecycleEvents: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  })

  if (!prospect) throw new Error(`Prospect not found: ${prospectId}`)
  return prospect
}

export async function updateProspectStatus(
  prospectId: string,
  status: string,
  performedBy: string
) {
  if (!prospectId) throw new Error("prospectId is required")
  if (!status) throw new Error("status is required")
  if (!performedBy) throw new Error("performedBy is required")

  const prospect = await prisma.dealerProspect.findUnique({
    where: { id: prospectId },
    select: { id: true, status: true },
  })
  if (!prospect) throw new Error(`Prospect not found: ${prospectId}`)

  const fromStatus = prospect.status

  const [updated] = await Promise.all([
    prisma.dealerProspect.update({
      where: { id: prospectId },
      data: { status: status as never },
    }),
    prisma.dealerLifecycleEvent.create({
      data: {
        prospectId,
        eventType: "STATUS_CHANGE",
        fromStatus: String(fromStatus),
        toStatus: status,
        performedBy,
      },
    }),
  ])

  return updated
}

export async function suppressProspect(prospectId: string, performedBy: string) {
  return updateProspectStatus(prospectId, "SUPPRESSED", performedBy)
}

export async function convertProspect(
  prospectId: string,
  dealerId: string,
  performedBy: string
) {
  if (!prospectId) throw new Error("prospectId is required")
  if (!dealerId) throw new Error("dealerId is required")
  if (!performedBy) throw new Error("performedBy is required")

  const prospect = await prisma.dealerProspect.findUnique({
    where: { id: prospectId },
    select: { id: true, status: true },
  })
  if (!prospect) throw new Error(`Prospect not found: ${prospectId}`)

  const fromStatus = prospect.status

  const [updated] = await Promise.all([
    prisma.dealerProspect.update({
      where: { id: prospectId },
      data: {
        status: "CONVERTED" as never,
        convertedDealerId: dealerId,
      },
    }),
    prisma.dealerLifecycleEvent.create({
      data: {
        prospectId,
        dealerId,
        eventType: "CONVERTED",
        fromStatus: String(fromStatus),
        toStatus: "CONVERTED",
        performedBy,
        metadata: { dealerId },
      },
    }),
  ])

  return updated
}

export async function getLifecycleEvents(prospectId: string) {
  if (!prospectId) throw new Error("prospectId is required")

  return prisma.dealerLifecycleEvent.findMany({
    where: { prospectId },
    orderBy: { createdAt: "desc" },
  })
}
