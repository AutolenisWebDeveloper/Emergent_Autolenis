import { prisma } from "@/lib/prisma"

/**
 * Dealer Source Service
 * Manage dealer inventory sources, runs, and error tracking.
 */

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 20

const VALID_SOURCE_TYPES = ["WEBSITE", "FEED", "API", "MANUAL"]
const VALID_SOURCE_STATUSES = ["ACTIVE", "PAUSED", "ERRORED", "SUPPRESSED"]

export async function createSource(data: {
  prospectId?: string
  dealerId?: string
  sourceType: string
  sourceUrl?: string
  feedUrl?: string
  fetchIntervalMinutes?: number
}): Promise<unknown> {
  if (!data.sourceType || !VALID_SOURCE_TYPES.includes(data.sourceType)) {
    throw new Error(`sourceType must be one of: ${VALID_SOURCE_TYPES.join(", ")}`)
  }
  if (data.fetchIntervalMinutes != null && data.fetchIntervalMinutes < 1) {
    throw new Error("fetchIntervalMinutes must be at least 1")
  }

  return prisma.dealerSource.create({
    data: {
      prospectId: data.prospectId ?? null,
      dealerId: data.dealerId ?? null,
      sourceType: data.sourceType as never,
      sourceUrl: data.sourceUrl ?? null,
      feedUrl: data.feedUrl ?? null,
      fetchIntervalMinutes: data.fetchIntervalMinutes ?? 1440,
    },
  })
}

export async function getSources(filters: {
  status?: string
  sourceType?: string
  page?: number
  perPage?: number
}): Promise<{ sources: unknown[]; total: number; page: number; perPage: number }> {
  const page = Math.max(1, filters.page ?? DEFAULT_PAGE)
  const perPage = Math.min(100, Math.max(1, filters.perPage ?? DEFAULT_PER_PAGE))

  const where: Record<string, unknown> = {}
  if (filters.status) {
    if (!VALID_SOURCE_STATUSES.includes(filters.status)) {
      throw new Error(`status must be one of: ${VALID_SOURCE_STATUSES.join(", ")}`)
    }
    where.status = filters.status
  }
  if (filters.sourceType) {
    if (!VALID_SOURCE_TYPES.includes(filters.sourceType)) {
      throw new Error(`sourceType must be one of: ${VALID_SOURCE_TYPES.join(", ")}`)
    }
    where.sourceType = filters.sourceType
  }

  const [sources, total] = await Promise.all([
    prisma.dealerSource.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { prospect: { select: { id: true, businessName: true } } },
    }),
    prisma.dealerSource.count({ where }),
  ])

  return { sources, total, page, perPage }
}

