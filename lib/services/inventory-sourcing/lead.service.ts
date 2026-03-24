import { getSupabase } from "@/lib/db"

// ── Lead lifecycle statuses ────────────────────────────────────────
export const LEAD_STATUSES = [
  "NEW",
  "REVIEW",
  "ASSIGNED",
  "CONTACTED",
  "NEGOTIATING",
  "CONVERTED",
  "CLOSED",
  "REJECTED",
] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

// ── Sourcing lifecycle statuses ────────────────────────────────────
export const SOURCING_STATUSES = [
  "OPEN",
  "SEARCHING",
  "OPTIONS_READY",
  "ASSIGNED",
  "CONVERTED",
  "CLOSED",
] as const
export type SourcingStatus = (typeof SOURCING_STATUSES)[number]

export const LEAD_TYPES = ["CLAIM", "SOURCE"] as const
export type LeadType = (typeof LEAD_TYPES)[number]

// ── Pagination helper ──────────────────────────────────────────────

function validatePagination(raw: { limit?: number; offset?: number }) {
  return {
    limit: Math.min(raw.limit ?? 50, 200),
    offset: Math.max(raw.offset ?? 0, 0),
  }
}

// ── Event helpers ──────────────────────────────────────────────────

export async function writeLeadEvent(
  leadId: string,
  eventType: string,
  actorUserId?: string | null,
  payload?: Record<string, unknown>,
) {
  const supabase = getSupabase()
  const { error } = await supabase.from("inventory_lead_events").insert({
    lead_id: leadId,
    event_type: eventType,
    actor_user_id: actorUserId ?? null,
    payload: payload ?? {},
  })
  if (error) throw new Error(`writeLeadEvent failed: ${error.message}`)
}

export async function getLeadEvents(leadId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("inventory_lead_events")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(`getLeadEvents failed: ${error.message}`)
  return data ?? []
}

// ── Lead CRUD ──────────────────────────────────────────────────────

export interface CreateLeadInput {
  listing_id?: string | null
  canonical_vehicle_id?: string | null
  external_dealer_id?: string | null
  matched_dealer_id?: string | null
  buyer_user_id?: string | null
  buyer_name?: string | null
  buyer_email?: string | null
  buyer_phone?: string | null
  buyer_zip?: string | null
  lead_type?: LeadType
  notes?: string | null
  payload?: Record<string, unknown>
}

export async function createLead(
  input: CreateLeadInput,
  actorUserId?: string | null,
) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("inventory_leads")
    .insert({
      listing_id: input.listing_id ?? null,
      canonical_vehicle_id: input.canonical_vehicle_id ?? null,
      external_dealer_id: input.external_dealer_id ?? null,
      matched_dealer_id: input.matched_dealer_id ?? null,
      buyer_user_id: input.buyer_user_id ?? null,
      buyer_name: input.buyer_name ?? null,
      buyer_email: input.buyer_email ?? null,
      buyer_phone: input.buyer_phone ?? null,
      buyer_zip: input.buyer_zip ?? null,
      lead_type: input.lead_type ?? "CLAIM",
      status: "NEW" as const,
      notes: input.notes ?? null,
      payload: input.payload ?? {},
    })
    .select()
    .single()

  if (error || !data) throw new Error(`createLead failed: ${error?.message ?? "unknown"}`)

  await writeLeadEvent(data.id, "LEAD_CREATED", actorUserId, {
    lead_type: data.lead_type,
  })

  return data
}

export async function getLeadById(leadId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("inventory_leads")
    .select("*")
    .eq("id", leadId)
    .single()

  if (error) throw new Error(`getLeadById failed: ${error.message}`)
  return data
}

