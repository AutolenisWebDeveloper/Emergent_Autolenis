import { prisma } from "@/lib/prisma"
import { createHash } from "crypto"

/**
 * Dealer Quick Offer Service
 * Handle quick-offer submissions from non-network dealers via invite tokens.
 */

export async function getOfferContext(token: string) {
  if (!token) throw new Error("token is required")

  const tokenHash = createHash("sha256").update(token).digest("hex")

  const invite = await prisma.dealerIntelligenceInvite.findUnique({
    where: { tokenHash },
  })
  if (!invite) throw new Error("Invalid token")
  if (invite.tokenExpiresAt < new Date()) throw new Error("Token has expired")
  if (invite.status === "expired") throw new Error("Token has expired")

  // Build anonymous buyer-readiness context (no PII)
  let vehicleSpecs: unknown = null
  if (invite.buyerRequestId) {
    const items = await prisma.vehicleRequestItem.findMany({
      where: { caseId: invite.buyerRequestId },
      select: {
        yearMin: true,
        yearMax: true,
        make: true,
        model: true,
        trim: true,
        budgetTargetCents: true,
        mileageMax: true,
      },
    })
    vehicleSpecs = items
  }

  return {
    inviteId: invite.id,
    dealerName: invite.dealerName,
    vehicleSpecs,
    expiresAt: invite.tokenExpiresAt,
  }
}

export async function submitOffer(
  token: string,
  data: {
    vin?: string
    year?: number
    make?: string
    model?: string
    trim?: string
    mileage?: number
    priceCents?: number
    conditionNotes?: string
    availableDate?: string
    notes?: string
  }
): Promise<unknown> {
  if (!token) throw new Error("token is required")

  const tokenHash = createHash("sha256").update(token).digest("hex")

  const invite = await prisma.dealerIntelligenceInvite.findUnique({
    where: { tokenHash },
  })
  if (!invite) throw new Error("Invalid token")
  if (invite.tokenExpiresAt < new Date()) throw new Error("Token has expired")
  if (invite.status === "expired") throw new Error("Token has expired")
  if (invite.respondedAt) throw new Error("This invite has already been responded to")

  const offer = await prisma.dealerQuickOffer.create({
    data: {
      inviteId: invite.id,
      prospectId: invite.prospectId ?? null,
      vin: data.vin ?? null,
      year: data.year ?? null,
      make: data.make ?? null,
      model: data.model ?? null,
      trim: data.trim ?? null,
      mileage: data.mileage ?? null,
      priceCents: data.priceCents ?? null,
      conditionNotes: data.conditionNotes ?? null,
      availableDate: data.availableDate ? new Date(data.availableDate) : null,
      notes: data.notes ?? null,
      status: "SUBMITTED" as never,
    },
  })

  // Mark invite as responded
  await prisma.dealerIntelligenceInvite.update({
    where: { id: invite.id },
    data: { respondedAt: new Date(), status: "responded" },
  })

  // Update prospect status if applicable
  if (invite.prospectId) {
    const prospect = await prisma.dealerProspect.findUnique({
      where: { id: invite.prospectId },
      select: { status: true },
    })
    if (prospect && (prospect.status === "DISCOVERED" || prospect.status === "CONTACTED")) {
      await prisma.dealerProspect.update({
        where: { id: invite.prospectId },
        data: { status: "RESPONDED" as never },
      })
    }
  }

  return offer
}

export async function getOfferById(offerId: string) {
  if (!offerId) throw new Error("offerId is required")

  const offer = await prisma.dealerQuickOffer.findUnique({
    where: { id: offerId },
    include: {
      invite: { select: { id: true, dealerName: true, dealerEmail: true, buyerRequestId: true } },
      prospect: { select: { id: true, businessName: true } },
    },
  })
  if (!offer) throw new Error(`Quick offer not found: ${offerId}`)
  return offer
}

export async function reviewOffer(
  offerId: string,
  status: "ACCEPTED" | "REJECTED",
  reviewedBy: string
) {
  if (!offerId) throw new Error("offerId is required")
  if (!status) throw new Error("status is required")
  if (!reviewedBy) throw new Error("reviewedBy is required")

  const validStatuses = ["ACCEPTED", "REJECTED"]
  if (!validStatuses.includes(status)) {
    throw new Error(`status must be one of: ${validStatuses.join(", ")}`)
  }

  const offer = await prisma.dealerQuickOffer.findUnique({
    where: { id: offerId },
  })
  if (!offer) throw new Error(`Quick offer not found: ${offerId}`)
  if (String(offer.status) !== "SUBMITTED" && String(offer.status) !== "PENDING") {
    throw new Error(`Cannot review offer in status: ${String(offer.status)}`)
  }

  return prisma.dealerQuickOffer.update({
    where: { id: offerId },
    data: {
      status: status as never,
      reviewedBy,
      reviewedAt: new Date(),
    },
  })
}
