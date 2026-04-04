import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { InventoryStatus } from "@/lib/constants/statuses"

export const dynamic = "force-dynamic"

interface ValidationError {
  row: number
  field?: string
  message: string
}

interface ProcessedResult {
  success: number
  failed: number
  processed: number
  errors: ValidationError[]
  importId?: string
}

// VIN validation
function isValidVIN(vin: string): boolean {
  if (!vin || vin.length !== 17) return false
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)
}

// Year validation
function isValidYear(year: any): boolean {
  const currentYear = new Date().getFullYear()
  const yearNum = Number.parseInt(year)
  return !isNaN(yearNum) && yearNum >= 1900 && yearNum <= currentYear + 2
}

// Price validation
function isValidPrice(price: any): boolean {
  const priceNum = Number.parseFloat(price)
  return !isNaN(priceNum) && priceNum >= 0
}

// Mileage validation
function isValidMileage(mileage: any): boolean {
  const mileageNum = Number.parseInt(mileage)
  return !isNaN(mileageNum) && mileageNum >= 0 && mileageNum <= 999999
}

// Photo URL validation
function isValidPhotoUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Parse CSV
function parseCSV(content: string): any[] {
  const lines = content.split("\n").filter((line) => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim())
  const rows: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim())
    const row: any = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ""
    })

    rows.push(row)
  }

  return rows
}

// Validate row
function validateRow(row: any, rowIndex: number): ValidationError[] {
  const errors: ValidationError[] = []

  // Required fields
  if (!row.vin) {
    errors.push({ row: rowIndex, field: "vin", message: "VIN is required" })
  } else if (!isValidVIN(row.vin)) {
    errors.push({ row: rowIndex, field: "vin", message: `Invalid VIN format: ${row.vin}` })
  }

  if (!row.year) {
    errors.push({ row: rowIndex, field: "year", message: "Year is required" })
  } else if (!isValidYear(row.year)) {
    errors.push({ row: rowIndex, field: "year", message: `Invalid year: ${row.year}` })
  }

  if (!row.make) {
    errors.push({ row: rowIndex, field: "make", message: "Make is required" })
  }

  if (!row.model) {
    errors.push({ row: rowIndex, field: "model", message: "Model is required" })
  }

  if (!row.bodyStyle) {
    errors.push({ row: rowIndex, field: "bodyStyle", message: "Body style is required" })
  }

  if (!row.mileage) {
    errors.push({ row: rowIndex, field: "mileage", message: "Mileage is required" })
  } else if (!isValidMileage(row.mileage)) {
    errors.push({ row: rowIndex, field: "mileage", message: `Invalid mileage: ${row.mileage}` })
  }

  if (!row.price) {
    errors.push({ row: rowIndex, field: "price", message: "Price is required" })
  } else if (!isValidPrice(row.price)) {
    errors.push({ row: rowIndex, field: "price", message: `Invalid price: ${row.price}` })
  }

  // Validate photo URLs if provided
  if (row.photoUrls) {
    const urls = row.photoUrls.split(",").map((u: string) => u.trim())
    urls.forEach((url: string) => {
      if (url && !isValidPhotoUrl(url)) {
        errors.push({ row: rowIndex, field: "photoUrls", message: `Invalid photo URL: ${url}` })
      }
    })
  }

  return errors
}

