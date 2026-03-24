import { prisma } from "@/lib/db"

// ---------------------------------------------------------------------------
// Deal Context Resolver
//
// Normalizes deal data regardless of source (AUCTION or SOURCED).
// Downstream pipeline screens/APIs use this instead of assuming
// auctionId/offerId/inventoryItemId are non-null.
// ---------------------------------------------------------------------------

export type DealSource = "AUCTION" | "SOURCED"

export interface DealVehicle {
  vin: string | null
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
  mileage: number | null
  condition: string | null
}

export interface DealPricing {
  cashOtdCents: number
  taxesCents: number
  feesJson: Record<string, unknown>
  monthlyCents: number | null
  apr: number | null
  termMonths: number | null
}

export interface DealDealer {
  id: string
  businessName: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  email: string | null
}

export interface DealContext {
  dealId: string
  workspaceId: string | null
  buyerProfileId: string
  dealerId: string
  status: string
  source: DealSource
  vehicle: DealVehicle
  pricing: DealPricing
  dealer: DealDealer
  dealerName: string | null // convenience alias for dealer.businessName
  references: {
    auctionId: string | null
    offerId: string | null
    inventoryItemId: string | null
    sourcingCaseId: string | null
    sourcedOfferId: string | null
  }
  createdAt: Date
  updatedAt: Date
}

class DealContextService {
  /**
   * Resolve a normalized DealContext for a buyer-owned deal.
   * Works for both AUCTION and SOURCED deals.
   */
  async resolveDealContextForBuyer(
    buyerProfileId: string,
    dealId: string,
  ): Promise<DealContext | null> {
    const deal = await prisma.selectedDeal.findFirst({
      where: { id: dealId, buyerId: buyerProfileId },
    })
    if (!deal) return null
    return this.buildContext(deal)
  }

  /**
   * Resolve a normalized DealContext for a dealer-owned deal.
   * Works for both AUCTION and SOURCED deals.
   */
  async resolveDealContextForDealer(
    dealerId: string,
    dealId: string,
  ): Promise<DealContext | null> {
    const deal = await prisma.selectedDeal.findFirst({
      where: { id: dealId, dealerId },
    })
    if (!deal) return null
    return this.buildContext(deal)
  }

  /**
   * Build a normalized DealContext from a SelectedDeal record.
   */
  private async buildContext(deal: {
    id: string
    workspaceId: string | null
    buyerId: string
    dealerId: string
    status: string
    auctionId: string | null
    offerId: string | null
    inventoryItemId: string | null
    sourcingCaseId: string | null
    sourcedOfferId: string | null
    cashOtd: number
    taxAmount: number
    feesBreakdown: unknown
    createdAt: Date
    updatedAt: Date
  }): Promise<DealContext> {
    const source: DealSource = deal.sourcedOfferId ? "SOURCED" : "AUCTION"

    let vehicle: DealVehicle = {
      vin: null,
      year: null,
      make: null,
      model: null,
      trim: null,
      mileage: null,
      condition: null,
    }
    let dealerName: string | null = null
    let paymentTerms: { monthlyCents: number | null; apr: number | null; termMonths: number | null } = {
      monthlyCents: null,
      apr: null,
      termMonths: null,
    }

    if (source === "SOURCED" && deal.sourcedOfferId) {
      // Hydrate from SourcedOffer — no Auction/InventoryItem tables touched
      const offer = await prisma.sourcedOffer.findUnique({
        where: { id: deal.sourcedOfferId },
      })
      if (offer) {
        vehicle = {
          vin: offer.vin,
          year: offer.year,
          make: offer.make,
          model: offer.modelName,
          trim: offer.trim,
          mileage: offer.mileage,
          condition: offer.condition,
        }
        dealerName = offer.sourceDealerName
        const terms = (offer.paymentTermsJson as Record<string, number> | null) ?? {}
        paymentTerms = {
          monthlyCents: terms.monthlyCents ?? null,
          apr: terms.apr ?? null,
          termMonths: terms.termMonths ?? null,
        }
      }
    } else if (deal.offerId) {
      // Hydrate from AuctionOffer + InventoryItem (existing auction path)
      const auctionOffer = await prisma.auctionOffer.findUnique({
        where: { id: deal.offerId },
        include: {
          dealer: true,
          inventoryItem: true,
        },
      })
      if (auctionOffer) {
        dealerName = auctionOffer.dealer?.businessName ?? null
        const inv = auctionOffer.inventoryItem
        if (inv) {
          vehicle = {
            vin: inv.vin ?? null,
            year: inv.year ?? null,
            make: inv.make ?? null,
            model: inv.model ?? null,
            trim: inv.trim ?? null,
            mileage: inv.mileage ?? null,
            condition: (inv as any).condition ?? null,
          }
        }
      }
    }

    // Always load the dealer record for complete dealer info
    const dealerRecord = await prisma.dealer.findUnique({ where: { id: deal.dealerId } })
    if (!dealerName) {
      dealerName = dealerRecord?.businessName ?? null
    }

    const dealerInfo: DealDealer = {
      id: deal.dealerId,
      businessName: dealerName,
      address: (dealerRecord as any)?.address ?? null,
      city: (dealerRecord as any)?.city ?? null,
      state: (dealerRecord as any)?.state ?? null,
      zip: (dealerRecord as any)?.zip ?? null,
      phone: (dealerRecord as any)?.phone ?? null,
      email: (dealerRecord as any)?.email ?? null,
    }

    const pricing: DealPricing = {
      cashOtdCents: Math.round(deal.cashOtd * 100),
      taxesCents: Math.round(deal.taxAmount * 100),
      feesJson: (deal.feesBreakdown as Record<string, unknown>) ?? {},
      ...paymentTerms,
    }

    return {
      dealId: deal.id,
      workspaceId: deal.workspaceId,
      buyerProfileId: deal.buyerId,
      dealerId: deal.dealerId,
      status: deal.status,
      source,
      vehicle,
      pricing,
      dealer: dealerInfo,
      dealerName,
      references: {
        auctionId: deal.auctionId,
        offerId: deal.offerId,
        inventoryItemId: deal.inventoryItemId,
        sourcingCaseId: deal.sourcingCaseId,
        sourcedOfferId: deal.sourcedOfferId,
      },
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
    }
  }
}

export const dealContextService = new DealContextService()
