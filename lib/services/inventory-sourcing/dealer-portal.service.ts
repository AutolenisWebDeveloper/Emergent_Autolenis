/**
 * Phase 8 — Dealer Portal Service
 *
 * Manages dealer-facing sourcing participation:
 *   - Invite inbox queries
 *   - Invite status transitions (VIEWED / ACCEPTED / DECLINED)
 *   - Offer submission
 *   - External-to-onboarded dealer migration
 *
 * All tables live in raw Supabase (not Prisma).
 */

import { getSupabase } from "@/lib/db"

// ---------------------------------------------------------------------------
// Status constants
// ---------------------------------------------------------------------------

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
// Valid invite status transitions
// ---------------------------------------------------------------------------

const VALID_INVITE_TRANSITIONS: Partial<Record<InviteStatus, InviteStatus[]>> = {
  PENDING: ["SENT"],
  SENT: ["VIEWED", "DECLINED", "EXPIRED"],
  VIEWED: ["RESPONDED", "DECLINED", "EXPIRED"],
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class DealerPortalService {
  // ------------------------------------------------------------------
  // Invite queries
  // ------------------------------------------------------------------

  /**
   * List all sourcing-case invites for a dealer, newest first.
   * Includes the related VehicleRequestCase + its items.
   */
  async getInvitesForDealer(dealerId: string) {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("dealer_portal_invites")
      .select(`
        *,
        VehicleRequestCase (
          id,
          buyerId,
          status,
          marketZip,
          radiusMiles,
          createdAt,
          updatedAt,
          submittedAt
        )
      `)
      .eq("dealer_id", dealerId)
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(`Failed to load dealer invites: ${error.message}`)
    }

    return data ?? []
  }

  /**
   * Get a single invite by ID, verifying it belongs to the given dealer.
   */
  async getInvite(inviteId: string, dealerId: string) {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("dealer_portal_invites")
      .select("*")
      .eq("id", inviteId)
      .eq("dealer_id", dealerId)
      .single()

    if (error || !data) return null
    return data
  }

  // ------------------------------------------------------------------
  // Invite lifecycle
  // ------------------------------------------------------------------

  /**
   * Transition an invite to a new status.
   * Validates the transition and sets timestamp fields.
   */
  async respondToInvite(
    inviteId: string,
    dealerId: string,
    action: "VIEWED" | "DECLINED" | "ACCEPTED",
  ) {
    const invite = await this.getInvite(inviteId, dealerId)
    if (!invite) {
      throw new Error("Invite not found")
    }

    // Map the caller's action to the actual invite status
    const nextStatus: InviteStatus =
      action === "ACCEPTED" ? InviteStatus.RESPONDED : (action as InviteStatus)

    const currentStatus = invite.status as InviteStatus
    const allowed = VALID_INVITE_TRANSITIONS[currentStatus]
    if (!allowed || !allowed.includes(nextStatus)) {
      throw new Error(
        `Cannot transition invite from ${currentStatus} to ${nextStatus}`,
      )
    }

    const supabase = getSupabase()
    const now = new Date().toISOString()

    const patch: Record<string, unknown> = {
      status: nextStatus,
      updated_at: now,
    }

    if (action === "VIEWED") {
      patch.viewed_at = now
    }
    if (action === "ACCEPTED" || action === "DECLINED") {
      patch.responded_at = now
    }

    const { data, error } = await supabase
      .from("dealer_portal_invites")
      .update(patch)
      .eq("id", inviteId)
      .eq("dealer_id", dealerId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update invite: ${error.message}`)
    }

    return data
  }

  // ------------------------------------------------------------------
  // Offer submission
  // ------------------------------------------------------------------

  /**
   * Submit a structured offer for a sourcing case (via an invite).
   */
  async submitOffer(
    inviteId: string,
    dealerId: string,
    offerData: {
      listingUrl?: string
      vin?: string
      year?: number
      make?: string
      model?: string
      trim?: string
      mileage?: number
      priceCents?: number
      feesCents?: number
      notes?: string
    },
  ) {
    // Verify the invite exists and is in an acceptable state
    const invite = await this.getInvite(inviteId, dealerId)
    if (!invite) {
      throw new Error("Invite not found")
    }

    if (
      invite.status !== InviteStatus.VIEWED &&
      invite.status !== InviteStatus.RESPONDED
    ) {
      throw new Error(
        `Cannot submit offer: invite is in ${invite.status} status`,
      )
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("dealer_portal_offers")
      .insert({
        invite_id: inviteId,
        case_id: invite.case_id,
        dealer_id: dealerId,
        listing_url: offerData.listingUrl ?? null,
        vin: offerData.vin ?? null,
        year: offerData.year ?? null,
        make: offerData.make ?? null,
        model: offerData.model ?? null,
        trim: offerData.trim ?? null,
        mileage: offerData.mileage ?? null,
        price_cents: offerData.priceCents ?? null,
        fees_cents: offerData.feesCents ?? 0,
        notes: offerData.notes ?? null,
        status: OfferStatus.SUBMITTED,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to submit offer: ${error.message}`)
    }

    // Ensure the invite is in RESPONDED state once an offer is submitted
    if (invite.status === InviteStatus.VIEWED) {
      const { error: transitionError } = await supabase
        .from("dealer_portal_invites")
        .update({
          status: InviteStatus.RESPONDED,
          responded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", inviteId)
        .eq("dealer_id", dealerId)

      if (transitionError) {
        throw new Error(
          `Offer submitted but invite status update failed: ${transitionError.message}`,
        )
      }
    }

    return data
  }

  /**
   * List offers a dealer has submitted for a given invite.
   */
  async getOffersForInvite(inviteId: string, dealerId: string) {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("dealer_portal_offers")
      .select("*")
      .eq("invite_id", inviteId)
      .eq("dealer_id", dealerId)
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(`Failed to load offers: ${error.message}`)
    }
    return data ?? []
  }

  // ------------------------------------------------------------------
  // External-to-onboarded dealer migration
  // ------------------------------------------------------------------

  /**
   * Map a scraped external dealer name to an onboarded dealer record.
   */
  async mapExternalDealer(input: {
    externalDealerName: string
    externalDealerSource: string
    dealerId: string
    matchedBy?: string
    confidence?: number
    notes?: string
  }) {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("dealer_portal_external_matches")
      .upsert(
        {
          external_dealer_name: input.externalDealerName,
          external_dealer_source: input.externalDealerSource,
          dealer_id: input.dealerId,
          matched_by: input.matchedBy ?? null,
          confidence: input.confidence ?? 1.0,
          notes: input.notes ?? null,
          matched_at: new Date().toISOString(),
        },
        { onConflict: "external_dealer_name,external_dealer_source,dealer_id" },
      )
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to map external dealer: ${error.message}`)
    }
    return data
  }

  /**
   * List all external dealer matches for an onboarded dealer.
   */
  async getExternalMatches(dealerId: string) {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("dealer_portal_external_matches")
      .select("*")
      .eq("dealer_id", dealerId)
      .order("matched_at", { ascending: false })

    if (error) {
      throw new Error(`Failed to load external matches: ${error.message}`)
    }
    return data ?? []
  }

  /**
   * Look up onboarded dealer by external dealer name and source.
   */
  async findOnboardedDealer(externalDealerName: string, externalDealerSource: string) {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("dealer_portal_external_matches")
      .select("*")
      .eq("external_dealer_name", externalDealerName)
      .eq("external_dealer_source", externalDealerSource)
      .order("confidence", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to find onboarded dealer: ${error.message}`)
    }
    return data
  }
}

export const dealerPortalService = new DealerPortalService()
