import { getSupabase } from "@/lib/db"
import { parseFeedInventory, parseHtmlInventory, type ParsedVehicle } from "@/lib/services/inventory-parse.service"
import { normalizeSighting, type NormalizedVehicle } from "@/lib/services/inventory-normalize.service"
import { logger } from "@/lib/logger"

/**
 * Inventory Fetch Service
 * Fetch raw inventory data from dealer sources, parse, normalize, and upsert to InventoryItem.
 * Uses Supabase client exclusively (Prisma not required).
 */

interface FetchResult {
  sourceId: string
  vehiclesFetched: number
  vehiclesParsed: number
  vehiclesInserted: number
  vehiclesUpdated: number
  vehiclesFailed: number
  vehiclesDeactivated: number
  errors: string[]
}

/**
 * Fetch inventory from a dealer source, parse it, and upsert into InventoryItem.
 * This is the complete end-to-end sync pipeline.
 */
export async function fetchAndSyncSource(sourceId: string): Promise<FetchResult> {
  if (!sourceId) throw new Error("sourceId is required")

  const supabase = getSupabase()

  // Load source
  const { data: source, error: sourceErr } = await supabase
    .from("DealerSource")
    .select("id, status, sourceUrl, feedUrl, sourceType, dealerId, workspaceId")
    .eq("id", sourceId)
    .single()

  if (sourceErr || !source) throw new Error(`Source not found: ${sourceId}`)
  if (source.status === "SUPPRESSED") throw new Error("Cannot fetch from a suppressed source")

  const feedUrl = source.feedUrl || source.sourceUrl
  if (!feedUrl) throw new Error(`Source ${sourceId} has no feed URL configured`)

  const result: FetchResult = {
    sourceId,
    vehiclesFetched: 0,
    vehiclesParsed: 0,
    vehiclesInserted: 0,
    vehiclesUpdated: 0,
    vehiclesFailed: 0,
    vehiclesDeactivated: 0,
    errors: [],
  }

  // Create a run record
  const runId = crypto.randomUUID()
  await supabase.from("DealerSourceRun").insert({
    id: runId,
    sourceId,
    status: "RUNNING",
    startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  try {
    // Step 1: Fetch the feed data
    logger.info("[InventorySync] Fetching feed", { sourceId, feedUrl, sourceType: source.sourceType })

    const response = await fetch(feedUrl, {
      headers: {
        "Accept": "application/json, application/xml, text/xml, text/csv, text/html, */*",
        "User-Agent": "AutoLenis-InventorySync/1.0",
      },
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      throw new Error(`Feed returned HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get("content-type") || ""
    const rawText = await response.text()
    result.vehiclesFetched = 1

    // Step 2: Parse the feed
    let parsedVehicles: ParsedVehicle[] = []

    if (contentType.includes("json") || rawText.trim().startsWith("{") || rawText.trim().startsWith("[")) {
      parsedVehicles = parseFeedInventory(JSON.parse(rawText))
    } else if (contentType.includes("xml") || rawText.trim().startsWith("<?xml") || rawText.trim().startsWith("<")) {
      parsedVehicles = parseXmlInventory(rawText)
    } else if (contentType.includes("csv") || contentType.includes("text/plain")) {
      parsedVehicles = parseCsvInventory(rawText)
    } else if (contentType.includes("html")) {
      parsedVehicles = parseHtmlInventory(rawText)
    } else {
      try {
        parsedVehicles = parseFeedInventory(JSON.parse(rawText))
      } catch {
        parsedVehicles = parseHtmlInventory(rawText)
      }
    }

    logger.info("[InventorySync] Parsed feed", {
      sourceId,
      vehiclesParsed: parsedVehicles.length,
      contentType,
    })

    result.vehiclesParsed = parsedVehicles.length

    // Track source-scoped references seen in this sync for stale detection
    const seenSourceReferences = new Set<string>()

    // Step 3: Normalize and upsert each vehicle into InventoryItem
    const now = new Date().toISOString()
    const dealerId = source.dealerId
    const workspaceId = source.workspaceId || "ws_live_default"

    if (!dealerId) {
      throw new Error(`Source ${sourceId} has no dealerId`)
    }

    for (const pv of parsedVehicles) {
      try {
        const normalized = normalizeSighting(pv)
        if (!normalized || !normalized.make || !normalized.model || !normalized.year) {
          result.vehiclesFailed++
          result.errors.push(`Skipped: missing required fields for VIN ${pv.vin || "unknown"}`)
          continue
        }

        // Use the parsed priceCents directly (already converted by parseFeedInventory)
        // normalizeSighting may double-convert, so override with source value
        const priceCents = pv.priceCents ?? normalized.priceCents
        const sourceReferenceId = `${sourceId}:${normalized.vin || normalized.stockNumber || `${normalized.make}-${normalized.model}-${normalized.year}`}`

        // Check for existing InventoryItem by VIN + dealerId (upsert logic)
        if (normalized.vin) {
          const { data: existing } = await supabase
            .from("InventoryItem")
            .select("id")
            .eq("vin", normalized.vin)
            .eq("dealerId", dealerId)
            .maybeSingle()

          if (existing) {
            // Update existing record
            const { error: updateError } = await supabase
              .from("InventoryItem")
              .update({
                year: normalized.year,
                make: normalized.make,
                model: normalized.model,
                trim: normalized.trim,
                mileage: normalized.mileage,
                priceCents: priceCents,
                price: priceCents ? Math.round(priceCents / 100) : null,
                exteriorColor: normalized.exteriorColor,
                bodyStyle: normalized.bodyStyle,
                stockNumber: normalized.stockNumber,
                status: "AVAILABLE",
                source: "API_FEED",
                sourceReferenceId,
                lastSyncedAt: now,
                updatedAt: now,
              })
              .eq("id", existing.id)

            if (updateError) {
              result.vehiclesFailed++
              result.errors.push(`Update failed for VIN ${normalized.vin}: ${updateError.message}`)
            } else {
              result.vehiclesUpdated++
              seenSourceReferences.add(sourceReferenceId)
            }
            continue
          }
        }

        // Also check by stockNumber
        if (normalized.stockNumber) {
          const { data: existingByStock } = await supabase
            .from("InventoryItem")
            .select("id")
            .eq("stockNumber", normalized.stockNumber)
            .eq("dealerId", dealerId)
            .maybeSingle()

          if (existingByStock) {
            const { error: updateError } = await supabase
              .from("InventoryItem")
              .update({
                vin: normalized.vin,
                year: normalized.year,
                make: normalized.make,
                model: normalized.model,
                trim: normalized.trim,
                mileage: normalized.mileage,
                priceCents: priceCents,
                price: priceCents ? Math.round(priceCents / 100) : null,
                exteriorColor: normalized.exteriorColor,
                bodyStyle: normalized.bodyStyle,
                status: "AVAILABLE",
                source: "API_FEED",
                sourceReferenceId,
                lastSyncedAt: now,
                updatedAt: now,
              })
              .eq("id", existingByStock.id)

            if (updateError) {
              result.vehiclesFailed++
              result.errors.push(`Update by stock# failed: ${updateError.message}`)
            } else {
              result.vehiclesUpdated++
              seenSourceReferences.add(sourceReferenceId)
            }
            continue
          }
        }

        // Create new Vehicle record (DB requires vehicleId NOT NULL on InventoryItem)
        const vehicleId = crypto.randomUUID()
        const { error: vehicleError } = await supabase
          .from("Vehicle")
          .insert({
            id: vehicleId,
            vin: normalized.vin || `NVIN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            year: normalized.year,
            make: normalized.make,
            model: normalized.model,
            trim: normalized.trim,
            bodyStyle: normalized.bodyStyle || "Sedan",
            mileage: normalized.mileage || 0,
            exteriorColor: normalized.exteriorColor,
            images: [],
            createdAt: now,
            updatedAt: now,
          })

        if (vehicleError) {
          result.vehiclesFailed++
          result.errors.push(`Vehicle creation failed: ${vehicleError.message}`)
          continue
        }

        // Create new InventoryItem
        const invId = crypto.randomUUID()
        const { error: insertError } = await supabase
          .from("InventoryItem")
          .insert({
            id: invId,
            dealerId,
            vehicleId,
            workspaceId,
            vin: normalized.vin,
            stockNumber: normalized.stockNumber || `STK-${Date.now()}`,
            year: normalized.year,
            make: normalized.make,
            model: normalized.model,
            trim: normalized.trim,
            mileage: normalized.mileage,
            priceCents: priceCents,
            price: priceCents ? Math.round(priceCents / 100) : null,
            exteriorColor: normalized.exteriorColor,
            bodyStyle: normalized.bodyStyle,
            isNew: false,
            status: "AVAILABLE",
            source: "API_FEED",
            sourceReferenceId,
            photosJson: [],
            lastSyncedAt: now,
            createdAt: now,
            updatedAt: now,
          })

        if (insertError) {
          result.vehiclesFailed++
          result.errors.push(`Insert failed for ${normalized.make} ${normalized.model}: ${insertError.message}`)
        } else {
          result.vehiclesInserted++
          seenSourceReferences.add(sourceReferenceId)
        }
      } catch (err) {
        result.vehiclesFailed++
        result.errors.push(`Exception: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    // Step 4: Stale inventory detection (source-scoped via sourceReferenceId)
    if (seenSourceReferences.size > 0) {
      const { data: activeItems, error: activeItemsError } = await supabase
        .from("InventoryItem")
        .select("id, sourceReferenceId")
        .eq("dealerId", dealerId)
        .eq("source", "API_FEED")
        .eq("status", "AVAILABLE")
        .like("sourceReferenceId", `${sourceId}:%`)

      if (activeItemsError) {
        result.errors.push(`Stale detection read failed: ${activeItemsError.message}`)
      } else {
        const staleIds = (activeItems || [])
          .filter((item: { id: string; sourceReferenceId: string | null }) => {
            if (!item.sourceReferenceId) return false
            return !seenSourceReferences.has(item.sourceReferenceId)
          })
          .map((item: { id: string }) => item.id)

        if (staleIds.length > 0) {
          const { error: deactivateError, count } = await supabase
            .from("InventoryItem")
            .update({
              status: "REMOVED",
              updatedAt: now,
            })
            .in("id", staleIds)

          if (deactivateError) {
            result.errors.push(`Stale deactivation failed: ${deactivateError.message}`)
          } else {
            result.vehiclesDeactivated = count ?? staleIds.length
          }
        }
      }
    }

    // Update run and source
    await supabase
      .from("DealerSourceRun")
      .update({
        status: "COMPLETED",
        completedAt: now,
        vehiclesFound: result.vehiclesParsed,
        vehiclesNew: result.vehiclesInserted,
        vehiclesUpdated: result.vehiclesUpdated,
        errors: result.vehiclesFailed,
        updatedAt: now,
      })
      .eq("id", runId)

    await supabase
      .from("DealerSource")
      .update({
        lastFetchedAt: now,
        errorCount: result.vehiclesFailed > 0 ? 1 : 0,
        lastErrorMessage: result.errors[0] || null,
        updatedAt: now,
      })
      .eq("id", sourceId)

    logger.info("[InventorySync] Sync completed", {
      sourceId,
      parsed: result.vehiclesParsed,
      inserted: result.vehiclesInserted,
      updated: result.vehiclesUpdated,
      failed: result.vehiclesFailed,
      deactivated: result.vehiclesDeactivated,
    })

    return result
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error("[InventorySync] Sync failed", { sourceId, error: errorMessage })

    await supabase
      .from("DealerSourceRun")
      .update({
        status: "FAILED",
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", runId)
      .then(() => {})

    await supabase
      .from("DealerSource")
      .update({
        errorCount: 1,
        lastErrorMessage: errorMessage,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", sourceId)
      .then(() => {})

    throw err
  }
}

export async function fetchAllActiveSources(): Promise<{
  fetched: string[]
  errors: Array<{ sourceId: string; error: string }>
  results: FetchResult[]
}> {
  const supabase = getSupabase()

  // Find active sources that are due for a fetch
  const { data: sources } = await supabase
    .from("DealerSource")
    .select("id, lastFetchedAt, fetchIntervalMinutes")
    .eq("status", "ACTIVE")

  const now = Date.now()
  const staleIds = (sources || [])
    .filter((s: { lastFetchedAt: string | null; fetchIntervalMinutes: number }) => {
      if (!s.lastFetchedAt) return true
      const elapsed = now - new Date(s.lastFetchedAt).getTime()
      return elapsed >= s.fetchIntervalMinutes * 60 * 1000
    })
    .map((s: { id: string }) => s.id)

  const fetched: string[] = []
  const errors: Array<{ sourceId: string; error: string }> = []
  const results: FetchResult[] = []

  for (const sourceId of staleIds) {
    try {
      const result = await fetchAndSyncSource(sourceId)
      fetched.push(sourceId)
      results.push(result)
    } catch (error) {
      errors.push({
        sourceId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { fetched, errors, results }
}

// ── XML Parser ──────────────────────────────────────────────────────

function parseXmlInventory(xml: string): ParsedVehicle[] {
  if (!xml || typeof xml !== "string") return []

  const results: ParsedVehicle[] = []
  const vehiclePattern = /<(?:vehicle|item|listing|car|inventory)[^>]*>([\s\S]*?)<\/(?:vehicle|item|listing|car|inventory)>/gi
  let match

  while ((match = vehiclePattern.exec(xml)) !== null) {
    const block = match[1]
    const vehicle = extractXmlFields(block!)
    if (vehicle.make && vehicle.model) {
      results.push(vehicle)
    }
  }

  return results
}

function extractXmlFields(block: string): ParsedVehicle {
  const get = (tagNames: string[]): string | undefined => {
    for (const tag of tagNames) {
      const m = new RegExp(`<${tag}[^>]*>\\s*([^<]+?)\\s*</${tag}>`, "i").exec(block)
      if (m && m[1]) return m[1].trim()
    }
    return undefined
  }

  const yearStr = get(["year", "model_year", "modelYear"])
  const priceStr = get(["price", "asking_price", "askingPrice", "listPrice"])
  const mileageStr = get(["mileage", "miles", "odometer"])

  return {
    vin: get(["vin", "VIN"]),
    year: yearStr ? parseInt(yearStr, 10) || undefined : undefined,
    make: get(["make", "Make", "manufacturer"]),
    model: get(["model", "Model"]),
    trim: get(["trim", "Trim", "trimLevel"]),
    mileage: mileageStr ? parseInt(mileageStr.replace(/[,\s]/g, ""), 10) || undefined : undefined,
    // Convert dollar price to cents for priceCents field
    priceCents: priceStr ? Math.round(parseFloat(priceStr.replace(/[$,\s]/g, "")) * 100) || undefined : undefined,
    exteriorColor: get(["exteriorColor", "exterior_color", "color"]),
    bodyStyle: get(["bodyStyle", "body_style", "body", "bodyType"]),
    stockNumber: get(["stockNumber", "stock_number", "stock"]),
  }
}

// ── CSV Parser ──────────────────────────────────────────────────────

function parseCsvInventory(csv: string): ParsedVehicle[] {
  if (!csv || typeof csv !== "string") return []

  const lines = csv.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0]!.split(",").map(h => h.trim().replace(/^"|"$/g, ""))
  const results: ParsedVehicle[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]!)
    if (values.length !== headers.length) continue

    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]!] = values[j]!
    }

    const vehicle: ParsedVehicle = {
      vin: row.vin || row.VIN,
      year: parseInt(row.year || row.Year || "0", 10) || undefined,
      make: row.make || row.Make,
      model: row.model || row.Model,
      trim: row.trim || row.Trim,
      mileage: parseInt((row.mileage || row.Mileage || "0").replace(/[,\s]/g, ""), 10) || undefined,
      // Convert dollar price to cents for priceCents field
      priceCents: parseInt((row.price || row.Price || "0").replace(/[$,\s]/g, ""), 10) ? Math.round(parseFloat((row.price || row.Price || "0").replace(/[$,\s]/g, "")) * 100) : undefined,
      exteriorColor: row.exteriorColor || row.exterior_color || row.color,
      bodyStyle: row.bodyStyle || row.body_style || row.body,
      stockNumber: row.stockNumber || row.stock_number || row.stock,
    }

    if (vehicle.make && vehicle.model) results.push(vehicle)
  }

  return results
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  values.push(current.trim())
  return values
}

export { fetchAndSyncSource as fetchSource }
