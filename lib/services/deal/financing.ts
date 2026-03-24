import { prisma } from "@/lib/db"
import { PaymentService } from "@/lib/services/payment.service"
import type { PaymentType } from "./types"
import { getSelectedDealForBuyer } from "./retrieval"
import { advanceDealStatusIfReady, logStatusChange } from "./status"

export async function updateFinancingChoice(
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

  let updateData: any = { payment_type: paymentType }

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
    await logStatusChange(
      dealId,
      previousStatus,
      updateData.status,
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

  return getSelectedDealForBuyer(userId, dealId)
}

export async function payConciergeFeeByCard(userId: string, dealId: string, _paymentMethodId?: string) {
  const dealData = await getSelectedDealForBuyer(userId, dealId)
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

export async function includeConciergeFeeInLoan(
  userId: string,
  dealId: string,
  confirm: boolean,
  ipAddress: string,
  userAgent: string,
) {
  const dealData = await getSelectedDealForBuyer(userId, dealId)
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
  await advanceDealStatusIfReady(dealId, userId)

  return result
}
