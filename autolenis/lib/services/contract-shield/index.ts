// Contract Shield Service - Automated contract review assistant
// NOTE: This is an informational tool only. It does not provide legal, tax, or financial advice.

// Re-export all types and constants
export {
  DOCUMENT_TYPES,
  FLAGGED_ADD_ONS,
  STATE_DOC_FEE_REFERENCE,
  type DocumentType,
  type IssueSeverity,
  type ScanIssueItem,
  type ScanStatus,
} from "./types"

// Re-export public sub-module functions for direct use
// NOTE: checkMathConsistency, reviewFees, checkDocumentCompleteness, and
// sendOverrideNotification are intentionally NOT re-exported here — they were
// private in the original class and are only exported from their sub-modules
// for cross-module internal use (e.g., reconciliation → notifications).
export { scanContract, resolveFixItem } from "./scanner"
export { adminOverride, adminOverrideWithConsent, buyerAcknowledgeOverride } from "./overrides"
export { sendStatusChangeNotification } from "./notifications"
export { getActiveRules, updateRule, initializeDefaultRules } from "./rules"
export { runReconciliationJob } from "./reconciliation"
export {
  getOverridesLedger,
  getScanWithDetails,
  getScanByDealId,
  getDocumentsByDealId,
  uploadDocument,
  uploadContract,
} from "./queries"

// Re-export CMA (Contract Manual Review) functions
export {
  openManualReview,
  submitChecklist,
  approveManualValidated,
  approveExceptionOverride,
  requestSecondApproval,
  secondApprove,
  returnToInternalFix,
  revokeManualReview,
  revokeIfDocsChanged,
  getActiveManualReview,
  getManualReviewById,
  listManualReviews,
  ATTESTATION_TEXT_V1,
  CMA_ROOT_CAUSE_CATEGORIES,
  CMA_INTERNAL_QUEUES,
  type CmaRootCause,
  type CmaApprovalMode,
  type CmaInternalQueue,
  type ManualReviewStatus,
  type CmaChecklistPayload,
  type CmaActorContext,
} from "./manual-review"

// Import sub-module functions for class composition
import { scanContract, resolveFixItem } from "./scanner"
import { adminOverride, adminOverrideWithConsent, buyerAcknowledgeOverride } from "./overrides"
import { sendStatusChangeNotification } from "./notifications"
import { getActiveRules, updateRule, initializeDefaultRules } from "./rules"
import { runReconciliationJob } from "./reconciliation"
import {
  getOverridesLedger,
  getScanWithDetails,
  getScanByDealId,
  getDocumentsByDealId,
  uploadDocument,
  uploadContract,
} from "./queries"
import type { DocumentType } from "./types"
import {
  openManualReview as _openManualReview,
  submitChecklist as _submitChecklist,
  approveManualValidated as _approveManualValidated,
  approveExceptionOverride as _approveExceptionOverride,
  secondApprove as _secondApprove,
  returnToInternalFix as _returnToInternalFix,
  revokeManualReview as _revokeManualReview,
  revokeIfDocsChanged as _revokeIfDocsChanged,
  getActiveManualReview as _getActiveManualReview,
  getManualReviewById as _getManualReviewById,
  listManualReviews as _listManualReviews,
} from "./manual-review"
import type { CmaChecklistPayload as _CmaChecklistPayload, CmaActorContext as _CmaActorContext, CmaInternalQueue as _CmaInternalQueue, ManualReviewStatus as _ManualReviewStatus } from "./manual-review"

/**
 * ContractShieldService class composed from sub-modules.
 * Preserves the original static-method API for backward compatibility.
 */
export class ContractShieldService {
  static uploadDocument(
    selectedDealId: string,
    dealerId: string,
    fileUrl: string,
    documentType: DocumentType,
    metaJson?: Record<string, any>,
  ) {
    return uploadDocument(selectedDealId, dealerId, fileUrl, documentType, metaJson)
  }

  static scanContract(selectedDealId: string) {
    return scanContract(selectedDealId)
  }