// Process vehicle row — insert/update InventoryItem directly (no separate Vehicle record)
async function processVehicleRow(row: any, dealerId: string, action: string): Promise<boolean> {
  try {
    const {
      vin,
      year,
      make,
      model,
      trim,
      bodyStyle,
      mileage,
      exteriorColor,
      interiorColor,
      transmission,
      fuelType,
      price,
      photoUrls,
    } = row

    const images = photoUrls
      ? photoUrls
          .split(",")
          .map((u: string) => u.trim())
          .filter(Boolean)
      : []

    if (action === "remove" && vin) {
      // Remove from inventory by VIN
      await supabase.from("InventoryItem").delete().eq("dealerId", dealerId).eq("vin", vin)
      return true
    }

    if (action === "sold" && vin) {
      // Mark as sold by VIN
      await supabase
        .from("InventoryItem")
        .update({ status: InventoryStatus.SOLD })
        .eq("dealerId", dealerId)
        .eq("vin", vin)
      return true
    }

    // Resolve dealer's workspaceId
    const { data: dealer } = await supabase
      .from("Dealer")
      .select("workspaceId")
      .eq("id", dealerId)
      .maybeSingle()
    const workspaceId = dealer?.workspaceId || dealerId

    const priceCents = Math.round(Number.parseFloat(price) * 100)

    // Check for existing inventory item by VIN
    const { data: existingItem } = vin
      ? await supabase.from("InventoryItem").select("id").eq("dealerId", dealerId).eq("vin", vin).maybeSingle()
      : { data: null }

    if (existingItem && action === "update") {
      // Update existing inventory item
      await supabase
        .from("InventoryItem")
        .update({
          priceCents,
          year: Number.parseInt(year),
          make,
          model,
          trim: trim || null,
          bodyStyle,
          mileage: Number.parseInt(mileage),
          exteriorColor: exteriorColor || null,
          interiorColor: interiorColor || null,
          transmission: transmission || null,
          fuelType: fuelType || null,
          photosJson: images,
        })
        .eq("id", existingItem.id)
    } else if (!existingItem && action !== "remove" && action !== "sold") {
      // Create new inventory item
      await supabase.from("InventoryItem").insert({
        dealerId,
        workspaceId,
        priceCents,
        vin,
        year: Number.parseInt(year),
        make,
        model,
        trim: trim || null,
        bodyStyle,
        mileage: Number.parseInt(mileage),
        exteriorColor: exteriorColor || null,
        interiorColor: interiorColor || null,
        transmission: transmission || null,
        fuelType: fuelType || null,
        photosJson: images,
        status: InventoryStatus.AVAILABLE,
        source: "CSV_UPLOAD",
      })
    }

    return true
  } catch (error) {
    console.error("[Bulk Upload] Process vehicle error:", error)
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Get dealer
    const { data: dealer, error: dealerError } = await supabase
      .from("Dealer")
      .select("id, businessName")
      .eq("userId", user.userId)
      .maybeSingle()

    if (dealerError || !dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    // Parse form data
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Read file content
    const content = await file.text()

    // Parse file based on type
    let rows: any[] = []

    if (file.name.endsWith(".csv") || file.name.endsWith(".tsv") || file.name.endsWith(".txt")) {
      rows = parseCSV(content)
    } else if (file.name.endsWith(".xml")) {
      return NextResponse.json({ error: "XML parsing not yet implemented" }, { status: 400 })
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      return NextResponse.json({ error: "Excel parsing requires additional libraries" }, { status: 400 })
    } else {
      return NextResponse.json({ error: "Unsupported file format" }, { status: 400 })
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "No data found in file" }, { status: 400 })
    }

    // Validate and process rows
    const result: ProcessedResult = {
      success: 0,
      failed: 0,
      processed: rows.length,
      errors: [],
    }

    // Check for duplicates within the file
    const vins = new Set<string>()
    const duplicateVins = new Set<string>()

    rows.forEach((row, index) => {
      if (row.vin) {
        if (vins.has(row.vin)) {
          duplicateVins.add(row.vin)
          result.errors.push({
            row: index + 2,
            field: "vin",
            message: `Duplicate VIN in file: ${row.vin}`,
          })
        }
        vins.add(row.vin)
      }
    })

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 2 // Account for header row

      // Validate row
      const validationErrors = validateRow(row, rowNumber)

      if (validationErrors.length > 0) {
        result.errors.push(...validationErrors)
        result.failed++
        continue
      }

      // Skip duplicates
      if (duplicateVins.has(row.vin)) {
        result.failed++
        continue
      }

      // Process vehicle
      const action = row.action?.toLowerCase() || "add"
      const success = await processVehicleRow(row, dealer.id, action)

      if (success) {
        result.success++
      } else {
        result.failed++
        result.errors.push({
          row: rowNumber,
          message: "Failed to process vehicle",
        })
      }
    }

    // Create import log
    const { data: importLog } = await supabase
      .from("inventory_import_log")
      .insert({
        dealer_id: dealer.id,
        user_id: user.userId,
        file_name: file.name,
        file_size: file.size,
        total_rows: rows.length,
        success_rows: result.success,
        failed_rows: result.failed,
        errors: result.errors,
        status: result.failed === 0 ? "completed" : "partial",
      })
      .select("id")
      .single()

    if (importLog) {
      result.importId = importLog.id
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[Bulk Upload] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
