import { getSupabase } from "@/lib/db"
import {
  normalizeMake,
  normalizeVin,
  normalizeYear,
  normalizePriceCents,
} from "@/lib/services/inventory-normalize.service"

/**
 * Re-normalize a raw listing and upsert the canonical listing.
 *
 * Used by the admin RENORMALIZE action to refresh canonical data
 * from the original raw source record.
 */
export async function promoteRawListing(raw: Record<string, unknown>) {
  const supabase = getSupabase()
  const payload = (raw.raw_payload ?? raw) as Record<string, unknown>

  const make = normalizeMake(String(payload.make ?? raw.make ?? ""))
  const model = String(payload.model ?? raw.model ?? "").trim() || null
  const year = normalizeYear(payload.year ?? raw.year)
  const vin = normalizeVin(String(payload.vin ?? raw.vin ?? ""))
  const priceCents = normalizePriceCents(payload.price ?? raw.price)
  const price = priceCents != null ? Math.round(priceCents / 100) : null

  const mileageRaw = payload.mileage ?? raw.mileage
  const mileage =
    mileageRaw != null && Number.isFinite(Number(mileageRaw)) && Number(mileageRaw) >= 0
      ? Number(mileageRaw)
      : null

  const normalized = {
    make: make || null,
    model,
    year,
    vin,
    price,
    mileage,
    trim: String(payload.trim ?? raw.trim ?? "").trim() || null,
    dealer_name: String(payload.dealer_name ?? payload.dealerName ?? raw.dealer_name ?? "").trim() || null,
    dealer_phone: String(payload.dealer_phone ?? payload.dealerPhone ?? raw.dealer_phone ?? "").trim() || null,
    dealer_address: String(payload.dealer_address ?? payload.dealerAddress ?? raw.dealer_address ?? "").trim() || null,
    dealer_website: String(payload.dealer_website ?? payload.dealerWebsite ?? raw.dealer_website ?? "").trim() || null,
    listing_url: String(payload.listing_url ?? payload.listingUrl ?? raw.listing_url ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  }

  // Upsert into canonical table if raw record has a canonical listing reference
  const canonicalId = raw.canonical_listing_id ?? raw.id
  if (!canonicalId) {
    return { success: false, error: "No canonical listing ID to update" }
  }

  const { error } = await supabase
    .from("inventory_listings_canonical")
    .update(normalized)
    .eq("id", String(canonicalId))

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, normalized }
}
