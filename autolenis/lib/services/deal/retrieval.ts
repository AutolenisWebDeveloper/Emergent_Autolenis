import { prisma } from "@/lib/db"
import { PaymentService } from "@/lib/services/payment.service"
import { dealContextService } from "@/lib/services/deal-context.service"
import { normalizeDealStatus } from "./types"
import { buildStatusTimeline } from "./status"

export async function getSelectedDealForBuyer(userId: string, dealId: string) {
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

  // Get deposit payment if exists (accept both canonical "PAID" and "SUCCEEDED")
  const depositPayment = await prisma.depositPayment.findFirst({
    where: { buyerId: buyer.id, status: { in: ["PAID", "SUCCEEDED"] } },
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
    statusTimeline: buildStatusTimeline(deal),
  }
}

export async function getDealForDealer(dealerId: string, dealId: string) {
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

export async function getDealForAdmin(dealId: string) {
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
