import { prisma } from "@/lib/prisma"

/**
 * Inventory Normalize Service
 * Normalize raw vehicle data into structured inventory records.
 */

export interface RawSighting {
  vin?: string | null
  year?: unknown
  make?: string | null
  model?: string | null
  trim?: string | null
  mileage?: number | null
  priceCents?: unknown
  price?: unknown
  exteriorColor?: string | null
  bodyStyle?: string | null
  stockNumber?: string | null
}

export interface NormalizedVehicle {
  vin: string | null
  year: number
  make: string
  model: string
  trim: string | null
  mileage: number | null
  priceCents: number | null
  exteriorColor: string | null
  bodyStyle: string | null
  stockNumber: string | null
}

/** Common make name aliases → canonical form */
export const MAKE_ALIASES: Record<string, string> = {
  CHEVY: "Chevrolet",
  CHEVROLET: "Chevrolet",
  CHEV: "Chevrolet",
  FORD: "Ford",
  TOYOTA: "Toyota",
  HONDA: "Honda",
  NISSAN: "Nissan",
  BMW: "BMW",
  "MERCEDES-BENZ": "Mercedes-Benz",
  MERCEDES: "Mercedes-Benz",
  "MERC-BENZ": "Mercedes-Benz",
  MB: "Mercedes-Benz",
  BENZ: "Mercedes-Benz",
  AUDI: "Audi",
  LEXUS: "Lexus",
  HYUNDAI: "Hyundai",
  KIA: "Kia",
  SUBARU: "Subaru",
  MAZDA: "Mazda",
  VW: "Volkswagen",
  VOLKSWAGEN: "Volkswagen",
  VOLKS: "Volkswagen",
  JEEP: "Jeep",
  DODGE: "Dodge",
  RAM: "Ram",
  CHRYSLER: "Chrysler",
  GMC: "GMC",
  BUICK: "Buick",
  CADILLAC: "Cadillac",
  CADDY: "Cadillac",
  LINCOLN: "Lincoln",
  ACURA: "Acura",
  INFINITI: "Infiniti",
  VOLVO: "Volvo",
  PORSCHE: "Porsche",
  JAGUAR: "Jaguar",
  JAG: "Jaguar",
  "LAND ROVER": "Land Rover",
  LANDROVER: "Land Rover",
  TESLA: "Tesla",
  GENESIS: "Genesis",
  MITSUBISHI: "Mitsubishi",
  MITS: "Mitsubishi",
  MINI: "MINI",
  FIAT: "Fiat",
  ALFA: "Alfa Romeo",
  "ALFA ROMEO": "Alfa Romeo",
  MASERATI: "Maserati",
  BENTLEY: "Bentley",
  "ROLLS-ROYCE": "Rolls-Royce",
  ROLLS: "Rolls-Royce",
  FERRARI: "Ferrari",
  LAMBORGHINI: "Lamborghini",
  LAMBO: "Lamborghini",
  ASTON: "Aston Martin",
  "ASTON MARTIN": "Aston Martin",
  MCLAREN: "McLaren",
  RIVIAN: "Rivian",
  LUCID: "Lucid",
  POLESTAR: "Polestar",
  SCION: "Scion",
  SATURN: "Saturn",
  PONTIAC: "Pontiac",
  OLDSMOBILE: "Oldsmobile",
  HUMMER: "Hummer",
  SUZUKI: "Suzuki",
  ISUZU: "Isuzu",
  SAAB: "Saab",
}

/** Body style aliases → canonical form */
const BODY_STYLE_ALIASES: Record<string, string> = {
  SEDAN: "Sedan",
  "4DR": "Sedan",
  "4-DOOR": "Sedan",
  "4 DOOR": "Sedan",
  COUPE: "Coupe",
  "2DR": "Coupe",
  "2-DOOR": "Coupe",
  "2 DOOR": "Coupe",
  SUV: "SUV",
  "SPORT UTILITY": "SUV",
  "SPORT UTILITY VEHICLE": "SUV",
  CROSSOVER: "SUV",
  CUV: "SUV",
  TRUCK: "Truck",
  PICKUP: "Truck",
  "CREW CAB": "Truck",
  "EXTENDED CAB": "Truck",
  "REGULAR CAB": "Truck",
  VAN: "Van",
  MINIVAN: "Minivan",
  "MINI VAN": "Minivan",
  "MINI-VAN": "Minivan",
  WAGON: "Wagon",
  "STATION WAGON": "Wagon",
  HATCHBACK: "Hatchback",
  HATCH: "Hatchback",
  CONVERTIBLE: "Convertible",
  CABRIOLET: "Convertible",
  ROADSTER: "Convertible",
}

const CURRENT_YEAR = new Date().getFullYear()
const MIN_YEAR = 1900
const MAX_YEAR = CURRENT_YEAR + 2

// VIN must be 17 alphanumeric characters, excluding I, O, Q
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/

export function normalizeMake(rawMake: string): string {
  if (!rawMake || typeof rawMake !== "string") return rawMake
  const key = rawMake.trim().toUpperCase()
  return MAKE_ALIASES[key] ?? titleCase(rawMake.trim())
}

export function normalizeBodyStyle(rawStyle: string): string {
  if (!rawStyle || typeof rawStyle !== "string") return rawStyle
  const key = rawStyle.trim().toUpperCase()
  return BODY_STYLE_ALIASES[key] ?? titleCase(rawStyle.trim())
}

