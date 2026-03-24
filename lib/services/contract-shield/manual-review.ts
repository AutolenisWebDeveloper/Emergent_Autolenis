/**
 * Contract Manual Review (CMA) Service
 *
 * Handles the full lifecycle of Controlled Manual Approval workflows
 * for non-dealer-correctable contract rejects.
 *
 * NOTE: This is an informational tool only. It does not provide
 * legal, tax, or financial advice.
 */
import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import { logCmaEvent } from "./helpers"
import { createHash } from "crypto"
import { writeEventAsync } from "@/lib/services/event-ledger"
import { PlatformEventType, EntityType, ActorType } from "@/lib/services/event-ledger"

// ─── Types ────────────────────────────────────────────────────────────────────

export type CmaRootCause =
  | "FALSE_POSITIVE_SCAN"
  | "INTERNAL_DATA_MISMATCH"
  | "DEPENDENCY_FAILURE"
  | "POLICY_RULES_DISCREPANCY"
  | "MISSING_INTERNAL_ATTESTATION"
  | "OTHER"

export type CmaApprovalMode =
  | "MANUAL_VALIDATED"
  | "EXCEPTION_OVERRIDE"
  | "RETURN_TO_INTERNAL_FIX"

export type CmaInternalQueue = "OPS" | "ENGINEERING" | "POLICY"

export type ManualReviewStatus =
  | "OPEN"
  | "PENDING_SECOND_APPROVAL"
  | "APPROVED"
  | "RETURNED_INTERNAL_FIX"
  | "REVOKED"

export const CMA_ROOT_CAUSE_CATEGORIES: CmaRootCause[] = [
  "FALSE_POSITIVE_SCAN",
  "INTERNAL_DATA_MISMATCH",
  "DEPENDENCY_FAILURE",
  "POLICY_RULES_DISCREPANCY",
  "MISSING_INTERNAL_ATTESTATION",
  "OTHER",
]

export const CMA_INTERNAL_QUEUES: CmaInternalQueue[] = [
  "OPS",
  "ENGINEERING",
  "POLICY",
]

export const ATTESTATION_TEXT_V1 =
  "I certify this packet meets AutoLenis contract standards and accept manual-approval accountability."

/** Configurable threshold for dual approval (in cents) */
const DUAL_APPROVAL_AMOUNT_THRESHOLD_CENTS = 7500000 // $75,000

export interface CmaChecklistPayload {
  rootCauseCategory: CmaRootCause
  rootCauseNotes?: string
  vinMatch: boolean
  buyerIdentityMatch: boolean
  otdMathValidated: boolean
  feesValidated: boolean
  termsValidated: boolean
  disclosuresPresent: boolean
  verifiedFieldsJson?: Record<string, unknown>
  evidenceAttachmentIds?: string[]
  attestationAccepted: boolean
}

