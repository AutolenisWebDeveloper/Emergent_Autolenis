import { prisma } from "@/lib/db"
import { logEvent } from "./helpers"
import { revokeIfDocsChanged } from "./manual-review"
import type { DocumentType } from "./types"

export async function uploadDocument(
  selectedDealId: string,
  dealerId: string,
  fileUrl: string,
  documentType: DocumentType,
  metaJson?: Record<string, any>,
) {
  // Resolve workspaceId from the deal
  const deal = await prisma.selectedDeal.findUnique({
    where: { id: selectedDealId },
    select: { workspaceId: true },
  })

  if (!deal) {
    throw new Error("Deal not found")
  }

  const existing = await prisma.contractDocument.findMany({
    where: { dealId: selectedDealId, documentType },
    orderBy: { version: "desc" },
  })

  const version = existing.length > 0 ? (existing[0].version || 0) + 1 : 1

  const document = await prisma.contractDocument.create({
    data: {
      dealId: selectedDealId,
      dealerId,
      documentType,
      type: documentType,
      fileUrl,
      documentUrl: fileUrl,
      file_url: fileUrl,
      metaJson: metaJson || {},
      meta_json: metaJson || {},
      version,
      workspaceId: deal.workspaceId,
    },
  })

  let scan = await prisma.contractShieldScan.findFirst({
    where: { selectedDealId },
  })

  if (!scan) {
    scan = await prisma.contractShieldScan.create({
      data: {
        selectedDealId,
        workspaceId: deal.workspaceId,
        status: "PENDING",
        issuesCount: 0,
        overallScore: 0,
      },
    })
  } else {
    scan = await prisma.contractShieldScan.update({
      where: { id: scan.id },
      data: { status: "PENDING" },
    })
  }

  await logEvent(selectedDealId, "DOC_UPLOADED", {
    documentType,
    documentId: document.id,
    version,
    dealerId,
  })

  // CMA post-approval integrity: auto-revoke if document changed after manual approval
  await revokeIfDocsChanged(selectedDealId, document.id, fileUrl, version)

  return { document, scan }
}

export async function getOverridesLedger(filters?: {
  scanId?: string
  adminId?: string
  buyerAcknowledged?: boolean
  startDate?: Date
  endDate?: Date
}) {
  return prisma.contractShieldOverride.findMany({
    where: {
      ...(filters?.scanId && { scanId: filters.scanId }),
      ...(filters?.adminId && { adminId: filters.adminId }),
      ...(filters?.buyerAcknowledged !== undefined && { buyerAcknowledged: filters.buyerAcknowledged }),
      ...(filters?.startDate && { createdAt: { gte: filters.startDate } }),
      ...(filters?.endDate && { createdAt: { lte: filters.endDate } }),
    },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      scan: {
        include: {
          selectedDeal: {
            include: {
              buyer: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
              inventoryItem: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getScanWithDetails(scanId: string) {
  return prisma.contractShieldScan.findUnique({
    where: { id: scanId },
    include: {
      fixList: true,
      selectedDeal: {
        include: {
          buyer: { include: { profile: true } },
          dealer: true,
          offer: true,
          inventoryItem: true,
        },
      },
    },
  })
}

export async function getScanByDealId(dealId: string) {
  return prisma.contractShieldScan.findFirst({
    where: { selectedDealId: dealId },
    include: { fixList: true },
  })
}

export async function getDocumentsByDealId(dealId: string) {
  return prisma.contractDocument.findMany({
    where: { dealId },
    orderBy: { createdAt: "desc" },
  })
}

export async function uploadContract(dealId: string, dealerId: string, documentUrl: string, documentType: string) {
  // Resolve workspaceId from the deal
  const deal = await prisma.selectedDeal.findUnique({
    where: { id: dealId },
    select: { workspaceId: true },
  })

  if (!deal) {
    throw new Error("Deal not found")
  }

  const doc = await prisma.contractDocument.create({
    data: {
      dealId,
      dealerId,
      documentUrl,
      documentType,
      workspaceId: deal.workspaceId,
      createdAt: new Date(),
    } as any,
  })
  return doc
}
