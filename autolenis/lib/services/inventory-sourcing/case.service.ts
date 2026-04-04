import { getSupabase } from "@/lib/db"
import { logger } from "@/lib/logger"

// ---------------------------------------------------------------------------
// Status enums
// ---------------------------------------------------------------------------

export const BuyerPackageStatus = {
  DRAFT: "DRAFT",
  READY: "READY",
  APPROVED: "APPROVED",
  ARCHIVED: "ARCHIVED",
} as const
export type BuyerPackageStatus = (typeof BuyerPackageStatus)[keyof typeof BuyerPackageStatus]

export const SourcingCaseStatus = {
  OPEN: "OPEN",
  INVITED: "INVITED",
  RESPONDING: "RESPONDING",
  OPTIONS_READY: "OPTIONS_READY",
  SELECTED: "SELECTED",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
} as const
export type SourcingCaseStatus = (typeof SourcingCaseStatus)[keyof typeof SourcingCaseStatus]

export const InviteStatus = {
  PENDING: "PENDING",
  SENT: "SENT",
  VIEWED: "VIEWED",
  RESPONDED: "RESPONDED",
  DECLINED: "DECLINED",
  EXPIRED: "EXPIRED",
} as const
export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus]

export const OfferStatus = {
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  SHORTLISTED: "SHORTLISTED",
  SELECTED: "SELECTED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
} as const
export type OfferStatus = (typeof OfferStatus)[keyof typeof OfferStatus]

// ---------------------------------------------------------------------------
// Valid status transitions
// ---------------------------------------------------------------------------

export const BUYER_PACKAGE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["READY", "ARCHIVED"],
  READY: ["APPROVED", "ARCHIVED"],
  APPROVED: ["ARCHIVED"],
  ARCHIVED: [],
}

export const SOURCING_CASE_TRANSITIONS: Record<string, string[]> = {
  OPEN: ["INVITED", "CANCELLED"],
  INVITED: ["RESPONDING", "CANCELLED"],
  RESPONDING: ["OPTIONS_READY", "CANCELLED"],
  OPTIONS_READY: ["SELECTED", "CANCELLED"],
  SELECTED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
}

export const INVITE_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["SENT", "EXPIRED"],
  SENT: ["VIEWED", "EXPIRED"],
  VIEWED: ["RESPONDED", "DECLINED", "EXPIRED"],
  RESPONDED: [],
  DECLINED: [],
  EXPIRED: [],
}

export const OFFER_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ["UNDER_REVIEW", "WITHDRAWN"],
  UNDER_REVIEW: ["SHORTLISTED", "REJECTED", "WITHDRAWN"],
  SHORTLISTED: ["SELECTED", "REJECTED", "WITHDRAWN"],
  SELECTED: [],
  REJECTED: [],
  WITHDRAWN: [],
}

// ---------------------------------------------------------------------------
// Buyer package operations
// ---------------------------------------------------------------------------

