import { prisma } from "@/lib/prisma"

/**
 * Dealer Onboarding Conversion Service
 * Track dealer onboarding from prospect to full partner.
 */

const DEFAULT_PAGE = 1
const DEFAULT_PER_PAGE = 20

export async function startConversion(
  prospectId: string,
  quickOfferId?: string
): Promise<unknown> {
  if (!prospectId) throw new Error("prospectId is required")

  const prospect = await prisma.dealerProspect.findUnique({
    where: { id: prospectId },
    select: { id: true, status: true },
  })
  if (!prospect) throw new Error(`Prospect not found: ${prospectId}`)

  // Update prospect status to ONBOARDING
  if (prospect.status !== "ONBOARDING" && prospect.status !== "CONVERTED") {
    await prisma.dealerProspect.update({
      where: { id: prospectId },
      data: { status: "ONBOARDING" as never },
    })
  }

  const conversion = await prisma.dealerOnboardingConversion.create({
    data: {
      prospectId,
      quickOfferId: quickOfferId ?? null,
      status: "pending",
      startedAt: new Date(),
    },
  })

  await prisma.dealerLifecycleEvent.create({
    data: {
      prospectId,
      eventType: "ONBOARDING_STARTED",
      fromStatus: String(prospect.status),
      toStatus: "ONBOARDING",
    },
  })

  return conversion
}

export async function getConversionStatus(prospectId: string) {
  if (!prospectId) throw new Error("prospectId is required")

  const conversion = await prisma.dealerOnboardingConversion.findFirst({
    where: { prospectId },
    orderBy: { startedAt: "desc" },
    include: {
      prospect: { select: { id: true, businessName: true, status: true } },
    },
  })
  if (!conversion) throw new Error(`No conversion found for prospect: ${prospectId}`)

  return conversion
}

export async function uploadDocs(conversionId: string) {
  if (!conversionId) throw new Error("conversionId is required")

  const conversion = await prisma.dealerOnboardingConversion.findUnique({
    where: { id: conversionId },
  })
  if (!conversion) throw new Error(`Conversion not found: ${conversionId}`)

  return prisma.dealerOnboardingConversion.update({
    where: { id: conversionId },
    data: { businessDocsUploaded: true, status: "docs_uploaded" },
  })
}

export async function acceptAgreement(conversionId: string) {
  if (!conversionId) throw new Error("conversionId is required")

  const conversion = await prisma.dealerOnboardingConversion.findUnique({
    where: { id: conversionId },
  })
  if (!conversion) throw new Error(`Conversion not found: ${conversionId}`)

  return prisma.dealerOnboardingConversion.update({
    where: { id: conversionId },
    data: { agreementAccepted: true, status: "agreement_accepted" },
  })
}

export async function completeOperationalSetup(conversionId: string) {
  if (!conversionId) throw new Error("conversionId is required")

  const conversion = await prisma.dealerOnboardingConversion.findUnique({
    where: { id: conversionId },
  })
  if (!conversion) throw new Error(`Conversion not found: ${conversionId}`)

  return prisma.dealerOnboardingConversion.update({
    where: { id: conversionId },
    data: { operationalSetup: true, status: "operational_setup_complete" },
  })
}

export async function completeConversion(conversionId: string, dealerId: string) {
  if (!conversionId) throw new Error("conversionId is required")
  if (!dealerId) throw new Error("dealerId is required")

  const conversion = await prisma.dealerOnboardingConversion.findUnique({
    where: { id: conversionId },
    select: { id: true, prospectId: true },
  })
  if (!conversion) throw new Error(`Conversion not found: ${conversionId}`)

  const [updated] = await Promise.all([
    prisma.dealerOnboardingConversion.update({
      where: { id: conversionId },
      data: {
        dealerId,
        status: "completed",
        completedAt: new Date(),
      },
    }),
    prisma.dealerProspect.update({
      where: { id: conversion.prospectId },
      data: {
        status: "CONVERTED" as never,
        convertedDealerId: dealerId,
      },
    }),
    prisma.dealerLifecycleEvent.create({
      data: {
        prospectId: conversion.prospectId,
        dealerId,
        eventType: "CONVERTED",
        fromStatus: "ONBOARDING",
        toStatus: "CONVERTED",
      },
    }),
  ])

  return updated
}

export async function getConversions(filters: {
  status?: string
  page?: number
  perPage?: number
}): Promise<{ conversions: unknown[]; total: number; page: number; perPage: number }> {
  const page = Math.max(1, filters.page ?? DEFAULT_PAGE)
  const perPage = Math.min(100, Math.max(1, filters.perPage ?? DEFAULT_PER_PAGE))

  const where: Record<string, unknown> = {}
  if (filters.status) where.status = filters.status

  const [conversions, total] = await Promise.all([
    prisma.dealerOnboardingConversion.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        prospect: { select: { id: true, businessName: true, status: true } },
      },
    }),
    prisma.dealerOnboardingConversion.count({ where }),
  ])

  return { conversions, total, page, perPage }
}
