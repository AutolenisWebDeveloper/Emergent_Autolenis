import { prisma } from "@/lib/prisma"

/**
 * Inventory Parse Service
 * Parse raw inventory snapshots into structured vehicle sightings.
 */

export interface ParsedVehicle {
  vin?: string
  year?: number
  make?: string
  model?: string
  trim?: string
  mileage?: number
  priceCents?: number
  exteriorColor?: string
  bodyStyle?: string
  stockNumber?: string
}

export function parseRow(row: Record<string, unknown>): ParsedVehicle | null {
  const year = toInt(row.year ?? row.Year ?? row.YEAR)
  const make = toStr(row.make ?? row.Make ?? row.MAKE)
  const model = toStr(row.model ?? row.Model ?? row.MODEL)

  if (!make || !model) return null

  return {
    vin: toStr(row.vin ?? row.VIN ?? row.Vin) ?? undefined,
    year: year ?? undefined,
    make,
    model,
    trim: toStr(row.trim ?? row.Trim ?? row.TRIM) ?? undefined,
    mileage: toInt(row.mileage ?? row.Mileage ?? row.MILEAGE ?? row.miles ?? row.Miles) ?? undefined,
    priceCents: parsePriceToCents(row.priceCents ?? row.price ?? row.Price ?? row.PRICE),
    exteriorColor: toStr(row.exteriorColor ?? row.color ?? row.Color ?? row.exterior_color) ?? undefined,
    bodyStyle: toStr(row.bodyStyle ?? row.body_style ?? row.BodyStyle ?? row.body) ?? undefined,
    stockNumber: toStr(row.stockNumber ?? row.stock ?? row.Stock ?? row.stock_number) ?? undefined,
  }
}

export function parseFeedInventory(data: object): ParsedVehicle[] {
  if (!data || typeof data !== "object") return []

  // Handle arrays of vehicle objects
  const vehicles: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as Record<string, unknown>).vehicles)
      ? (data as Record<string, unknown>).vehicles as unknown[]
      : Array.isArray((data as Record<string, unknown>).inventory)
        ? (data as Record<string, unknown>).inventory as unknown[]
        : Array.isArray((data as Record<string, unknown>).items)
          ? (data as Record<string, unknown>).items as unknown[]
          : []

  const results: ParsedVehicle[] = []
  for (const item of vehicles) {
    if (item && typeof item === "object") {
      const parsed = parseRow(item as Record<string, unknown>)
      if (parsed) results.push(parsed)
    }
  }

  return results
}

export function parseHtmlInventory(html: string): ParsedVehicle[] {
  if (!html || typeof html !== "string") return []

  const results: ParsedVehicle[] = []

  // Basic pattern: extract year/make/model from common title patterns
  // e.g., "2023 Toyota Camry", "2022 Honda Civic SE"
  const titlePattern = /(\b20[0-2]\d|19[89]\d)\s+([A-Za-z-]+)\s+([A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)?)/g
  let match: RegExpExecArray | null

  while ((match = titlePattern.exec(html)) !== null) {
    const year = parseInt(match[1], 10)
    const make = match[2].trim()
    const model = match[3].trim()

    if (year && make && model) {
      results.push({ year, make, model })
    }
  }

  // Deduplicate by year+make+model
  const seen = new Set<string>()
  return results.filter((v) => {
    const key = `${v.year}-${v.make}-${v.model}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function parseSnapshot(snapshotId: string): Promise<{ sightingsCreated: number }> {
  if (!snapshotId) throw new Error("snapshotId is required")

  const snapshot = await prisma.inventoryRawSnapshot.findUnique({
    where: { id: snapshotId },
    select: { id: true, rawData: true, parsedAt: true, sourceId: true },
  })
  if (!snapshot) throw new Error(`Snapshot not found: ${snapshotId}`)
  if (snapshot.parsedAt) throw new Error(`Snapshot already parsed: ${snapshotId}`)

  let vehicles: ParsedVehicle[] = []

  try {
    const rawData = snapshot.rawData
    if (rawData && typeof rawData === "object") {
      // Try structured feed first
      vehicles = parseFeedInventory(rawData as object)

      // If structured parsing yields nothing and there's an html field, try HTML
      if (vehicles.length === 0) {
        const htmlField = (rawData as Record<string, unknown>).html
        if (typeof htmlField === "string") {
          vehicles = parseHtmlInventory(htmlField)
        }
      }
    }
  } catch (err) {
    await prisma.inventoryRawSnapshot.update({
      where: { id: snapshotId },
      data: { parseError: err instanceof Error ? err.message : String(err) },
    })
    throw err
  }

  const now = new Date()

  if (vehicles.length > 0) {
    await prisma.inventoryVehicleSighting.createMany({
      data: vehicles.map((v) => ({
        snapshotId,
        vin: v.vin ?? null,
        year: v.year ?? null,
        make: v.make ?? null,
        model: v.model ?? null,
        trim: v.trim ?? null,
        mileage: v.mileage ?? null,
        priceCents: v.priceCents ?? null,
        exteriorColor: v.exteriorColor ?? null,
        bodyStyle: v.bodyStyle ?? null,
        stockNumber: v.stockNumber ?? null,
        rawJson: v as object,
        firstSeenAt: now,
        lastSeenAt: now,
      })),
    })
  }

  await prisma.inventoryRawSnapshot.update({
    where: { id: snapshotId },
    data: { parsedAt: now },
  })

  return { sightingsCreated: vehicles.length }
}

/* ── helpers ──────────────────────────────────────────────────── */

function toStr(val: unknown): string | null {
  if (val == null) return null
  const s = String(val).trim()
  return s.length > 0 ? s : null
}

function toInt(val: unknown): number | null {
  if (val == null) return null
  const n = typeof val === "string" ? parseInt(val, 10) : Number(val)
  return Number.isFinite(n) ? n : null
}

function parsePriceToCents(val: unknown): number | undefined {
  if (val == null) return undefined
  let num: number
  if (typeof val === "string") {
    num = parseFloat(val.replace(/[$,\s]/g, ""))
  } else {
    num = Number(val)
  }
  if (!Number.isFinite(num) || num < 0) return undefined
  // Values under 10M are assumed dollars; convert to cents
  if (num < 10_000_000) return Math.round(num * 100)
  return Math.round(num)
}
