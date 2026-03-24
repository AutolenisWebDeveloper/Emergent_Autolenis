import { prisma } from "@/lib/prisma"

/**
 * Inventory Fetch Service
 * Fetch raw inventory data from dealer sources and create snapshots.
 */

export async function fetchSource(sourceId: string): Promise<string> {
  if (!sourceId) throw new Error("sourceId is required")

  const source = await prisma.dealerSource.findUnique({
    where: { id: sourceId },
    select: { id: true, status: true, sourceUrl: true, feedUrl: true, sourceType: true },
  })
  if (!source) throw new Error(`Source not found: ${sourceId}`)
  if (source.status === "SUPPRESSED") {
    throw new Error("Cannot fetch from a suppressed source")
  }

  const run = await prisma.dealerSourceRun.create({
    data: {
      sourceId,
      status: "RUNNING" as never,
      startedAt: new Date(),
    },
  })

  // Placeholder: actual HTTP crawling will be plugged in later.
  // For now, store an empty snapshot and mark the source as fetched.
  const snapshot = await prisma.inventoryRawSnapshot.create({
    data: {
      sourceId,
      rawData: {},
      fetchedAt: new Date(),
    },
  })

  await Promise.all([
    prisma.dealerSourceRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED" as never,
        completedAt: new Date(),
      },
    }),
    prisma.dealerSource.update({
      where: { id: sourceId },
      data: { lastFetchedAt: new Date() },
    }),
  ])

  return snapshot.id
}

export async function getStaleSourceIds(): Promise<string[]> {
  const sources = await prisma.dealerSource.findMany({
    where: { status: "ACTIVE" as never },
    select: { id: true, lastFetchedAt: true, fetchIntervalMinutes: true },
  })

  const now = Date.now()

  return sources
    .filter((s: { id: string; lastFetchedAt: Date | null; fetchIntervalMinutes: number }) => {
      if (!s.lastFetchedAt) return true
      const elapsed = now - s.lastFetchedAt.getTime()
      return elapsed >= s.fetchIntervalMinutes * 60 * 1000
    })
    .map((s: { id: string }) => s.id)
}

export async function fetchAllActiveSources(): Promise<{ fetched: string[]; errors: Array<{ sourceId: string; error: string }> }> {
  const staleIds = await getStaleSourceIds()

  const fetched: string[] = []
  const errors: Array<{ sourceId: string; error: string }> = []

  for (const sourceId of staleIds) {
    try {
      const snapshotId = await fetchSource(sourceId)
      fetched.push(snapshotId)
    } catch (err) {
      errors.push({
        sourceId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { fetched, errors }
}
