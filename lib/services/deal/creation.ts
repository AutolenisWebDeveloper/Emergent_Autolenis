import { prisma } from "@/lib/db"
import { cancelDeal } from "./status"
import { logStatusChange } from "./status"

export async function createOrGetSelectedDealFromBestPrice(
  userId: string,
  auctionId: string,
  bestPriceOptionId: string,
  financingOptionId?: string,
) {
  // Get buyer profile
  const buyer = await prisma.buyerProfile.findUnique({
    where: { userId },
  })
  if (!buyer) {
    throw new Error("Buyer profile not found")
  }

  // Load auction and validate ownership
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
  })
  if (!auction) {
    throw new Error("Auction not found")
  }
  if (auction.buyerId !== buyer.id) {
    throw new Error("Auction does not belong to this buyer")
  }
  if (auction.status !== "CLOSED" && auction.status !== "COMPLETED") {
    throw new Error("Auction is not in a valid state for deal selection")
  }

  // Load best price option
  const bestPriceOption = await prisma.bestPriceOption.findUnique({
    where: { id: bestPriceOptionId },
  })
  if (!bestPriceOption || bestPriceOption.auctionId !== auctionId) {
    throw new Error("Invalid best price option")
  }

  // Load auction offer
  const offer = await prisma.auctionOffer.findUnique({
    where: { id: bestPriceOption.offerId },
    include: {
      financingOptions: true,
      participant: {
        include: { dealer: true },
      },
    },
  })
  if (!offer) {
    throw new Error("Offer not found")
  }
  if (offer.is_valid === false) {
    throw new Error("Selected offer is not valid")
  }

  // Check for existing deal
  const existingDeal = await prisma.selectedDeal.findFirst({
    where: {
      buyerId: buyer.id,
      auctionId,
      status: { notIn: ["CANCELLED", "COMPLETED"] },
    },
  })

  if (existingDeal) {
    // If same offer, return existing
    if (existingDeal.offerId === offer.id || existingDeal.auction_offer_id === offer.id) {
      return { deal: existingDeal, isNew: false }
    }
    // Different offer - cancel old and create new
    await cancelDeal(existingDeal.id, "Buyer selected different offer", "SYSTEM")
  }

  // Get OTD amount
  const otdCents = offer.cash_otd_cents || offer.cashOtdCents || Math.round((offer.cashOtd || 0) * 100)

  // Prepare financing option data outside transaction
  const selectedFinancingOption = financingOptionId
    ? offer.financingOptions.find((f: any) => f.id === financingOptionId)
    : offer.financingOptions[0]

  // Transaction: create deal + financing offer + decision + auction status + inventory reserve + compliance
  const result = await prisma.$transaction(async (tx: typeof prisma) => {
    // Create new deal
    const deal = await tx.selectedDeal.create({
      data: {
        buyerId: buyer.id,
        user_id: userId,
        auctionId,
        offerId: offer.id,
        auction_offer_id: offer.id,
        inventoryItemId: offer.inventoryItemId,
        dealerId: offer.participant?.dealerId || offer.dealer_id,
        workspaceId: auction.workspaceId ?? buyer.workspaceId,
        status: "PENDING_FINANCING",
        cashOtd: otdCents / 100,
        totalOtdAmountCents: otdCents,
        total_otd_amount_cents: otdCents,
        taxAmount: (offer.tax_amount_cents || offer.taxAmountCents || 0) / 100,
        feesBreakdown: (offer.fee_breakdown_json || offer.feeBreakdownJson || offer.feesBreakdown) as any,
        payment_type: "FINANCED",
        concierge_fee_method: "UNDECIDED",
        concierge_fee_status: "PENDING",
        insurance_status: "NOT_SELECTED",
      },
    })

    // Create financing offer from selected option
    if (selectedFinancingOption) {
      const downPaymentCents =
        selectedFinancingOption.down_payment_cents || Math.round((selectedFinancingOption.downPayment || 0) * 100)
      const monthlyCents =
        selectedFinancingOption.est_monthly_payment_cents ||
        Math.round((selectedFinancingOption.monthlyPayment || 0) * 100)
      const termMonths = selectedFinancingOption.term_months || selectedFinancingOption.termMonths || 60

      await tx.financingOffer.create({
        data: {
          dealId: deal.id,
          selected_deal_id: deal.id,
          workspaceId: deal.workspaceId,
          lenderName:
            selectedFinancingOption.lender_name || selectedFinancingOption.lenderName || "AutoLenis Partner Finance",
          lender_name:
            selectedFinancingOption.lender_name || selectedFinancingOption.lenderName || "AutoLenis Partner Finance",
          apr: selectedFinancingOption.apr,
          termMonths,
          downPayment: downPaymentCents / 100,
          down_payment_cents: downPaymentCents,
          monthlyPayment: monthlyCents / 100,
          est_monthly_payment_cents: monthlyCents,
          totalFinanced: (otdCents - downPaymentCents) / 100,
          is_primary_choice: true,
          source: "AUTOLENIS_PARTNER",
          approved: false,
        },
      })

      // Update deal with financing info
      await tx.selectedDeal.update({
        where: { id: deal.id },
        data: {
          apr: selectedFinancingOption.apr,
          termMonths,
          term_months: termMonths,
          baseLoanAmountCents: otdCents - downPaymentCents,
          base_loan_amount_cents: otdCents - downPaymentCents,
          primary_monthly_payment_cents: monthlyCents,
        },
      })
    }

    // Record decision
    await tx.auctionOfferDecision.create({
      data: {
        auctionId,
        offerId: offer.id,
        buyerId: buyer.id,
        decision: "ACCEPTED",
        acceptedAt: new Date(),
      },
    })

    // Update auction status
    await tx.auction.update({
      where: { id: auctionId },
      data: { status: "COMPLETED" },
    })

    // Reserve inventory
    await tx.inventoryItem.update({
      where: { id: offer.inventoryItemId },
      data: { status: "RESERVED" },
    })

    // Log compliance event
    await tx.complianceEvent.create({
      data: {
        eventType: "DEAL_SELECTED",
        type: "DEAL_CREATED",
        userId,
        relatedId: deal.id,
        details: {
          auctionId,
          offerId: offer.id,
          bestPriceOptionId,
          cashOtdCents: otdCents,
        },
      },
    })

    // Log status change (inside transaction for correctness)
    await logStatusChange(
      deal.id,
      null,
      "PENDING_FINANCING",
      userId,
      "BUYER",
      "Deal created from best price selection",
      tx,
    )

    return deal
  })

  return { deal: result, isNew: true }
}