  static resolveFixItem(
    fixItemId: string,
    resolution: {
      resolved: boolean
      explanation?: string
      newDocumentId?: string
    },
  ) {
    return resolveFixItem(fixItemId, resolution)
  }

  static adminOverride(scanId: string, action: "FORCE_PASS" | "FORCE_FAIL", adminId: string, reason: string) {
    return adminOverride(scanId, action, adminId, reason)
  }

  static adminOverrideWithConsent(
    scanId: string,
    action: "FORCE_PASS" | "FORCE_FAIL",
    adminId: string,
    reason: string,
  ) {
    return adminOverrideWithConsent(scanId, action, adminId, reason)
  }

  static buyerAcknowledgeOverride(overrideId: string, buyerId: string, comment?: string) {
    return buyerAcknowledgeOverride(overrideId, buyerId, comment)
  }

  static sendStatusChangeNotification(scanId: string, oldStatus: string, newStatus: string) {
    return sendStatusChangeNotification(scanId, oldStatus, newStatus)
  }

  static getActiveRules() {
    return getActiveRules()
  }

  static updateRule(
    ruleId: string,
    updates: {
      enabled?: boolean
      thresholdValue?: number
      severity?: string
      configJson?: Record<string, any>
    },
  ) {
    return updateRule(ruleId, updates)
  }

  static initializeDefaultRules() {
    return initializeDefaultRules()
  }

  static runReconciliationJob(jobType: "SYNC_STATUSES" | "CHECK_STALE_SCANS" | "NOTIFY_PENDING") {
    return runReconciliationJob(jobType)
  }

  static getOverridesLedger(filters?: {
    scanId?: string
    adminId?: string
    buyerAcknowledged?: boolean
    startDate?: Date
    endDate?: Date
  }) {
    return getOverridesLedger(filters)
  }

  static getScanWithDetails(scanId: string) {
    return getScanWithDetails(scanId)
  }

  static getScanByDealId(dealId: string) {
    return getScanByDealId(dealId)
  }

  static getDocumentsByDealId(dealId: string) {
    return getDocumentsByDealId(dealId)
  }

  static uploadContract(dealId: string, dealerId: string, documentUrl: string, documentType: string) {
    return uploadContract(dealId, dealerId, documentUrl, documentType)
  }

  // ─── CMA (Contract Manual Review) ──────────────────────────────────────────

  static openManualReview(dealId: string, scanId: string, ctx: _CmaActorContext) {
    return _openManualReview(dealId, scanId, ctx)
  }

  static submitChecklist(manualReviewId: string, payload: _CmaChecklistPayload, ctx: _CmaActorContext) {
    return _submitChecklist(manualReviewId, payload, ctx)
  }

  static approveManualValidated(manualReviewId: string, ctx: _CmaActorContext) {
    return _approveManualValidated(manualReviewId, ctx)
  }

  static approveExceptionOverride(manualReviewId: string, justification: string, ctx: _CmaActorContext) {
    return _approveExceptionOverride(manualReviewId, justification, ctx)
  }

  static secondApprove(manualReviewId: string, ctx: _CmaActorContext) {
    return _secondApprove(manualReviewId, ctx)
  }

  static returnToInternalFix(manualReviewId: string, assignedQueue: _CmaInternalQueue, notes: string, ctx: _CmaActorContext) {
    return _returnToInternalFix(manualReviewId, assignedQueue, notes, ctx)
  }

  static revokeManualReview(manualReviewId: string, reason: string, ctx: _CmaActorContext) {
    return _revokeManualReview(manualReviewId, reason, ctx)
  }

  static revokeIfDocsChanged(dealId: string, contractDocumentId: string, newDocUrl: string, newVersion: number) {
    return _revokeIfDocsChanged(dealId, contractDocumentId, newDocUrl, newVersion)
  }

  static getActiveManualReview(dealId: string) {
    return _getActiveManualReview(dealId)
  }

  static getManualReviewById(id: string) {
    return _getManualReviewById(id)
  }

  static listManualReviews(filters?: { status?: _ManualReviewStatus; dealId?: string; workspaceId?: string }) {
    return _listManualReviews(filters)
  }
}

export const contractShieldService = new ContractShieldService()