export async function getSourceById(sourceId: string) {
  if (!sourceId) throw new Error("sourceId is required")

  const source = await prisma.dealerSource.findUnique({
    where: { id: sourceId },
    include: {
      prospect: { select: { id: true, businessName: true, status: true } },
      runs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  })

  if (!source) throw new Error(`Source not found: ${sourceId}`)
  return source
}

export async function updateSource(
  sourceId: string,
  data: Partial<{
    sourceUrl: string
    feedUrl: string
    fetchIntervalMinutes: number
    sourceType: string
  }>
) {
  if (!sourceId) throw new Error("sourceId is required")

  if (data.sourceType && !VALID_SOURCE_TYPES.includes(data.sourceType)) {
    throw new Error(`sourceType must be one of: ${VALID_SOURCE_TYPES.join(", ")}`)
  }
  if (data.fetchIntervalMinutes != null && data.fetchIntervalMinutes < 1) {
    throw new Error("fetchIntervalMinutes must be at least 1")
  }

  const existing = await prisma.dealerSource.findUnique({ where: { id: sourceId } })
  if (!existing) throw new Error(`Source not found: ${sourceId}`)

  return prisma.dealerSource.update({
    where: { id: sourceId },
    data: data as never,
  })
}

export async function pauseSource(sourceId: string) {
  if (!sourceId) throw new Error("sourceId is required")

  const source = await prisma.dealerSource.findUnique({ where: { id: sourceId } })
  if (!source) throw new Error(`Source not found: ${sourceId}`)
  if (source.status === "SUPPRESSED") {
    throw new Error("Cannot pause a suppressed source")
  }

  return prisma.dealerSource.update({
    where: { id: sourceId },
    data: { status: "PAUSED" as never },
  })
}

export async function resumeSource(sourceId: string) {
  if (!sourceId) throw new Error("sourceId is required")

  const source = await prisma.dealerSource.findUnique({ where: { id: sourceId } })
  if (!source) throw new Error(`Source not found: ${sourceId}`)
  if (source.status === "SUPPRESSED") {
    throw new Error("Cannot resume a suppressed source")
  }

  return prisma.dealerSource.update({
    where: { id: sourceId },
    data: { status: "ACTIVE" as never, errorCount: 0, lastErrorMessage: null },
  })
}

export async function suppressSource(sourceId: string) {
  if (!sourceId) throw new Error("sourceId is required")

  const source = await prisma.dealerSource.findUnique({ where: { id: sourceId } })
  if (!source) throw new Error(`Source not found: ${sourceId}`)

  return prisma.dealerSource.update({
    where: { id: sourceId },
    data: { status: "SUPPRESSED" as never },
  })
}

export async function getSourceRuns(sourceId: string, page?: number) {
  if (!sourceId) throw new Error("sourceId is required")

  const p = Math.max(1, page ?? DEFAULT_PAGE)

  const [runs, total] = await Promise.all([
    prisma.dealerSourceRun.findMany({
      where: { sourceId },
      orderBy: { createdAt: "desc" },
      skip: (p - 1) * DEFAULT_PER_PAGE,
      take: DEFAULT_PER_PAGE,
    }),
    prisma.dealerSourceRun.count({ where: { sourceId } }),
  ])

  return { runs, total, page: p, perPage: DEFAULT_PER_PAGE }
}

export async function getSourceRunById(runId: string) {
  if (!runId) throw new Error("runId is required")

  const run = await prisma.dealerSourceRun.findUnique({
    where: { id: runId },
    include: { source: { select: { id: true, sourceType: true, sourceUrl: true } } },
  })

  if (!run) throw new Error(`Source run not found: ${runId}`)
  return run
}

export async function createSourceRun(sourceId: string) {
  if (!sourceId) throw new Error("sourceId is required")

  const source = await prisma.dealerSource.findUnique({ where: { id: sourceId } })
  if (!source) throw new Error(`Source not found: ${sourceId}`)
  if (source.status === "SUPPRESSED") {
    throw new Error("Cannot create a run for a suppressed source")
  }

  return prisma.dealerSourceRun.create({
    data: {
      sourceId,
      status: "RUNNING" as never,
      startedAt: new Date(),
    },
  })
}

export async function completeSourceRun(
  runId: string,
  stats: {
    vehiclesFound: number
    vehiclesNew: number
    vehiclesUpdated: number
    errors: number
    errorDetails?: object
  }
) {
  if (!runId) throw new Error("runId is required")

  const run = await prisma.dealerSourceRun.findUnique({ where: { id: runId } })
  if (!run) throw new Error(`Source run not found: ${runId}`)

  const [updatedRun] = await Promise.all([
    prisma.dealerSourceRun.update({
      where: { id: runId },
      data: {
        status: "COMPLETED" as never,
        completedAt: new Date(),
        vehiclesFound: stats.vehiclesFound,
        vehiclesNew: stats.vehiclesNew,
        vehiclesUpdated: stats.vehiclesUpdated,
        errors: stats.errors,
        errorDetails: stats.errorDetails ?? null,
      },
    }),
    prisma.dealerSource.update({
      where: { id: run.sourceId },
      data: { lastFetchedAt: new Date() },
    }),
  ])

  return updatedRun
}

export async function failSourceRun(runId: string, error: string) {
  if (!runId) throw new Error("runId is required")
  if (!error) throw new Error("error message is required")

  const run = await prisma.dealerSourceRun.findUnique({ where: { id: runId } })
  if (!run) throw new Error(`Source run not found: ${runId}`)

  const [updatedRun] = await Promise.all([
    prisma.dealerSourceRun.update({
      where: { id: runId },
      data: {
        status: "FAILED" as never,
        completedAt: new Date(),
        errorDetails: { error },
      },
    }),
    prisma.dealerSource.update({
      where: { id: run.sourceId },
      data: {
        errorCount: { increment: 1 },
        lastErrorMessage: error,
      },
    }),
  ])

  return updatedRun
}

export async function logSourceError(
  sourceId: string,
  error: {
    errorType: string
    errorMessage: string
    rawPayload?: object
  }
) {
  if (!sourceId) throw new Error("sourceId is required")
  if (!error.errorType) throw new Error("errorType is required")
  if (!error.errorMessage) throw new Error("errorMessage is required")

  const [entry] = await Promise.all([
    prisma.inventorySourceError.create({
      data: {
        sourceId,
        errorType: error.errorType,
        errorMessage: error.errorMessage,
        rawPayload: error.rawPayload ?? null,
      },
    }),
    prisma.dealerSource.update({
      where: { id: sourceId },
      data: {
        errorCount: { increment: 1 },
        lastErrorMessage: error.errorMessage,
      },
    }),
  ])

  return entry
}

export async function getSourceErrors(sourceId: string, page?: number) {
  if (!sourceId) throw new Error("sourceId is required")

  const p = Math.max(1, page ?? DEFAULT_PAGE)

  const [errors, total] = await Promise.all([
    prisma.inventorySourceError.findMany({
      where: { sourceId },
      orderBy: { occurredAt: "desc" },
      skip: (p - 1) * DEFAULT_PER_PAGE,
      take: DEFAULT_PER_PAGE,
    }),
    prisma.inventorySourceError.count({ where: { sourceId } }),
  ])

  return { errors, total, page: p, perPage: DEFAULT_PER_PAGE }
}
