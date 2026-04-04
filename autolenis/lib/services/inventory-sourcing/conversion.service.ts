import { getSupabase, prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import {
  BuyerCaseStatus,
  SourcedOfferStatus,
} from "@/lib/services/sourcing.service"

// ---------------------------------------------------------------------------
// Phase 7: Sourcing Case → Deal Conversion Orchestrator
// ---------------------------------------------------------------------------
// Converts a SELECTED sourcing-case offer into the core AutoLenis
// transaction system in one controlled pass:
//   buyer resolution → deal creation → workflow seeding → completion
//
// Preserves full traceability: sourcing_case_id, selected_offer_id,
// buyer_package_id, listing_id, canonical_vehicle_id.
// ---------------------------------------------------------------------------

export const ConversionStatus = {
  PENDING: "PENDING",
  BUYER_RESOLVED: "BUYER_RESOLVED",
  DEAL_CREATED: "DEAL_CREATED",
  CONTRACTS_SEEDED: "CONTRACTS_SEEDED",
  PAYMENTS_SEEDED: "PAYMENTS_SEEDED",
  INSURANCE_SEEDED: "INSURANCE_SEEDED",
  PICKUP_SEEDED: "PICKUP_SEEDED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const
export type ConversionStatus =
  (typeof ConversionStatus)[keyof typeof ConversionStatus]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Write an audit event to `deal_conversion_events`.
 */
export async function writeConversionEvent(
  conversionId: string,
  eventType: string,
  actorUserId?: string | null,
  payload?: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("deal_conversion_events").insert({
    conversion_id: conversionId,
    event_type: eventType,
    actor_user_id: actorUserId ?? null,
    payload: payload ?? {},
  })
  if (error) {
    logger.error("[CONVERSION_EVENT] Failed to write event", {
      conversionId,
      eventType,
      error: error.message,
    })
  }
}

/**
 * Update the conversion row status (and optionally error/payload fields).
 */
async function updateConversionStatus(
  conversionId: string,
  status: ConversionStatus,
  extra?: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("inventory_case_conversions")
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq("id", conversionId)
  if (error) {
    logger.error("[CONVERSION] Failed to update status", {
      conversionId,
      status,
      error: error.message,
    })
  }
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export interface ConvertSourcingCaseInput {
  sourcingCaseId: string
  actorUserId: string
}

export interface ConversionResult {
  conversionId: string
  selectedDealId: string
  status: ConversionStatus
}

/**
 * Main orchestrator: converts a sourcing case with a selected offer
 * into the core deal pipeline.
 *
 * Preconditions:
 *  - Case status must be OFFER_SELECTED or IN_PLATFORM_TRANSACTION
 *  - An ACCEPTED offer must exist on the case
 *  - The case must not have been converted already
 */
export async function convertSourcingCase(
  input: ConvertSourcingCaseInput,
): Promise<ConversionResult> {
  const supabase = getSupabase()
  const { sourcingCaseId, actorUserId } = input

  // -----------------------------------------------------------------------
  // 1. Validate preconditions
  // -----------------------------------------------------------------------
  const sourcingCase = await prisma.vehicleRequestCase.findUnique({
    where: { id: sourcingCaseId },
    include: { offers: true, items: true },
  })
  if (!sourcingCase) {
    throw new Error(`Sourcing case not found: ${sourcingCaseId}`)
  }

  const validCaseStatuses: string[] = [
    BuyerCaseStatus.OFFER_SELECTED,
    BuyerCaseStatus.DEALER_INVITED,
    BuyerCaseStatus.IN_PLATFORM_TRANSACTION,
  ]
  if (!validCaseStatuses.includes(sourcingCase.status)) {
    throw new Error(
      `Case status must be OFFER_SELECTED, DEALER_INVITED, or IN_PLATFORM_TRANSACTION to convert (got ${sourcingCase.status})`,
    )
  }

  const selectedOffer = sourcingCase.offers.find(
    (o: { status: string }) => o.status === SourcedOfferStatus.ACCEPTED,
  )
  if (!selectedOffer) {
    throw new Error("No ACCEPTED offer found on this sourcing case")
  }

  // -----------------------------------------------------------------------
  // 2. Idempotency: check for existing conversion
  // -----------------------------------------------------------------------
  const { data: existingConversion } = await supabase
    .from("inventory_case_conversions")
    .select("*")
    .eq("sourcing_case_id", sourcingCaseId)
    .single()

  if (existingConversion) {
    if (existingConversion.status === ConversionStatus.COMPLETED) {
      return {
        conversionId: existingConversion.id,
        selectedDealId: existingConversion.selected_deal_id,
        status: ConversionStatus.COMPLETED,
      }
    }
    if (existingConversion.status === ConversionStatus.FAILED) {
      // Allow retry: delete the failed conversion so we can start fresh
      const { error: evtDelErr } = await supabase
        .from("deal_conversion_events")
        .delete()
        .eq("conversion_id", existingConversion.id)
      if (evtDelErr) {
        throw new Error(
          `Failed to clear previous conversion events for retry: ${evtDelErr.message}`,
        )
      }
      const { error: convDelErr } = await supabase
        .from("inventory_case_conversions")
        .delete()
        .eq("id", existingConversion.id)
      if (convDelErr) {
        throw new Error(
          `Failed to clear previous conversion record for retry: ${convDelErr.message}`,
        )
      }
    } else {
      // In progress — return current state
      return {
        conversionId: existingConversion.id,
        selectedDealId: existingConversion.selected_deal_id ?? "",
        status: existingConversion.status as ConversionStatus,
      }
    }
  }

  // -----------------------------------------------------------------------
  // 3. Create conversion record (PENDING)
  // -----------------------------------------------------------------------
  const { data: conversion, error: convInsertErr } = await supabase
    .from("inventory_case_conversions")
    .insert({
      sourcing_case_id: sourcingCaseId,
      selected_offer_id: selectedOffer.id,
      buyer_package_id: null,
      status: ConversionStatus.PENDING,
      payload: {
        offerVin: (selectedOffer as Record<string, unknown>).vin ?? null,
        offerMake: (selectedOffer as Record<string, unknown>).make ?? null,
        offerModel: (selectedOffer as Record<string, unknown>).modelName ?? null,
        offerYear: (selectedOffer as Record<string, unknown>).year ?? null,
      },
    })
    .select()
    .single()

  if (convInsertErr || !conversion) {
    throw new Error(
      `Failed to create conversion record: ${convInsertErr?.message ?? "unknown"}`,
    )
  }

  const conversionId: string = conversion.id

  await writeConversionEvent(conversionId, "CONVERSION_STARTED", actorUserId, {
    sourcingCaseId,
    selectedOfferId: selectedOffer.id,
  })

  try {
    // Shared pricing extracted once from the selected offer
    const pricing =
      (selectedOffer.pricingBreakdownJson as Record<string, number> | null) ??
      {}

    // -------------------------------------------------------------------
    // 4. Resolve buyer (BUYER_RESOLVED)
    // -------------------------------------------------------------------
    const buyerProfile = await prisma.buyerProfile.findUnique({
      where: { id: sourcingCase.buyerId },
    })
    if (!buyerProfile) {
      throw new Error(`Buyer profile not found: ${sourcingCase.buyerId}`)
    }

    await updateConversionStatus(conversionId, ConversionStatus.BUYER_RESOLVED, {
      buyer_user_id: buyerProfile.userId,
    })
    await writeConversionEvent(conversionId, "BUYER_RESOLVED", actorUserId, {
      buyerId: buyerProfile.id,
      buyerUserId: buyerProfile.userId,
    })

    // -------------------------------------------------------------------
    // 5. Resolve dealer
    // -------------------------------------------------------------------
    const dealerId: string | null =
      (selectedOffer as Record<string, unknown>).dealerId as string | null
    let resolvedDealerId: string | null = null

    if (dealerId) {
      const dealer = await prisma.dealer.findUnique({
        where: { id: dealerId },
        select: { id: true },
      })
      resolvedDealerId = dealer?.id ?? null
    }

    if (!resolvedDealerId) {
      // Try to resolve from dealer invite
      const invite = await prisma.dealerInvite.findFirst({
        where: { caseId: sourcingCaseId },
      })
      if (invite) {
        // Find dealer by the invite's dealer info
        const dealer = await prisma.dealer.findFirst({
          where: { email: invite.dealerEmail ?? undefined },
          select: { id: true },
        })
        resolvedDealerId = dealer?.id ?? null
      }
    }

    if (!resolvedDealerId) {
      throw new Error("Could not resolve dealer for this sourcing case")
    }

    await supabase
      .from("inventory_case_conversions")
      .update({ matched_dealer_id: resolvedDealerId })
      .eq("id", conversionId)

    // -------------------------------------------------------------------
    // 6. Check for existing SelectedDeal (may have been created by
    //    completeDealerInvite). If so, reuse it.
    // -------------------------------------------------------------------
    let selectedDealId: string

    const existingDeal = await prisma.selectedDeal.findFirst({
      where: { sourcedOfferId: selectedOffer.id },
      select: { id: true },
    })

    if (existingDeal) {
      selectedDealId = existingDeal.id
    } else {
      // -------------------------------------------------------------------
      // 7. Create SelectedDeal (DEAL_CREATED)
      // -------------------------------------------------------------------
      const cashOtd = (pricing.cashOtdCents ?? 0) / 100
      const taxAmount = (pricing.taxCents ?? 0) / 100

      // Reserve inventory item if linked
      const inventoryItemId = (selectedOffer as Record<string, unknown>)
        .inventoryItemId as string | undefined
      if (inventoryItemId) {
        const item = await prisma.inventoryItem.findUnique({
          where: { id: inventoryItemId },
          select: { id: true, status: true },
        })
        if (item && item.status === "AVAILABLE") {
          await prisma.inventoryItem.update({
            where: { id: item.id },
            data: { status: "HOLD", updatedAt: new Date() },
          })
        }
      }

      const selectedDeal = await prisma.selectedDeal.create({
        data: {
          buyerId: buyerProfile.id,
          dealerId: resolvedDealerId,
          workspaceId: sourcingCase.workspaceId ?? "",
          status: "SELECTED",
          sourcingCaseId,
          sourcedOfferId: selectedOffer.id,
          inventoryItemId: inventoryItemId ?? null,
          cashOtd,
          taxAmount,
          feesBreakdown: pricing,
          user_id: buyerProfile.userId,
        },
      })
      selectedDealId = selectedDeal.id
    }

    await updateConversionStatus(conversionId, ConversionStatus.DEAL_CREATED, {
      selected_deal_id: selectedDealId,
      deal_id: selectedDealId,
    })
    await writeConversionEvent(conversionId, "DEAL_CREATED", actorUserId, {
      selectedDealId,
      sourcingCaseId,
      sourcedOfferId: selectedOffer.id,
    })

    // -------------------------------------------------------------------
    // 8. Seed contract workflow (CONTRACTS_SEEDED)
    // -------------------------------------------------------------------
    await updateConversionStatus(
      conversionId,
      ConversionStatus.CONTRACTS_SEEDED,
    )
    await writeConversionEvent(
      conversionId,
      "CONTRACTS_SEEDED",
      actorUserId,
      { selectedDealId, note: "Contract workflow ready for document upload" },
    )

    // -------------------------------------------------------------------
    // 9. Seed payment / fee workflow (PAYMENTS_SEEDED)
    // -------------------------------------------------------------------
    const existingPayment = await prisma.serviceFeePayment.findUnique({
      where: { dealId: selectedDealId },
    })
    if (!existingPayment) {
      // conciergeFee / serviceFeeCents are both expected to be in cents
      const baseFee = (pricing.conciergeFee ?? pricing.serviceFeeCents ?? 0) / 100
      await prisma.serviceFeePayment.create({
        data: {
          dealId: selectedDealId,
          workspaceId: sourcingCase.workspaceId ?? "",
          baseFee,
          depositCredit: 0,
          finalAmount: baseFee,
          status: "PENDING",
        },
      })
    }

    await updateConversionStatus(
      conversionId,
      ConversionStatus.PAYMENTS_SEEDED,
    )
    await writeConversionEvent(
      conversionId,
      "PAYMENTS_SEEDED",
      actorUserId,
      { selectedDealId },
    )

    // -------------------------------------------------------------------
    // 10. Seed insurance workflow (INSURANCE_SEEDED)
    // -------------------------------------------------------------------
    await prisma.selectedDeal.update({
      where: { id: selectedDealId },
      data: { insurance_status: "PENDING" },
    })

    await updateConversionStatus(
      conversionId,
      ConversionStatus.INSURANCE_SEEDED,
    )
    await writeConversionEvent(
      conversionId,
      "INSURANCE_SEEDED",
      actorUserId,
      { selectedDealId },
    )

    // -------------------------------------------------------------------
    // 11. Seed pickup workflow (PICKUP_SEEDED)
    // -------------------------------------------------------------------
    await updateConversionStatus(
      conversionId,
      ConversionStatus.PICKUP_SEEDED,
    )
    await writeConversionEvent(
      conversionId,
      "PICKUP_SEEDED",
      actorUserId,
      { selectedDealId, note: "Pickup scheduling available after signing" },
    )

    // -------------------------------------------------------------------
    // 12. Complete conversion
    // -------------------------------------------------------------------
    await prisma.vehicleRequestCase.update({
      where: { id: sourcingCaseId },
      data: { status: BuyerCaseStatus.IN_PLATFORM_TRANSACTION },
    })

    await updateConversionStatus(conversionId, ConversionStatus.COMPLETED)
    await writeConversionEvent(conversionId, "CONVERSION_COMPLETED", actorUserId, {
      selectedDealId,
      sourcingCaseId,
    })

    return {
      conversionId,
      selectedDealId,
      status: ConversionStatus.COMPLETED,
    }
  } catch (error) {
    // -------------------------------------------------------------------
    // Failure: mark conversion as FAILED, log the error
    // -------------------------------------------------------------------
    const message = error instanceof Error ? error.message : String(error)

    await updateConversionStatus(conversionId, ConversionStatus.FAILED, {
      error_message: message,
    })
    await writeConversionEvent(conversionId, "CONVERSION_FAILED", actorUserId, {
      error: message,
    })

    logger.error("[CONVERSION] Sourcing case conversion failed", {
      conversionId,
      sourcingCaseId,
      error: message,
    })

    throw error
  }
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

/**
 * Get a conversion record by sourcing case ID.
 */
export async function getConversion(sourcingCaseId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("inventory_case_conversions")
    .select("*")
    .eq("sourcing_case_id", sourcingCaseId)
    .single()

  if (error && error.code !== "PGRST116") {
    throw new Error(`Failed to fetch conversion: ${error.message}`)
  }
  return data ?? null
}

/**
 * Get conversion events timeline.
 */
export async function getConversionEvents(conversionId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("deal_conversion_events")
    .select("*")
    .eq("conversion_id", conversionId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch conversion events: ${error.message}`)
  }
  return data ?? []
}