export function normalizeVin(rawVin: string): string | null {
  if (!rawVin || typeof rawVin !== "string") return null
  const cleaned = rawVin.trim().toUpperCase()
  if (cleaned.length !== 17) return null
  if (!VIN_REGEX.test(cleaned)) return null
  return cleaned
}

export function normalizeYear(rawYear: unknown): number | null {
  if (rawYear == null) return null
  const yr = typeof rawYear === "string" ? parseInt(rawYear, 10) : Number(rawYear)
  if (!Number.isFinite(yr) || yr < MIN_YEAR || yr > MAX_YEAR) return null
  return yr
}

export function normalizePriceCents(rawPrice: unknown): number | null {
  if (rawPrice == null) return null

  let value: number
  if (typeof rawPrice === "string") {
    // Strip currency symbols, commas, whitespace
    const cleaned = rawPrice.replace(/[$,\s]/g, "")
    value = parseFloat(cleaned)
  } else {
    value = Number(rawPrice)
  }

  if (!Number.isFinite(value) || value < 0) return null

  // Price interpretation thresholds:
  //   - 0 to 10M: treat as dollar amount → multiply by 100 to get cents
  //   - 10M to 1B: treat as already in cents (pass through)
  //   - > 1B: reject as unreasonable
  //
  // Rationale: no vehicle costs less than $0.01 or more than $10M.
  // Raw sources typically provide dollar amounts (e.g., 25000 = $25,000).
  // Pre-normalized data may already be in cents (e.g., 2500000 = $25,000).
  if (value > 0 && value < 10_000_000) {
    // Dollar amount → convert to cents
    return Math.round(value * 100)
  }

  // Already in cents range (10M cents = $100K minimum, 1B cents = $10M maximum)
  if (value >= 10_000_000 && value <= 1_000_000_000) {
    return Math.round(value)
  }

  return null
}

export function normalizeSighting(sighting: RawSighting): NormalizedVehicle | null {
  const make = sighting.make ? normalizeMake(sighting.make) : null
  const model = sighting.model?.trim() || null

  if (!make || !model) return null

  const year = normalizeYear(sighting.year)
  if (year === null) return null

  const vin = sighting.vin ? normalizeVin(sighting.vin) : null
  const priceCents = normalizePriceCents(sighting.priceCents ?? sighting.price)
  const bodyStyle = sighting.bodyStyle ? normalizeBodyStyle(sighting.bodyStyle) : null

  return {
    vin,
    year,
    make,
    model,
    trim: sighting.trim?.trim() || null,
    mileage: sighting.mileage != null && sighting.mileage >= 0 ? sighting.mileage : null,
    priceCents,
    exteriorColor: sighting.exteriorColor?.trim() || null,
    bodyStyle,
    stockNumber: sighting.stockNumber?.trim() || null,
  }
}

export async function upsertMarketVehicle(
  normalized: NormalizedVehicle,
  sourceId: string,
  prospectId?: string
) {
  if (!normalized.make || !normalized.model || !normalized.year) {
    throw new Error("Normalized vehicle must have make, model, and year")
  }

  const now = new Date()

  // If VIN + prospectId exists, upsert by unique constraint
  if (normalized.vin && prospectId) {
    const existing = await prisma.inventoryMarketVehicle.findUnique({
      where: {
        market_vin_prospect: {
          vin: normalized.vin,
          prospectId,
        },
      },
    })

    if (existing) {
      const priceChanged =
        normalized.priceCents != null &&
        existing.priceCents !== normalized.priceCents

      const updates: Record<string, unknown> = {
        year: normalized.year,
        make: normalized.make,
        model: normalized.model,
        trim: normalized.trim,
        mileage: normalized.mileage,
        priceCents: normalized.priceCents,
        exteriorColor: normalized.exteriorColor,
        bodyStyle: normalized.bodyStyle,
        stockNumber: normalized.stockNumber,
        lastSeenAt: now,
        dealerSourceId: sourceId,
      }

      const updated = await prisma.inventoryMarketVehicle.update({
        where: { id: existing.id },
        data: updates,
      })

      if (priceChanged && normalized.priceCents != null) {
        await prisma.inventoryPriceHistory.create({
          data: {
            marketVehicleId: existing.id,
            priceCents: normalized.priceCents,
            recordedAt: now,
          },
        })
      }

      return { vehicle: updated, created: false }
    }
  }

  // Create new market vehicle
  const vehicle = await prisma.inventoryMarketVehicle.create({
    data: {
      vin: normalized.vin,
      year: normalized.year,
      make: normalized.make,
      model: normalized.model,
      trim: normalized.trim,
      mileage: normalized.mileage,
      priceCents: normalized.priceCents,
      exteriorColor: normalized.exteriorColor,
      bodyStyle: normalized.bodyStyle,
      stockNumber: normalized.stockNumber,
      dealerSourceId: sourceId,
      prospectId: prospectId ?? null,
      firstSeenAt: now,
      lastSeenAt: now,
    },
  })

  // Record initial price
  if (normalized.priceCents != null) {
    await prisma.inventoryPriceHistory.create({
      data: {
        marketVehicleId: vehicle.id,
        priceCents: normalized.priceCents,
        recordedAt: now,
      },
    })
  }

  return { vehicle, created: true }
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (ch) => ch.toUpperCase())
}
