import { prisma } from "@/lib/db"
import { getSelectedDealForBuyer } from "./retrieval"
import { advanceDealStatusIfReady } from "./status"
import { writeEventAsync } from "@/lib/services/event-ledger"
import { PlatformEventType, EntityType, ActorType } from "@/lib/services/event-ledger"
import { createDocumentTrustRecordAsync } from "@/lib/services/trust-infrastructure"
import { TrustDocumentType, OwnerEntityType, AccessScope } from "@/lib/services/trust-infrastructure"

export async function selectInsuranceQuote(userId: string, dealId: string, quoteId: string) {
  const dealData = await getSelectedDealForBuyer(userId, dealId)
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
      status: "POLICY_SELECTED",
      carrier: quote.carrier,
      policyNumber: "POL-" + crypto.randomUUID().replace(/-/g, "").substring(0, 10).toUpperCase(),
      coverageType: quote.coverageType || "FULL",
      monthlyPremium: quote.monthlyPremium,
      effectiveDate: new Date(),
      expirationDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000),
    },
    update: {
      status: "POLICY_SELECTED",
      carrier: quote.carrier,
      coverageType: quote.coverageType || "FULL",
      monthlyPremium: quote.monthlyPremium,
      effectiveDate: new Date(),
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

  // Emit canonical platform event (non-blocking)
  writeEventAsync({
    eventType: PlatformEventType.INSURANCE_COMPLETED,
    entityType: EntityType.INSURANCE,
    entityId: policy.id,
    parentEntityId: dealId,
    actorId: userId,
    actorType: ActorType.BUYER,
    sourceModule: "deal.insurance",
    correlationId: crypto.randomUUID(),
    idempotencyKey: `insurance-selected-${dealId}-${quoteId}`,
    payload: { source: "AUTOLENIS", carrier: policy.carrier, policyNumber: policy.policyNumber },
  }).catch(() => { /* non-critical */ })

  // Try to advance status
  await advanceDealStatusIfReady(dealId, userId)

  return policy
}

export async function uploadExternalInsuranceProof(
  userId: string,
  dealId: string,
  carrierName: string,
  policyNumber: string,
  documentUrl: string,
) {
  const dealData = await getSelectedDealForBuyer(userId, dealId)
  const deal = dealData.deal

  if (deal.status === "COMPLETED" || deal.status === "CANCELLED") {
    throw new Error("Cannot modify completed or cancelled deal")
  }

  // Create or update policy
  const policy = await prisma.insurancePolicy.upsert({
    where: { dealId },
    create: {
      dealId,
      status: "EXTERNAL_UPLOADED",
      type: "EXTERNAL",
      carrier: carrierName,
      policyNumber,
      documentUrl,
      coverageType: "EXTERNAL",
      effectiveDate: new Date(),
      expirationDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000),
    },
    update: {
      status: "EXTERNAL_UPLOADED",
      carrier: carrierName,
      policyNumber,
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

  // Create trust record for the external insurance document (non-blocking)
  createDocumentTrustRecordAsync({
    ownerEntityId: dealId,
    ownerEntityType: OwnerEntityType.DEAL,
    documentType: TrustDocumentType.INSURANCE_PROOF,
    storageSource: "SUPABASE_STORAGE",
    storageReference: documentUrl,
    uploaderId: userId,
    fileHash: `ext-ins-${dealId}-${Date.now()}`,
    accessScope: AccessScope.DEAL_PARTIES,
  }).catch(() => { /* non-critical */ })

  // Emit canonical platform event (non-blocking)
  writeEventAsync({
    eventType: PlatformEventType.INSURANCE_COMPLETED,
    entityType: EntityType.INSURANCE,
    entityId: policy.id,
    parentEntityId: dealId,
    actorId: userId,
    actorType: ActorType.BUYER,
    sourceModule: "deal.insurance",
    correlationId: crypto.randomUUID(),
    idempotencyKey: `insurance-external-${dealId}`,
    payload: { source: "EXTERNAL", carrierName, policyNumber, documentUrl },
  }).catch(() => { /* non-critical */ })

  // Try to advance status
  await advanceDealStatusIfReady(dealId, userId)

  return policy
}
