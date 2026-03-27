import { prisma } from "@/lib/db"
import { PaymentService } from "@/lib/services/payment.service"
import { dealContextService } from "@/lib/services/deal-context.service"
import type { DealInsuranceReadiness } from "@/lib/types"
import { InventoryStatus } from "@/lib/constants/statuses"
import { logger } from "@/lib/logger"

// ─── Lender References Note ──────────────────────────────────────────────
// "lender_name" / "lenderName" in deal creation and financing logic refers
// to the financing partner name submitted by the DEALER in their offer.
// AutoLenis does not have formal lender partners or route buyer data to
// lenders. The "lender_name" is dealer-sourced label data only.
// ─────────────────────────────────────────────────────────────────────────

// Canonical DealStatus values matching the Prisma schema enum.
// Defined here to avoid pnpm module-resolution issues with @prisma/client enum re-exports.
export const DealStatus = {
  SELECTED: "SELECTED",
  FINANCING_PENDING: "FINANCING_PENDING",
  FINANCING_APPROVED: "FINANCING_APPROVED",
  FEE_PENDING: "FEE_PENDING",
  FEE_PAID: "FEE_PAID",
  INSURANCE_PENDING: "INSURANCE_PENDING",
  INSURANCE_COMPLETE: "INSURANCE_COMPLETE",
  CONTRACT_PENDING: "CONTRACT_PENDING",
  CONTRACT_REVIEW: "CONTRACT_REVIEW",
  CONTRACT_APPROVED: "CONTRACT_APPROVED",
  SIGNING_PENDING: "SIGNING_PENDING",
  SIGNED: "SIGNED",
  PICKUP_SCHEDULED: "PICKUP_SCHEDULED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const

export type DealStatus = (typeof DealStatus)[keyof typeof DealStatus]

export type PaymentType = "CASH" | "FINANCED" | "EXTERNAL_PREAPPROVAL"
export type ConciergeFeeMethod = "CARD_DIRECT" | "LENDER_DIRECT" | "UNDECIDED"
export type ConciergeFeeStatus = "NOT_APPLICABLE" | "PENDING" | "PAID" | "INCLUDED_IN_LOAN" | "REFUNDED"

// Normalize legacy status values to Prisma DealStatus
const LEGACY_STATUS_MAP: Record<string, DealStatus> = {
  PENDING_FINANCING: "FINANCING_PENDING",
  FINANCING_CHOSEN: "FINANCING_APPROVED",
  INSURANCE_READY: "INSURANCE_PENDING",
  CONTRACT_PASSED: "CONTRACT_APPROVED",
}

export function normalizeDealStatus(s: unknown): DealStatus | null {
  if (typeof s !== "string") return null
  // Already a valid Prisma value
  if (Object.values(DealStatus).includes(s as DealStatus)) return s as DealStatus
  // Map known legacy values
  return LEGACY_STATUS_MAP[s] ?? null
}

// Valid status transitions (Prisma DealStatus values only)
const VALID_TRANSITIONS: Partial<Record<DealStatus, DealStatus[]>> = {
  SELECTED: ["FINANCING_PENDING", "CANCELLED"],
  FINANCING_PENDING: ["FINANCING_APPROVED", "CANCELLED"],
  FINANCING_APPROVED: ["FEE_PENDING", "FEE_PAID", "INSURANCE_PENDING", "INSURANCE_COMPLETE", "CONTRACT_PENDING", "CANCELLED"],
  FEE_PENDING: ["FEE_PAID", "CANCELLED"],
  FEE_PAID: ["INSURANCE_PENDING", "INSURANCE_COMPLETE", "CONTRACT_PENDING", "CANCELLED"],
  INSURANCE_PENDING: ["INSURANCE_COMPLETE", "CONTRACT_PENDING", "CANCELLED"],
  INSURANCE_COMPLETE: ["CONTRACT_PENDING", "CANCELLED"],
  CONTRACT_PENDING: ["CONTRACT_REVIEW", "CONTRACT_APPROVED", "CANCELLED"],
  CONTRACT_REVIEW: ["CONTRACT_APPROVED", "CANCELLED"],
  CONTRACT_APPROVED: ["SIGNING_PENDING", "SIGNED", "CANCELLED"],
  SIGNING_PENDING: ["SIGNED", "CANCELLED"],
  SIGNED: ["PICKUP_SCHEDULED", "CANCELLED"],
  PICKUP_SCHEDULED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
}

export class DealService {
  // Create or get selected deal from best price option
  static async createOrGetSelectedDealFromBestPrice(
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
      await this.cancelDeal(existingDeal.id, "Buyer selected different offer", "SYSTEM")
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
          feesBreakdown: (offer.fee_breakdown_json || offer.feeBreakdownJson || offer.feesBreakdown) as object,
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
      await this.logStatusChange(
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

  // Get deal with full details for buyer
  static async getSelectedDealForBuyer(userId: string, dealId: string) {
    const buyer = await prisma.buyerProfile.findUnique({
      where: { userId },
    })
    if (!buyer) {
      throw new Error("Buyer profile not found")
    }

    const deal = await prisma.selectedDeal.findUnique({
      where: { id: dealId },
      include: {
        inventoryItem: {
          include: {
            dealer: true,
          },
        },
        dealer: true,
        buyer: {
          include: { user: true },
        },
        auctionOffer: {
          include: {
            financingOptions: true,
          },
        },
        financingOffers: {
          orderBy: { createdAt: "desc" },
        },
        insurancePolicy: true,
        serviceFeePayment: true,
        contractDocuments: true,
        esignEnvelope: true,
        pickupAppointment: true,
      },
    })

    if (!deal) {
      throw new Error("Deal not found")
    }
    if (deal.buyerId !== buyer.id && deal.user_id !== userId) {
      throw new Error("Deal does not belong to this buyer")
    }

    // Get concierge fee info
    const feeOptions = await PaymentService.getFeeOptions(dealId)

    // Get external pre-approval submission (canonical EPAS) for this buyer.
    // LEGACY NOTE: ExternalPreApproval reads have been replaced by
    // ExternalPreApprovalSubmission — the canonical outside/manual preapproval table.
    const approvedSubmission = await prisma.externalPreApprovalSubmission.findFirst({
      where: { buyerId: deal.buyerId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
    })

    // Get fee disclosure if exists
    const feeDisclosure = await prisma.feeFinancingDisclosure.findFirst({
      where: { selected_deal_id: dealId },
    })

    // Get deposit payment if exists
    const depositPayment = await prisma.depositPayment.findFirst({
      where: { buyerId: buyer.id, status: "PAID" },
      orderBy: { createdAt: "desc" },
    })

    // For sourced deals, enrich with DealContext so UI has vehicle/dealer/pricing
    let sourcedDealContext = null
    if (deal.sourcedOfferId && !deal.inventoryItem) {
      const ctx = await dealContextService.resolveDealContextForBuyer(buyer.id, dealId)
      if (ctx) {
        sourcedDealContext = {
          source: ctx.source,
          vehicle: ctx.vehicle,
          dealer: ctx.dealer,
          dealerName: ctx.dealerName,
          pricing: ctx.pricing,
        }
      }
    }

    return {
      deal: sourcedDealContext ? { ...deal, sourcedDealContext } : deal,
      feeOptions,
      externalPreApproval: approvedSubmission,
      feeDisclosure,
      depositPayment,
      statusTimeline: this.buildStatusTimeline(deal),
    }
  }

  // Update financing choice
  static async updateFinancingChoice(
    userId: string,
    dealId: string,
    payload: {
      paymentType: PaymentType
      primaryFinancingOfferId?: string
      externalPreApproval?: {
        lenderName: string
        approvedAmountCents: number
        apr: number
        termMonths: number
        documentUrl: string
      }
    },
  ) {
    const buyer = await prisma.buyerProfile.findUnique({
      where: { userId },
    })
    if (!buyer) {
      throw new Error("Buyer profile not found")
    }

    const deal = await prisma.selectedDeal.findUnique({
      where: { id: dealId },
      include: { financingOffers: true },
    })

    if (!deal) {
      throw new Error("Deal not found")
    }
    if (deal.buyerId !== buyer.id && deal.user_id !== userId) {
      throw new Error("Deal does not belong to this buyer")
    }
    if (deal.status === "COMPLETED" || deal.status === "CANCELLED") {
      throw new Error("Cannot modify completed or cancelled deal")
    }

    const { paymentType, primaryFinancingOfferId, externalPreApproval } = payload

    let updateData: Record<string, unknown> = { payment_type: paymentType }

    switch (paymentType) {
      case "CASH":
        updateData = {
          ...updateData,
          base_loan_amount_cents: null,
          baseLoanAmountCents: null,
          apr: null,
          termMonths: null,
          term_months: null,
          primary_monthly_payment_cents: null,
        }
        // Clear primary choice on all financing offers
        await prisma.financingOffer.updateMany({
          where: { OR: [{ dealId }, { selected_deal_id: dealId }] },
          data: { is_primary_choice: false },
        })
        break

      case "FINANCED":
        if (!primaryFinancingOfferId) {
          throw new Error("Primary financing offer ID required for financed payment type")
        }
        const financingOffer = deal.financingOffers.find((f: any) => f.id === primaryFinancingOfferId)
        if (!financingOffer) {
          throw new Error("Financing offer not found")
        }

        const otdCents =
          deal.total_otd_amount_cents || deal.totalOtdAmountCents || Math.round((deal.cashOtd || 0) * 100)
        const downPaymentCents =
          financingOffer.down_payment_cents || Math.round((financingOffer.downPayment || 0) * 100)
        const monthlyCents =
          financingOffer.est_monthly_payment_cents || Math.round((financingOffer.monthlyPayment || 0) * 100)
        const termMonths = financingOffer.termMonths || 60

        updateData = {
          ...updateData,
          base_loan_amount_cents: otdCents - downPaymentCents,
          baseLoanAmountCents: otdCents - downPaymentCents,
          apr: financingOffer.apr,
          termMonths,
          term_months: termMonths,
          primary_monthly_payment_cents: monthlyCents,
        }

        // Update primary choice
        await prisma.financingOffer.updateMany({
          where: { OR: [{ dealId }, { selected_deal_id: dealId }] },
          data: { is_primary_choice: false },
        })
        await prisma.financingOffer.update({
          where: { id: primaryFinancingOfferId },
          data: { is_primary_choice: true },
        })
        break

      case "EXTERNAL_PREAPPROVAL":
        if (!externalPreApproval) {
          throw new Error("External pre-approval details required")
        }

        // LEGACY REMOVED: ExternalPreApproval writes are no longer performed here.
        // The canonical write path is ExternalPreApprovalSubmission via
        // POST /api/buyer/prequal/external + admin review workflow.
        // Deal financing only records the financial parameters on the SelectedDeal.

        // Estimate monthly payment
        const monthlyRate = externalPreApproval.apr / 12 / 100
        const principal = externalPreApproval.approvedAmountCents / 100
        const terms = externalPreApproval.termMonths
        const estimatedMonthly =
          (principal * monthlyRate * Math.pow(1 + monthlyRate, terms)) / (Math.pow(1 + monthlyRate, terms) - 1)

        updateData = {
          ...updateData,
          base_loan_amount_cents: externalPreApproval.approvedAmountCents,
          baseLoanAmountCents: externalPreApproval.approvedAmountCents,
          apr: externalPreApproval.apr,
          termMonths: terms,
          term_months: terms,
          primary_monthly_payment_cents: Math.round(estimatedMonthly * 100),
        }
        break
    }

    // Check if we can advance status
    const previousStatus = deal.status
    if (previousStatus === "PENDING_FINANCING") {
      updateData.status = "FINANCING_APPROVED"
    }

    await prisma.selectedDeal.update({
      where: { id: dealId },
      data: updateData,
    })

    // Log status change if applicable
    if (updateData.status && updateData.status !== previousStatus) {
      await this.logStatusChange(
        dealId,
        previousStatus,
        updateData.status as string,
        userId,
        "BUYER",
        "Financing choice updated",
      )
    }

    // Log compliance event
    await prisma.complianceEvent.create({
      data: {
        eventType: "FINANCING_UPDATED",
        type: "FINANCING_CHOICE",
        userId,
        relatedId: dealId,
        details: {
          paymentType,
          apr: updateData.apr,
          termMonths: updateData.termMonths,
        },
      },
    })

    return this.getSelectedDealForBuyer(userId, dealId)
  }

  // Update concierge fee choice - Pay by Card
  static async payConciergeFeeByCard(userId: string, dealId: string, _paymentMethodId?: string) {
    const dealData = await this.getSelectedDealForBuyer(userId, dealId)
    const deal = dealData.deal

    if (deal.status === "COMPLETED" || deal.status === "CANCELLED") {
      throw new Error("Cannot modify completed or cancelled deal")
    }

    // Create service fee payment through PaymentService
    const result = await PaymentService.createServiceFeePayment(dealId, userId)

    // Update deal
    await prisma.selectedDeal.update({
      where: { id: dealId },
      data: {
        concierge_fee_method: "CARD_DIRECT",
        concierge_fee_status: "PENDING",
      },
    })

    return result
  }

  // Update concierge fee choice - Include in Loan
  static async includeConciergeFeeInLoan(
    userId: string,
    dealId: string,
    confirm: boolean,
    ipAddress: string,
    userAgent: string,
  ) {
    const dealData = await this.getSelectedDealForBuyer(userId, dealId)
    const deal = dealData.deal

    if (deal.status === "COMPLETED" || deal.status === "CANCELLED") {
      throw new Error("Cannot modify completed or cancelled deal")
    }

    const paymentType = deal.payment_type
    if (paymentType !== "FINANCED" && paymentType !== "EXTERNAL_PREAPPROVAL") {
      throw new Error("Cannot include fee in loan for cash payment")
    }

    if (!confirm) {
      throw new Error("Confirmation required to include fee in loan")
    }

    // Use PaymentService to handle loan inclusion
    const result = await PaymentService.agreeLoanInclusion(dealId, userId, ipAddress, userAgent)

    // Update deal
    await prisma.selectedDeal.update({
      where: { id: dealId },
      data: {
        concierge_fee_method: "LENDER_DIRECT",
        concierge_fee_status: "INCLUDED_IN_LOAN",
      },
    })

    // Try to advance status
    await this.advanceDealStatusIfReady(dealId, userId)

    return result
  }

  // Update insurance choice - Select AutoLenis quote
  static async selectInsuranceQuote(userId: string, dealId: string, quoteId: string) {
    const dealData = await this.getSelectedDealForBuyer(userId, dealId)
    const deal = dealData.deal

    if (deal.status === "COMPLETED" || deal.status === "CANCELLED") {
      throw new Error("Cannot modify completed or cancelled deal")
    }

    // Verify quote belongs to this deal's buyer
    const quote = await prisma.insuranceQuote.findUnique({
      where: { id: quoteId },
    })
    if (!quote || quote.buyerId !== deal.buyerId) {
      throw new Error("Insurance quote not found or does not belong to this buyer")
    }

    // Create or update policy
    const policy = await prisma.insurancePolicy.upsert({
      where: { dealId },
      create: {
        dealId,
        userId: deal.user_id || deal.buyerId,
        user_id: deal.user_id || deal.buyerId,
        workspaceId: deal.workspaceId,
        status: "POLICY_SELECTED",
        carrier: quote.carrier || quote.carrier_name,
        policyNumber: "POL-" + crypto.randomUUID().replace(/-/g, "").substring(0, 10).toUpperCase(),
        coverageType: quote.coverageType || "FULL",
        monthlyPremium: quote.monthlyPremium || (quote.premium_monthly_cents || 0) / 100,
        startDate: new Date(),
        start_date: new Date(),
        endDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        status: "POLICY_SELECTED",
        carrier: quote.carrier || quote.carrier_name,
        coverageType: quote.coverageType || "FULL",
        monthlyPremium: quote.monthlyPremium || (quote.premium_monthly_cents || 0) / 100,
        startDate: new Date(),
        start_date: new Date(),
      },
    })

    // Update deal
    await prisma.selectedDeal.update({
      where: { id: dealId },
      data: {
        insurance_status: "SELECTED_AUTOLENIS",
      },
    })

    // Log compliance event
    await prisma.complianceEvent.create({
      data: {
        eventType: "INSURANCE_SELECTED",
        type: "INSURANCE_AUTOLENIS",
        userId,
        relatedId: dealId,
        details: {
          quoteId,
          carrier: policy.carrier,
          policyNumber: policy.policyNumber,
        },
      },
    })

    // Try to advance status
    await this.advanceDealStatusIfReady(dealId, userId)

    return policy
  }

  // Update insurance choice - Upload external proof
  static async uploadExternalInsuranceProof(
    userId: string,
    dealId: string,
    carrierName: string,
    policyNumber: string,
    documentUrl: string,
  ) {
    const dealData = await this.getSelectedDealForBuyer(userId, dealId)
    const deal = dealData.deal

    if (deal.status === "COMPLETED" || deal.status === "CANCELLED") {
      throw new Error("Cannot modify completed or cancelled deal")
    }

    // Create or update policy
    const policy = await prisma.insurancePolicy.upsert({
      where: { dealId },
      create: {
        dealId,
        userId: deal.user_id || deal.buyerId,
        user_id: deal.user_id || deal.buyerId,
        workspaceId: deal.workspaceId,
        status: "EXTERNAL_UPLOADED",
        type: "EXTERNAL",
        carrier: carrierName,
        policyNumber,
        policy_number_v2: policyNumber,
        documentUrl,
        coverageType: "EXTERNAL",
        startDate: new Date(),
        start_date: new Date(),
        endDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        status: "EXTERNAL_UPLOADED",
        carrier: carrierName,
        policyNumber,
        policy_number_v2: policyNumber,
        documentUrl,
      },
    })

    // Update deal
    await prisma.selectedDeal.update({
      where: { id: dealId },
      data: {
        insurance_status: "EXTERNAL_PROOF_UPLOADED",
      },
    })

    // Log compliance event
    await prisma.complianceEvent.create({
      data: {
        eventType: "INSURANCE_UPLOADED",
        type: "INSURANCE_EXTERNAL",
        userId,
        relatedId: dealId,
        details: {
          carrierName,
          policyNumber,
          documentUrl,
        },
      },
    })

    // Try to advance status
    await this.advanceDealStatusIfReady(dealId, userId)

    return policy
  }

  // Advance deal status if all requirements met
  static async advanceDealStatusIfReady(dealId: string, userId?: string) {
    const deal = await prisma.selectedDeal.findUnique({
      where: { id: dealId },
      include: {
        serviceFeePayment: {
          include: { disclosure: true },
        },
        insurancePolicy: true,
      },
    })

    if (!deal) return

    const currentStatus = deal.status
    let newStatus: DealStatus | null = null

    // Check advancement conditions (Prisma statuses only)
    switch (currentStatus) {
      case "FINANCING_PENDING":
        if (deal.payment_type && deal.payment_type !== "UNDECIDED") {
          newStatus = "FINANCING_APPROVED"
        }
        break

      case "FINANCING_APPROVED":
      case "FEE_PAID": {
        const feeStatus = deal.concierge_fee_status
        const insuranceStatus = deal.insurance_status as DealInsuranceReadiness | null

        // Check if fee is handled
        const feeReady = feeStatus === "PAID" || feeStatus === "INCLUDED_IN_LOAN"

        // FeeFinancingDisclosure consent gate: if a disclosure exists and
        // consent has not been given, block advancement past FEE_PAID
        if (feeReady) {
          const disclosure = deal.serviceFeePayment?.disclosure
          if (disclosure && !disclosure.consentGiven) {
            // Buyer must acknowledge fee financing disclosure before deal can advance
            break
          }
        }

        // Check if insurance is ready
        const insuranceReady =
          insuranceStatus === "SELECTED_AUTOLENIS" ||
          insuranceStatus === "EXTERNAL_PROOF_UPLOADED" ||
          insuranceStatus === "BOUND"

        if (feeReady && insuranceReady) {
          newStatus = "CONTRACT_PENDING"
        } else if (feeReady) {
          newStatus = "INSURANCE_PENDING"
        }
        break
      }

      case "INSURANCE_PENDING": {
        const insStatus = deal.insurance_status as DealInsuranceReadiness | null
        if (insStatus === "SELECTED_AUTOLENIS" || insStatus === "EXTERNAL_PROOF_UPLOADED" || insStatus === "BOUND") {
          newStatus = "CONTRACT_PENDING"
        }
        break
      }
    }

    if (newStatus && VALID_TRANSITIONS[currentStatus as DealStatus]?.includes(newStatus)) {
      // Transaction: update status + log status change
      await prisma.$transaction(async (tx: typeof prisma) => {
        await tx.selectedDeal.update({
          where: { id: dealId },
          data: {
            status: newStatus,
          },
        })

        await this.logStatusChange(
          dealId,
          currentStatus,
          newStatus,
          userId || "SYSTEM",
          "SYSTEM",
          "Auto-advanced based on requirements",
          tx,
        )
      })
    }

    return newStatus
  }

  // Cancel deal
  static async cancelDeal(dealId: string, reason: string, actorRole: string, userId?: string) {
    const deal = await prisma.selectedDeal.findUnique({
      where: { id: dealId },
    })

    if (!deal) {
      throw new Error("Deal not found")
    }

    const currentStatus = normalizeDealStatus(deal.status) ?? deal.status
    if (currentStatus === "COMPLETED") {
      throw new Error("Cannot cancel completed deal")
    }
    if (currentStatus === "CANCELLED") {
      throw new Error("Deal is already cancelled")
    }

    // Transaction: update deal + release inventory + log status change + log compliance event
    await prisma.$transaction(async (tx: typeof prisma) => {
      // Update deal
      await tx.selectedDeal.update({
        where: { id: dealId },
        data: {
          status: "CANCELLED",
          cancel_reason: reason,
        },
      })

      // Release inventory
      if (deal.inventoryItemId) {
        await tx.inventoryItem.update({
          where: { id: deal.inventoryItemId },
          data: { status: InventoryStatus.AVAILABLE },
        })
      }

      // Log status change (inside transaction for correctness)
      await this.logStatusChange(dealId, currentStatus, "CANCELLED", userId || "SYSTEM", actorRole, reason, tx)

      // Log compliance event
      await tx.complianceEvent.create({
        data: {
          eventType: "DEAL_CANCELLED",
          type: "DEAL_CANCELLATION",
          userId: userId || deal.user_id || deal.buyerId,
          relatedId: dealId,
          details: {
            reason,
            actorRole,
            previousStatus: currentStatus,
          },
        },
      })
    })

    return { success: true }
  }

  // Admin override status
  static async adminOverrideStatus(dealId: string, newStatus: DealStatus, notes: string, adminUserId: string) {
    const deal = await prisma.selectedDeal.findUnique({
      where: { id: dealId },
    })

    if (!deal) {
      throw new Error("Deal not found")
    }

    const currentStatus = normalizeDealStatus(deal.status) ?? deal.status

    // Transaction: update deal + log status change + log compliance event
    await prisma.$transaction(async (tx: typeof prisma) => {
      // Update deal
      await tx.selectedDeal.update({
        where: { id: dealId },
        data: {
          status: newStatus,
          cancel_reason: newStatus === "CANCELLED" ? notes : deal.cancel_reason,
        },
      })

      // Log status change (inside transaction for correctness)
      await this.logStatusChange(dealId, currentStatus, newStatus, adminUserId, "ADMIN", notes, tx)

      // Log compliance event
      await tx.complianceEvent.create({
        data: {
          eventType: "ADMIN_OVERRIDE",
          type: "STATUS_OVERRIDE",
          userId: adminUserId,
          relatedId: dealId,
          details: {
            previousStatus: currentStatus,
            newStatus,
            notes,
          },
        },
      })
    })

    return { success: true, previousStatus: currentStatus, newStatus }
  }

  // Get deal for dealer (read-only)
  static async getDealForDealer(dealerId: string, dealId: string) {
    const deal = await prisma.selectedDeal.findUnique({
      where: { id: dealId },
      include: {
        inventoryItem: true,
        buyer: {
          include: {
            user: {
              select: {
                firstName: true,
                first_name: true,
                lastName: true,
                last_name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        auctionOffer: {
          include: { financingOptions: true },
        },
        contractDocuments: true,
        esignEnvelope: true,
        pickupAppointment: true,
      },
    })

    if (!deal) {
      throw new Error("Deal not found")
    }
    if (deal.dealerId !== dealerId) {
      throw new Error("Deal does not belong to this dealer")
    }

    // For sourced deals, vehicle info comes from DealContext (not inventoryItem)
    let vehicleData: any = deal.inventoryItem ? {
      year: deal.inventoryItem.year,
      make: deal.inventoryItem.make,
      model: deal.inventoryItem.model,
      trim: deal.inventoryItem.trim,
      vin: deal.inventoryItem.vin,
      mileage: deal.inventoryItem.mileage,
    } : null
    if (!vehicleData && deal.sourcedOfferId) {
      const ctx = await dealContextService.resolveDealContextForDealer(dealerId, dealId)
      if (ctx?.vehicle) {
        vehicleData = {
          year: ctx.vehicle.year,
          make: ctx.vehicle.make,
          model: ctx.vehicle.model,
          trim: ctx.vehicle.trim,
          vin: ctx.vehicle.vin,
          mileage: ctx.vehicle.mileage,
          condition: ctx.vehicle.condition,
        }
      }
    }

    return {
      id: deal.id,
      status: normalizeDealStatus(deal.status) ?? deal.status,
      vehicle: vehicleData,
      otdAmountCents: deal.total_otd_amount_cents || deal.totalOtdAmountCents,
      feesBreakdown: deal.feesBreakdown,
      paymentType: deal.payment_type,
      conciergeFeeMethod: deal.concierge_fee_method,
      conciergeFeeStatus: deal.concierge_fee_status,
      insuranceStatus: deal.insurance_status,
      buyer: {
        name: `${deal.buyer?.user?.firstName || deal.buyer?.user?.first_name || ""} ${deal.buyer?.user?.lastName || deal.buyer?.user?.last_name || ""}`.trim(),
        email: deal.buyer?.user?.email,
        phone: deal.buyer?.user?.phone,
      },
      contractDocuments: deal.contractDocuments,
      esignStatus: deal.esignEnvelope?.status,
      pickupAppointment: deal.pickupAppointment,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
    }
  }

  // Get full deal for admin
  static async getDealForAdmin(dealId: string) {
    const deal = await prisma.selectedDeal.findUnique({
      where: { id: dealId },
      include: {
        inventoryItem: {
          include: {
            dealer: true,
          },
        },
        dealer: true,
        buyer: {
          include: { user: true },
        },
        auctionOffer: {
          include: { financingOptions: true },
        },
        financingOffers: true,
        insurancePolicy: true,
        serviceFeePayment: true,
        contractDocuments: true,
        esignEnvelope: true,
        pickupAppointment: true,
      },
    })

    if (!deal) {
      throw new Error("Deal not found")
    }

    // Get external pre-approval submission (canonical EPAS) for this buyer.
    // LEGACY NOTE: ExternalPreApproval reads have been replaced by
    // ExternalPreApprovalSubmission — the canonical outside/manual preapproval table.
    const approvedSubmission = await prisma.externalPreApprovalSubmission.findFirst({
      where: { buyerId: deal.buyerId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
    })

    const feeDisclosure = await prisma.feeFinancingDisclosure.findFirst({
      where: { selected_deal_id: dealId },
    })

    const statusHistory = (await prisma.$queryRaw`
      SELECT * FROM "deal_status_history" 
      WHERE "selected_deal_id" = ${dealId}
      ORDER BY "created_at" DESC
    `) as Record<string, unknown>[]

    const complianceEvents = await prisma.complianceEvent.findMany({
      where: { relatedId: dealId },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return {
      deal,
      externalPreApproval: approvedSubmission,
      feeDisclosure,
      statusHistory,
      complianceEvents,
    }
  }

  // Helper: Log status change
  private static async logStatusChange(
    dealId: string,
    previousStatus: string | null,
    newStatus: string,
    userId: string,
    role: string,
    notes?: string,
    tx?: any,
  ) {
    const client = tx || prisma
    try {
      await client.$executeRaw`
        INSERT INTO "deal_status_history" ("selected_deal_id", "previous_status", "new_status", "changed_by_user_id", "changed_by_role", "notes")
        VALUES (${dealId}, ${previousStatus}, ${newStatus}, ${userId}, ${role}, ${notes})
      `
    } catch (e) {
      // If inside a transaction, re-throw to trigger rollback
      if (tx) throw e
      logger.error("Failed to log status change:", e)
    }
  }

  // Helper: Build status timeline
  private static buildStatusTimeline(deal: any) {
    const statuses: DealStatus[] = [
      "SELECTED",
      "FINANCING_PENDING",
      "FINANCING_APPROVED",
      "FEE_PENDING",
      "FEE_PAID",
      "INSURANCE_PENDING",
      "INSURANCE_COMPLETE",
      "CONTRACT_PENDING",
      "CONTRACT_REVIEW",
      "CONTRACT_APPROVED",
      "SIGNING_PENDING",
      "SIGNED",
      "PICKUP_SCHEDULED",
      "COMPLETED",
    ]

    const currentStatus = normalizeDealStatus(deal.status) ?? deal.status
    const currentIndex = statuses.indexOf(currentStatus as DealStatus)

    return statuses.map((status, index) => ({
      status,
      label: status.replace(/_/g, " "),
      isComplete: index < currentIndex,
      isCurrent: status === currentStatus,
      isPending: index > currentIndex,
    }))
  }
}

export const dealService = new DealService()
export default dealService