export interface CmaActorContext {
  adminId: string
  adminRole: string
  ipAddress?: string
  userAgent?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeDocHash(url: string, version: number): string {
  return createHash("sha256")
    .update(`${url}:v${version}`)
    .digest("hex")
}

function validateChecklistComplete(review: {
  vinMatch: boolean
  buyerIdentityMatch: boolean
  otdMathValidated: boolean
  feesValidated: boolean
  termsValidated: boolean
  disclosuresPresent: boolean
  attestationAccepted: boolean
  rootCauseCategory: string | null
  evidenceAttachmentIds: string[]
}): string | null {
  if (!review.rootCauseCategory) return "Root cause category is required"
  if (!review.vinMatch) return "VIN match must be confirmed"
  if (!review.buyerIdentityMatch) return "Buyer identity match must be confirmed"
  if (!review.otdMathValidated) return "OTD math must be validated"
  if (!review.feesValidated) return "Fees must be validated"
  if (!review.termsValidated) return "Terms must be validated"
  if (!review.disclosuresPresent) return "Disclosures must be present"
  if (!review.attestationAccepted) return "Attestation must be accepted"
  if (review.evidenceAttachmentIds.length === 0) return "At least one evidence attachment is required"
  return null
}

/**
 * Determine whether dual approval is required for a given deal and review.
 */
async function requiresDualApproval(
  dealId: string,
  review: { rootCauseCategory: string | null },
): Promise<boolean> {
  const deal = await prisma.selectedDeal.findUnique({
    where: { id: dealId },
    include: {
      scan: {
        include: { fixList: true },
      },
    },
  })

  if (!deal) return false

  // Condition 1: deal amount exceeds threshold
  const otdCents = Math.round((deal.cashOtd || 0) * 100)
  if (otdCents > DUAL_APPROVAL_AMOUNT_THRESHOLD_CENTS) return true

  // Condition 2: any critical finding in the scan
  const hasCritical = deal.scan?.fixList?.some(
    (item: { severity: string }) => item.severity === "CRITICAL",
  )
  if (hasCritical) return true

  // Condition 3: fee policy warning overridden
  const hasFeeWarning = deal.scan?.fixList?.some(
    (item: { category: string }) =>
      item.category === "ADD_ON_REVIEW" || item.category === "FEE_REVIEW",
  )
  if (hasFeeWarning) return true

  return false
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Open a new manual review for a deal.
 * Transitions deal to CONTRACT_MANUAL_REVIEW_REQUIRED.
 */
export async function openManualReview(
  dealId: string,
  scanId: string,
  ctx: CmaActorContext,
) {
  const deal = await prisma.selectedDeal.findUnique({
    where: { id: dealId },
    include: {
      contracts: { orderBy: { version: "desc" as const }, take: 1 },
    },
  })

  if (!deal) throw new Error("Deal not found")

  // Check not already in CMA
  const existing = await prisma.contractManualReview.findFirst({
    where: {
      dealId,
      status: { in: ["OPEN", "PENDING_SECOND_APPROVAL"] },
    },
  })
  if (existing) throw new Error("Active manual review already exists for this deal")

  const contractDoc = deal.contracts[0]

  const review = await prisma.contractManualReview.create({
    data: {
      dealId,
      workspaceId: deal.workspaceId,
      contractDocumentId: contractDoc?.id,
      overriddenScanId: scanId,
      status: "OPEN",
    },
  })

  // Transition deal status
  await prisma.selectedDeal.update({
    where: { id: dealId },
    data: { status: "CONTRACT_MANUAL_REVIEW_REQUIRED" },
  })

  await logCmaEvent(dealId, "CMA_OPENED", {
    manualReviewId: review.id,
    scanId,
    previousDealStatus: deal.status,
  }, ctx)

  // Emit canonical event
  writeEventAsync({
    eventType: PlatformEventType.CMA_OPENED,
    entityType: EntityType.MANUAL_REVIEW,
    entityId: review.id,
    parentEntityId: dealId,
    actorId: ctx.adminId,
    actorType: ctx.adminRole === "SUPER_ADMIN" || ctx.adminRole === "COMPLIANCE_ADMIN" ? ActorType.ADMIN : ActorType.SYSTEM,
    sourceModule: "contract-shield.manual-review",
    correlationId: crypto.randomUUID(),
    idempotencyKey: `cma-open-${review.id}`,
    payload: { scanId, previousDealStatus: deal.status },
  }).catch(() => { /* non-critical */ })

  logger.info("CMA manual review opened", {
    manualReviewId: review.id,
    dealId,
    scanId,
  })

  return review
}

/**
 * Submit or update the CMA checklist for a manual review.
 */
export async function submitChecklist(
  manualReviewId: string,
  payload: CmaChecklistPayload,
  ctx: CmaActorContext,
) {
  const review = await prisma.contractManualReview.findUnique({
    where: { id: manualReviewId },
  })

  if (!review) throw new Error("Manual review not found")
  if (review.status !== "OPEN") {
    throw new Error(`Cannot update checklist: review is in ${review.status} state`)
  }

  const updated = await prisma.contractManualReview.update({
    where: { id: manualReviewId },
    data: {
      rootCauseCategory: payload.rootCauseCategory,
      rootCauseNotes: payload.rootCauseNotes,
      vinMatch: payload.vinMatch,
      buyerIdentityMatch: payload.buyerIdentityMatch,
      otdMathValidated: payload.otdMathValidated,
      feesValidated: payload.feesValidated,
      termsValidated: payload.termsValidated,
      disclosuresPresent: payload.disclosuresPresent,
      attestationAccepted: payload.attestationAccepted,
      attestationTextVersion: payload.attestationAccepted ? "v1" : null,
      verifiedFieldsJson: payload.verifiedFieldsJson ?? undefined,
      evidenceAttachmentIds: payload.evidenceAttachmentIds ?? [],
    },
  })

  return updated
}

/**
 * Approve via Manual Validation — scan was a false positive or internal error.
 * Status → CONTRACT_APPROVED (ready for e-sign).
 */
export async function approveManualValidated(
  manualReviewId: string,
  ctx: CmaActorContext,
) {
  const review = await prisma.contractManualReview.findUnique({
    where: { id: manualReviewId },
    include: {
      deal: {
        include: { contracts: { orderBy: { version: "desc" as const }, take: 1 } },
      },
    },
  })

  if (!review) throw new Error("Manual review not found")
  if (review.status !== "OPEN") {
    throw new Error(`Cannot approve: review is in ${review.status} state`)
  }

  // Validate checklist completeness
  const validationError = validateChecklistComplete(review)
  if (validationError) throw new Error(`Checklist incomplete: ${validationError}`)

  // Check if dual approval is required
  const needsDual = await requiresDualApproval(review.dealId, review)
  if (needsDual) {
    // Route to second approval instead of direct approval
    return requestSecondApproval(manualReviewId, ctx)
  }

  // Compute document hash for integrity tracking
  const latestDoc = review.deal.contracts[0]
  const docHash = latestDoc
    ? computeDocHash(latestDoc.documentUrl, latestDoc.version)
    : null

  // Execute approval in a transaction
  const result = await prisma.$transaction(async (tx: any) => {
    const updated = await tx.contractManualReview.update({
      where: { id: manualReviewId },
      data: {
        status: "APPROVED",
        approvalMode: "MANUAL_VALIDATED",
        approvedByAdminId: ctx.adminId,
        approvedAt: new Date(),
        approvedFromIp: ctx.ipAddress,
        approvedUserAgent: ctx.userAgent,
        documentHashAtApproval: docHash,
      },
    })

    await tx.selectedDeal.update({
      where: { id: review.dealId },
      data: { status: "CONTRACT_APPROVED" },
    })

    return updated
  })

  await logCmaEvent(review.dealId, "MANUAL_APPROVE", {
    manualReviewId,
    approvalMode: "MANUAL_VALIDATED",
    rootCauseCategory: review.rootCauseCategory,
    manualChecksCompleted: {
      vinMatch: review.vinMatch,
      buyerIdentityMatch: review.buyerIdentityMatch,
      otdMathValidated: review.otdMathValidated,
      feesValidated: review.feesValidated,
      termsValidated: review.termsValidated,
      disclosuresPresent: review.disclosuresPresent,
    },
    verifiedFieldsJson: review.verifiedFieldsJson,
    evidenceAttachmentIds: review.evidenceAttachmentIds,
    approverAdminId: ctx.adminId,
    approverRole: ctx.adminRole,
    overriddenScanId: review.overriddenScanId,
    documentHash: docHash,
  }, ctx)

  // Increment false-positive counter if scan would have failed
  if (review.rootCauseCategory === "FALSE_POSITIVE_SCAN") {
    await logCmaEvent(review.dealId, "FALSE_POSITIVE_RECORDED", {
      manualReviewId,
      rootCauseCategory: review.rootCauseCategory,
      overriddenScanId: review.overriddenScanId,
    }, ctx)
  }

  logger.info("CMA manual validation approved", {
    manualReviewId,
    dealId: review.dealId,
  })

  // Emit canonical event
  writeEventAsync({
    eventType: PlatformEventType.CMA_APPROVED,
    entityType: EntityType.MANUAL_REVIEW,
    entityId: manualReviewId,
    parentEntityId: review.dealId,
    actorId: ctx.adminId,
    actorType: ActorType.ADMIN,
    sourceModule: "contract-shield.manual-review",
    correlationId: crypto.randomUUID(),
    idempotencyKey: `cma-approve-${manualReviewId}`,
    payload: { approvalMode: "MANUAL_VALIDATED", rootCause: review.rootCauseCategory },
  }).catch(() => { /* non-critical */ })

  return result
}

/**
 * Approve via Exception Override — with stronger justification.
 * Status → CONTRACT_ADMIN_OVERRIDE_APPROVED.
 */
export async function approveExceptionOverride(
  manualReviewId: string,
  justification: string,
  ctx: CmaActorContext,
) {
  if (!justification || justification.length < 10) {
    throw new Error("Exception override requires detailed justification (min 10 characters)")
  }

  const review = await prisma.contractManualReview.findUnique({
    where: { id: manualReviewId },
    include: {
      deal: {
        include: { contracts: { orderBy: { version: "desc" as const }, take: 1 } },
      },
    },
  })

  if (!review) throw new Error("Manual review not found")
  if (review.status !== "OPEN") {
    throw new Error(`Cannot approve: review is in ${review.status} state`)
  }

  const validationError = validateChecklistComplete(review)
  if (validationError) throw new Error(`Checklist incomplete: ${validationError}`)

  // Exception overrides always require dual approval
  const needsDual = await requiresDualApproval(review.dealId, review)
  if (needsDual) {
    return requestSecondApproval(manualReviewId, ctx)
  }

  const latestDoc = review.deal.contracts[0]
  const docHash = latestDoc
    ? computeDocHash(latestDoc.documentUrl, latestDoc.version)
    : null

  const result = await prisma.$transaction(async (tx: any) => {
    const updated = await tx.contractManualReview.update({
      where: { id: manualReviewId },
      data: {
        status: "APPROVED",
        approvalMode: "EXCEPTION_OVERRIDE",
        approvedByAdminId: ctx.adminId,
        approvedAt: new Date(),
        approvedFromIp: ctx.ipAddress,
        approvedUserAgent: ctx.userAgent,
        rootCauseNotes: justification,
        documentHashAtApproval: docHash,
      },
    })

    await tx.selectedDeal.update({
      where: { id: review.dealId },
      data: { status: "CONTRACT_ADMIN_OVERRIDE_APPROVED" },
    })

    return updated
  })

  await logCmaEvent(review.dealId, "MANUAL_APPROVE", {
    manualReviewId,
    approvalMode: "EXCEPTION_OVERRIDE",
    justification,
    rootCauseCategory: review.rootCauseCategory,
    manualChecksCompleted: {
      vinMatch: review.vinMatch,
      buyerIdentityMatch: review.buyerIdentityMatch,
      otdMathValidated: review.otdMathValidated,
      feesValidated: review.feesValidated,
      termsValidated: review.termsValidated,
      disclosuresPresent: review.disclosuresPresent,
    },
    verifiedFieldsJson: review.verifiedFieldsJson,
    evidenceAttachmentIds: review.evidenceAttachmentIds,
    approverAdminId: ctx.adminId,
    approverRole: ctx.adminRole,
    overriddenScanId: review.overriddenScanId,
    documentHash: docHash,
  }, ctx)

  logger.info("CMA exception override approved", {
    manualReviewId,
    dealId: review.dealId,
  })

  return result
}

/**
 * Route to second approval when dual control is required.
 * Status → PENDING_SECOND_APPROVAL.
 */
export async function requestSecondApproval(
  manualReviewId: string,
  ctx: CmaActorContext,
) {
  const review = await prisma.contractManualReview.findUnique({
    where: { id: manualReviewId },
  })

  if (!review) throw new Error("Manual review not found")
  if (review.status !== "OPEN") {
    throw new Error(`Cannot request second approval: review is in ${review.status} state`)
  }

  const updated = await prisma.contractManualReview.update({
    where: { id: manualReviewId },
    data: {
      status: "PENDING_SECOND_APPROVAL",
      approvedByAdminId: ctx.adminId,
      approvedAt: new Date(),
      approvedFromIp: ctx.ipAddress,
      approvedUserAgent: ctx.userAgent,
    },
  })

  await logCmaEvent(review.dealId, "CMA_PENDING_SECOND_APPROVAL", {
    manualReviewId,
    firstApproverAdminId: ctx.adminId,
    firstApproverRole: ctx.adminRole,
  }, ctx)

  logger.info("CMA pending second approval", {
    manualReviewId,
    dealId: review.dealId,
    firstApprover: ctx.adminId,
  })

  return updated
}

/**
 * Second approver confirms the CMA decision.
 * Must be a different admin from the first approver.
 */
export async function secondApprove(
  manualReviewId: string,
  ctx: CmaActorContext,
) {
  const review = await prisma.contractManualReview.findUnique({
    where: { id: manualReviewId },
    include: {
      deal: {
        include: { contracts: { orderBy: { version: "desc" as const }, take: 1 } },
      },
    },
  })

  if (!review) throw new Error("Manual review not found")
  if (review.status !== "PENDING_SECOND_APPROVAL") {
    throw new Error(`Cannot second-approve: review is in ${review.status} state`)
  }

  // Enforce: second approver must differ from first
  if (review.approvedByAdminId === ctx.adminId) {
    throw new Error("Second approver must be a different admin from the first approver")
  }

  const latestDoc = review.deal.contracts[0]
  const docHash = latestDoc
    ? computeDocHash(latestDoc.documentUrl, latestDoc.version)
    : null

  const targetDealStatus =
    review.approvalMode === "EXCEPTION_OVERRIDE"
      ? "CONTRACT_ADMIN_OVERRIDE_APPROVED"
      : "CONTRACT_APPROVED"

  const result = await prisma.$transaction(async (tx: any) => {
    const updated = await tx.contractManualReview.update({
      where: { id: manualReviewId },
      data: {
        status: "APPROVED",
        secondApproverAdminId: ctx.adminId,
        secondApprovedAt: new Date(),
        documentHashAtApproval: docHash,
      },
    })

    await tx.selectedDeal.update({
      where: { id: review.dealId },
      data: { status: targetDealStatus },
    })

    return updated
  })

  await logCmaEvent(review.dealId, "MANUAL_APPROVAL_SECOND_APPROVED", {
    manualReviewId,
    approvalMode: review.approvalMode,
    firstApproverAdminId: review.approvedByAdminId,
    secondApproverAdminId: ctx.adminId,
    secondApproverRole: ctx.adminRole,
    overriddenScanId: review.overriddenScanId,
    documentHash: docHash,
  }, ctx)

  logger.info("CMA second approval completed", {
    manualReviewId,
    dealId: review.dealId,
    secondApprover: ctx.adminId,
  })

  return result
}

/**
 * Return to internal fix queue.
 * Status → CONTRACT_INTERNAL_FIX_IN_PROGRESS.
 */
export async function returnToInternalFix(
  manualReviewId: string,
  assignedQueue: CmaInternalQueue,
  notes: string,
  ctx: CmaActorContext,
) {
  if (!CMA_INTERNAL_QUEUES.includes(assignedQueue)) {
    throw new Error(`Invalid queue: ${assignedQueue}`)
  }

  const review = await prisma.contractManualReview.findUnique({
    where: { id: manualReviewId },
  })

  if (!review) throw new Error("Manual review not found")
  if (review.status !== "OPEN") {
    throw new Error(`Cannot return to fix: review is in ${review.status} state`)
  }

  const result = await prisma.$transaction(async (tx: any) => {
    const updated = await tx.contractManualReview.update({
      where: { id: manualReviewId },
      data: {
        status: "RETURNED_INTERNAL_FIX",
        approvalMode: "RETURN_TO_INTERNAL_FIX",
        assignedQueue,
        rootCauseNotes: notes,
        approvedByAdminId: ctx.adminId,
        approvedAt: new Date(),
      },
    })

    await tx.selectedDeal.update({
      where: { id: review.dealId },
      data: { status: "CONTRACT_INTERNAL_FIX_IN_PROGRESS" },
    })

    return updated
  })

  await logCmaEvent(review.dealId, "MANUAL_RETURN_INTERNAL_FIX", {
    manualReviewId,
    assignedQueue,
    notes,
    adminId: ctx.adminId,
    adminRole: ctx.adminRole,
  }, ctx)

  logger.info("CMA returned to internal fix", {
    manualReviewId,
    dealId: review.dealId,
    assignedQueue,
  })

  return result
}

/**
 * Revoke a previously approved manual review.
 * Used by admins or triggered by document change detection.
 */
export async function revokeManualReview(
  manualReviewId: string,
  reason: string,
  ctx: CmaActorContext,
) {
  const review = await prisma.contractManualReview.findUnique({
    where: { id: manualReviewId },
  })

  if (!review) throw new Error("Manual review not found")
  if (review.status === "REVOKED") {
    // Idempotency: already revoked, no-op
    return review
  }
  if (review.status !== "APPROVED") {
    throw new Error(`Cannot revoke: review is in ${review.status} state`)
  }

  const result = await prisma.$transaction(async (tx: any) => {
    const updated = await tx.contractManualReview.update({
      where: { id: manualReviewId },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedReason: reason,
        revokedByAdminId: ctx.adminId,
      },
    })

    await tx.selectedDeal.update({
      where: { id: review.dealId },
      data: { status: "CONTRACT_MANUAL_REVIEW_REQUIRED" },
    })

    return updated
  })

  await logCmaEvent(review.dealId, "MANUAL_APPROVAL_REVOKED", {
    manualReviewId,
    reason,
    previousApprovalMode: review.approvalMode,
    revokedByAdminId: ctx.adminId,
  }, ctx)

  logger.info("CMA approval revoked", {
    manualReviewId,
    dealId: review.dealId,
    reason,
  })

  // Emit canonical event
  writeEventAsync({
    eventType: PlatformEventType.CMA_REVOKED,
    entityType: EntityType.MANUAL_REVIEW,
    entityId: manualReviewId,
    parentEntityId: review.dealId,
    actorId: ctx.adminId,
    actorType: ActorType.ADMIN,
    sourceModule: "contract-shield.manual-review",
    correlationId: crypto.randomUUID(),
    idempotencyKey: `cma-revoke-${manualReviewId}`,
    payload: { reason, previousApprovalMode: review.approvalMode },
  }).catch(() => { /* non-critical */ })

  return result
}

/**
 * Detect document changes after approval and auto-revoke.
 * Idempotent: repeated calls for the same doc change are no-ops.
 */
export async function revokeIfDocsChanged(
  dealId: string,
  contractDocumentId: string,
  newDocUrl: string,
  newVersion: number,
) {
  // Find approved manual reviews for this deal
  const reviews = await prisma.contractManualReview.findMany({
    where: {
      dealId,
      status: "APPROVED",
    },
  })

  if (reviews.length === 0) return null

  const newHash = computeDocHash(newDocUrl, newVersion)

  const systemCtx: CmaActorContext = {
    adminId: "SYSTEM",
    adminRole: "SYSTEM_AGENT",
  }

  const results = []

  for (const review of reviews) {
    // Skip if no hash was recorded (pre-CMA approvals)
    if (!review.documentHashAtApproval) continue

    // Check for hash mismatch
    if (review.documentHashAtApproval !== newHash) {
      // Idempotency: check if already revoked for this reason
      if (review.status === "REVOKED") continue

      const revoked = await prisma.$transaction(async (tx: any) => {
        const updated = await tx.contractManualReview.update({
          where: { id: review.id },
          data: {
            status: "REVOKED",
            revokedAt: new Date(),
            revokedReason: `Document changed after approval. Old hash: ${review.documentHashAtApproval}, New hash: ${newHash}`,
            revokedByAdminId: "SYSTEM",
          },
        })

        await tx.selectedDeal.update({
          where: { id: dealId },
          data: { status: "CONTRACT_MANUAL_REVIEW_REQUIRED" },
        })

        return updated
      })

      await logCmaEvent(dealId, "MANUAL_APPROVAL_REVOKED_DUE_TO_DOC_CHANGE", {
        manualReviewId: review.id,
        contractDocumentId,
        oldHash: review.documentHashAtApproval,
        newHash,
        newVersion,
      }, systemCtx)

      logger.warn("CMA approval auto-revoked due to document change", {
        manualReviewId: review.id,
        dealId,
        contractDocumentId,
      })

      results.push(revoked)
    }
  }

  return results.length > 0 ? results : null
}

/**
 * Get the active manual review for a deal (if any).
 */
export async function getActiveManualReview(dealId: string) {
  return prisma.contractManualReview.findFirst({
    where: {
      dealId,
      status: { in: ["OPEN", "PENDING_SECOND_APPROVAL"] },
    },
    include: {
      approvedByAdmin: {
        select: { id: true, email: true, first_name: true, last_name: true },
      },
      secondApproverAdmin: {
        select: { id: true, email: true, first_name: true, last_name: true },
      },
      revokedByAdmin: {
        select: { id: true, email: true, first_name: true, last_name: true },
      },
      overriddenScan: {
        include: { fixList: true },
      },
    },
  })
}

/**
 * Get manual review by ID with full relations.
 */
export async function getManualReviewById(id: string) {
  return prisma.contractManualReview.findUnique({
    where: { id },
    include: {
      deal: {
        include: {
          contracts: { orderBy: { version: "desc" as const } },
        },
      },
      approvedByAdmin: {
        select: { id: true, email: true, first_name: true, last_name: true },
      },
      secondApproverAdmin: {
        select: { id: true, email: true, first_name: true, last_name: true },
      },
      revokedByAdmin: {
        select: { id: true, email: true, first_name: true, last_name: true },
      },
      overriddenScan: {
        include: { fixList: true },
      },
    },
  })
}

/**
 * List all manual reviews with optional filters.
 */
export async function listManualReviews(filters?: {
  status?: ManualReviewStatus
  dealId?: string
  workspaceId?: string
}) {
  return prisma.contractManualReview.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.dealId && { dealId: filters.dealId }),
      ...(filters?.workspaceId && { workspaceId: filters.workspaceId }),
    },
    include: {
      deal: true,
      approvedByAdmin: {
        select: { id: true, email: true, first_name: true, last_name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}