export async function listLeads(filters: {
  status?: string
  lead_type?: string
  limit?: number
  offset?: number
}) {
  const supabase = getSupabase()
  const { limit, offset } = validatePagination(filters)

  let query = supabase
    .from("inventory_leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.status) query = query.eq("status", filters.status)
  if (filters.lead_type) query = query.eq("lead_type", filters.lead_type)

  const { data, error, count } = await query
  if (error) throw new Error(`listLeads failed: ${error.message}`)
  return { leads: data ?? [], total: count ?? 0, limit, offset }
}

export async function updateLeadStatus(
  leadId: string,
  newStatus: LeadStatus,
  actorUserId?: string | null,
  notes?: string | null,
) {
  if (!LEAD_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid lead status: ${newStatus}`)
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("inventory_leads")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .select()
    .single()

  if (error) throw new Error(`updateLeadStatus failed: ${error.message}`)

  await writeLeadEvent(leadId, "STATUS_CHANGED", actorUserId, {
    new_status: newStatus,
    notes: notes ?? null,
  })

  return data
}

export async function assignLead(
  leadId: string,
  assignment: {
    assigned_admin_user_id?: string | null
    assigned_dealer_id?: string | null
  },
  actorUserId?: string | null,
) {
  const supabase = getSupabase()

  const updateFields: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (assignment.assigned_admin_user_id !== undefined) {
    updateFields.assigned_admin_user_id = assignment.assigned_admin_user_id
  }
  if (assignment.assigned_dealer_id !== undefined) {
    updateFields.assigned_dealer_id = assignment.assigned_dealer_id
  }

  // Auto-transition to ASSIGNED if currently NEW or REVIEW
  const lead = await getLeadById(leadId)
  if (lead.status === "NEW" || lead.status === "REVIEW") {
    updateFields.status = "ASSIGNED"
  }

  const { data, error } = await supabase
    .from("inventory_leads")
    .update(updateFields)
    .eq("id", leadId)
    .select()
    .single()

  if (error) throw new Error(`assignLead failed: ${error.message}`)

  await writeLeadEvent(leadId, "LEAD_ASSIGNED", actorUserId, {
    assigned_admin_user_id: assignment.assigned_admin_user_id ?? null,
    assigned_dealer_id: assignment.assigned_dealer_id ?? null,
  })

  return data
}

// ── External Dealer Matching ───────────────────────────────────────

export async function createExternalDealerMatch(
  externalDealerId: string,
  dealerId: string,
  matchType: string = "ADMIN_CONFIRMED",
  confidenceScore: number = 100,
) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("external_dealer_matches")
    .insert({
      external_dealer_id: externalDealerId,
      dealer_id: dealerId,
      match_type: matchType,
      confidence_score: confidenceScore,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw new Error(`createExternalDealerMatch failed: ${error.message}`)
  return data
}

export async function listExternalDealerMatches(filters: {
  dealer_id?: string
  is_active?: boolean
  limit?: number
  offset?: number
}) {
  const supabase = getSupabase()
  const { limit, offset } = validatePagination(filters)

  let query = supabase
    .from("external_dealer_matches")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.dealer_id) query = query.eq("dealer_id", filters.dealer_id)
  if (filters.is_active !== undefined) query = query.eq("is_active", filters.is_active)

  const { data, error, count } = await query
  if (error) throw new Error(`listExternalDealerMatches failed: ${error.message}`)
  return { matches: data ?? [], total: count ?? 0, limit, offset }
}

export async function deactivateExternalDealerMatch(matchId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("external_dealer_matches")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", matchId)
    .select()
    .single()

  if (error) throw new Error(`deactivateExternalDealerMatch failed: ${error.message}`)
  return data
}

// ── Vehicle Sourcing Requests ──────────────────────────────────────

export interface CreateSourcingRequestInput {
  buyer_user_id?: string | null
  buyer_name?: string | null
  buyer_email?: string | null
  buyer_phone?: string | null
  buyer_zip?: string | null
  year_min?: number | null
  year_max?: number | null
  make?: string | null
  model?: string | null
  trim?: string | null
  max_price?: number | null
  max_mileage?: number | null
  preferred_zip?: string | null
  preferred_radius?: number | null
  notes?: string | null
  payload?: Record<string, unknown>
}

export async function createSourcingRequest(
  input: CreateSourcingRequestInput,
) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("vehicle_sourcing_requests")
    .insert({
      buyer_user_id: input.buyer_user_id ?? null,
      buyer_name: input.buyer_name ?? null,
      buyer_email: input.buyer_email ?? null,
      buyer_phone: input.buyer_phone ?? null,
      buyer_zip: input.buyer_zip ?? null,
      year_min: input.year_min ?? null,
      year_max: input.year_max ?? null,
      make: input.make ?? null,
      model: input.model ?? null,
      trim: input.trim ?? null,
      max_price: input.max_price ?? null,
      max_mileage: input.max_mileage ?? null,
      preferred_zip: input.preferred_zip ?? null,
      preferred_radius: input.preferred_radius ?? null,
      notes: input.notes ?? null,
      status: "OPEN" as const,
      payload: input.payload ?? {},
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`createSourcingRequest failed: ${error?.message ?? "unknown"}`)
  }
  return data
}

export async function getSourcingRequestById(requestId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("vehicle_sourcing_requests")
    .select("*")
    .eq("id", requestId)
    .single()

  if (error) throw new Error(`getSourcingRequestById failed: ${error.message}`)
  return data
}

export async function listSourcingRequests(filters: {
  status?: string
  limit?: number
  offset?: number
}) {
  const supabase = getSupabase()
  const { limit, offset } = validatePagination(filters)

  let query = supabase
    .from("vehicle_sourcing_requests")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.status) query = query.eq("status", filters.status)

  const { data, error, count } = await query
  if (error) throw new Error(`listSourcingRequests failed: ${error.message}`)
  return { requests: data ?? [], total: count ?? 0, limit, offset }
}

export async function updateSourcingRequestStatus(
  requestId: string,
  newStatus: SourcingStatus,
  assignment?: {
    assigned_admin_user_id?: string | null
    assigned_dealer_id?: string | null
  },
) {
  if (!SOURCING_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid sourcing status: ${newStatus}`)
  }

  const supabase = getSupabase()
  const updateFields: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }

  if (assignment?.assigned_admin_user_id !== undefined) {
    updateFields.assigned_admin_user_id = assignment.assigned_admin_user_id
  }
  if (assignment?.assigned_dealer_id !== undefined) {
    updateFields.assigned_dealer_id = assignment.assigned_dealer_id
  }

  const { data, error } = await supabase
    .from("vehicle_sourcing_requests")
    .update(updateFields)
    .eq("id", requestId)
    .select()
    .single()

  if (error) throw new Error(`updateSourcingRequestStatus failed: ${error.message}`)
  return data
}