export async function createBuyerPackageFromLead(leadId: string) {
  const supabase = getSupabase()

  const { data: lead, error: leadError } = await supabase
    .from("inventory_leads")
    .select("*")
    .eq("id", leadId)
    .single()

  if (leadError || !lead) throw new Error("Lead not found")

  const { data, error } = await supabase
    .from("buyer_packages_intake")
    .insert({
      lead_id: lead.id,
      buyer_user_id: lead.buyer_user_id,
      buyer_name: lead.buyer_name,
      buyer_email: lead.buyer_email,
      buyer_phone: lead.buyer_phone,
      buyer_zip: lead.buyer_zip,
      requested_listing_id: lead.listing_id,
      canonical_vehicle_id: lead.canonical_vehicle_id,
      package_type: lead.lead_type === "CLAIM" ? "CLAIM" : "SOURCE",
      status: "READY",
      notes: lead.notes,
      payload: lead.payload || {},
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function createBuyerPackageFromSourcingRequest(requestId: string) {
  const supabase = getSupabase()

  const { data: req, error: reqError } = await supabase
    .from("vehicle_sourcing_requests")
    .select("*")
    .eq("id", requestId)
    .single()

  if (reqError || !req) throw new Error("Sourcing request not found")

  const { data, error } = await supabase
    .from("buyer_packages_intake")
    .insert({
      sourcing_request_id: req.id,
      buyer_user_id: req.buyer_user_id,
      buyer_name: req.buyer_name,
      buyer_email: req.buyer_email,
      buyer_phone: req.buyer_phone,
      buyer_zip: req.buyer_zip,
      year_min: req.year_min,
      year_max: req.year_max,
      make: req.make,
      model: req.model,
      trim: req.trim,
      max_price: req.max_price,
      max_mileage: req.max_mileage,
      preferred_zip: req.preferred_zip,
      preferred_radius: req.preferred_radius,
      package_type: "SOURCE",
      status: "READY",
      notes: req.notes,
      payload: req.payload || {},
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getBuyerPackage(packageId: string) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("buyer_packages_intake")
    .select("*")
    .eq("id", packageId)
    .single()

  if (error) throw error
  return data
}

export async function listBuyerPackages(filters: {
  status?: string
  packageType?: string
  limit?: number
  offset?: number
}) {
  const supabase = getSupabase()

  let query = supabase
    .from("buyer_packages_intake")
    .select("*")
    .order("created_at", { ascending: false })

  if (filters.status) query = query.eq("status", filters.status)
  if (filters.packageType) query = query.eq("package_type", filters.packageType)

  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function updateBuyerPackageStatus(packageId: string, newStatus: string) {
  const supabase = getSupabase()

  const { data: existing, error: fetchError } = await supabase
    .from("buyer_packages_intake")
    .select("status")
    .eq("id", packageId)
    .single()

  if (fetchError || !existing) throw new Error("Buyer package not found")

  const allowed = BUYER_PACKAGE_TRANSITIONS[existing.status] ?? []
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: ${existing.status} → ${newStatus}`,
    )
  }

  const { data, error } = await supabase
    .from("buyer_packages_intake")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", packageId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Sourcing case operations
// ---------------------------------------------------------------------------

export async function openSourcingCase(input: {
  buyerPackageId: string
  leadId?: string | null
  sourcingRequestId?: string | null
  caseType?: string
  assignedAdminUserId?: string | null
  matchedDealerId?: string | null
  matchedExternalDealerId?: string | null
}) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("sourcing_cases")
    .insert({
      buyer_package_id: input.buyerPackageId,
      lead_id: input.leadId || null,
      sourcing_request_id: input.sourcingRequestId || null,
      case_type: input.caseType || "SOURCE",
      status: "OPEN",
      assigned_admin_user_id: input.assignedAdminUserId || null,
      matched_dealer_id: input.matchedDealerId || null,
      matched_external_dealer_id: input.matchedExternalDealerId || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getSourcingCase(caseId: string) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("sourcing_cases")
    .select("*")
    .eq("id", caseId)
    .single()

  if (error) throw error
  return data
}

export async function listSourcingCases(filters: {
  status?: string
  caseType?: string
  assignedAdminUserId?: string
  limit?: number
  offset?: number
}) {
  const supabase = getSupabase()

  let query = supabase
    .from("sourcing_cases")
    .select("*")
    .order("created_at", { ascending: false })

  if (filters.status) query = query.eq("status", filters.status)
  if (filters.caseType) query = query.eq("case_type", filters.caseType)
  if (filters.assignedAdminUserId) query = query.eq("assigned_admin_user_id", filters.assignedAdminUserId)

  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0
  query = query.range(offset, offset + limit - 1)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function updateSourcingCaseStatus(caseId: string, newStatus: string) {
  const supabase = getSupabase()

  const { data: existing, error: fetchError } = await supabase
    .from("sourcing_cases")
    .select("status")
    .eq("id", caseId)
    .single()

  if (fetchError || !existing) throw new Error("Sourcing case not found")

  const allowed = SOURCING_CASE_TRANSITIONS[existing.status] ?? []
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: ${existing.status} → ${newStatus}`,
    )
  }

  const { data, error } = await supabase
    .from("sourcing_cases")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", caseId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Invite operations
// ---------------------------------------------------------------------------

export async function inviteDealerToCase(input: {
  sourcingCaseId: string
  dealerId?: string | null
  externalDealerId?: string | null
  inviteType?: string
  expiresAt?: string | null
  payload?: Record<string, unknown>
}) {
  const supabase = getSupabase()

  if (!input.dealerId && !input.externalDealerId) {
    throw new Error("Either dealerId or externalDealerId is required")
  }

  const { data, error } = await supabase
    .from("sourcing_case_invites")
    .insert({
      sourcing_case_id: input.sourcingCaseId,
      dealer_id: input.dealerId || null,
      external_dealer_id: input.externalDealerId || null,
      invite_type: input.inviteType || "PLATFORM",
      status: "PENDING",
      expires_at: input.expiresAt || null,
      payload: input.payload || {},
    })
    .select()
    .single()

  if (error) throw error

  logger.info("[CASE_SERVICE] Dealer invited", {
    sourcingCaseId: input.sourcingCaseId,
    inviteId: data.id,
  })

  return data
}

export async function listInvitesForCase(sourcingCaseId: string) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("sourcing_case_invites")
    .select("*")
    .eq("sourcing_case_id", sourcingCaseId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function updateInviteStatus(inviteId: string, newStatus: string) {
  const supabase = getSupabase()

  const { data: existing, error: fetchError } = await supabase
    .from("sourcing_case_invites")
    .select("status")
    .eq("id", inviteId)
    .single()

  if (fetchError || !existing) throw new Error("Invite not found")

  const allowed = INVITE_TRANSITIONS[existing.status] ?? []
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: ${existing.status} → ${newStatus}`,
    )
  }

  const timestampFields: Record<string, string> = {}
  const now = new Date().toISOString()
  if (newStatus === "SENT") timestampFields.sent_at = now
  if (newStatus === "VIEWED") timestampFields.viewed_at = now
  if (newStatus === "RESPONDED" || newStatus === "DECLINED") timestampFields.responded_at = now

  const { data, error } = await supabase
    .from("sourcing_case_invites")
    .update({ status: newStatus, updated_at: now, ...timestampFields })
    .eq("id", inviteId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ---------------------------------------------------------------------------
// Offer operations
// ---------------------------------------------------------------------------

export async function submitOffer(input: {
  sourcingCaseId: string
  inviteId?: string | null
  dealerId?: string | null
  externalDealerId?: string | null
  listingId?: string | null
  canonicalVehicleId?: string | null
  year?: number | null
  make?: string | null
  model?: string | null
  trim?: string | null
  vin?: string | null
  mileage?: number | null
  price?: number | null
  fees?: Record<string, unknown>
  notes?: string | null
  listingUrl?: string | null
  payload?: Record<string, unknown>
}) {
  const supabase = getSupabase()

  if (!input.dealerId && !input.externalDealerId) {
    throw new Error("Either dealerId or externalDealerId is required")
  }

  const { data, error } = await supabase
    .from("sourcing_case_offers")
    .insert({
      sourcing_case_id: input.sourcingCaseId,
      invite_id: input.inviteId || null,
      dealer_id: input.dealerId || null,
      external_dealer_id: input.externalDealerId || null,
      listing_id: input.listingId || null,
      canonical_vehicle_id: input.canonicalVehicleId || null,
      status: "SUBMITTED",
      year: input.year ?? null,
      make: input.make ?? null,
      model: input.model ?? null,
      trim: input.trim ?? null,
      vin: input.vin ?? null,
      mileage: input.mileage ?? null,
      price: input.price ?? null,
      fees: input.fees || {},
      notes: input.notes ?? null,
      listing_url: input.listingUrl ?? null,
      payload: input.payload || {},
    })
    .select()
    .single()

  if (error) throw error

  logger.info("[CASE_SERVICE] Offer submitted", {
    sourcingCaseId: input.sourcingCaseId,
    offerId: data.id,
  })

  return data
}

export async function listOffersForCase(sourcingCaseId: string) {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from("sourcing_case_offers")
    .select("*")
    .eq("sourcing_case_id", sourcingCaseId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function updateOfferStatus(offerId: string, newStatus: string) {
  const supabase = getSupabase()

  const { data: existing, error: fetchError } = await supabase
    .from("sourcing_case_offers")
    .select("status")
    .eq("id", offerId)
    .single()

  if (fetchError || !existing) throw new Error("Offer not found")

  const allowed = OFFER_TRANSITIONS[existing.status] ?? []
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: ${existing.status} → ${newStatus}`,
    )
  }

  const { data, error } = await supabase
    .from("sourcing_case_offers")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", offerId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function selectOffer(caseId: string, offerId: string) {
  const supabase = getSupabase()

  // Mark the offer as SELECTED
  const offer = await updateOfferStatus(offerId, OfferStatus.SELECTED)

  // Link the offer to the sourcing case
  const { error: caseError } = await supabase
    .from("sourcing_cases")
    .update({
      selected_offer_id: offerId,
      status: SourcingCaseStatus.SELECTED,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId)

  if (caseError) throw caseError

  logger.info("[CASE_SERVICE] Offer selected for case", { caseId, offerId })

  return offer
}
