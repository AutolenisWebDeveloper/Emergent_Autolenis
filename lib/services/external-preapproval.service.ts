import { supabase, prisma } from "@/lib/db"
import { PREQUAL_EXPIRY_DAYS } from "@/lib/constants"
import type { ExternalPreApprovalSubmitInput, ExternalPreApprovalReviewInput } from "@/lib/validators/external-preapproval"
import { emailService } from "@/lib/services/email.service"
import { writeEventAsync } from "@/lib/services/event-ledger"
import { PlatformEventType, EntityType, ActorType } from "@/lib/services/event-ledger"

// ---------------------------------------------------------------------------
// External Pre-Approval Service
//
// Uses the approved Prompt 4 canonical Supabase backend objects:
//   Tables:    public.external_preapproval_submissions
//              public.external_preapproval_status_history
//              public.external_preapproval_documents
//   View:      public.buyer_qualification_active
//   Functions: public.external_preapproval_set_status(...)
//              public.external_preapproval_approve(...)
//   Storage:   buyer-docs bucket
//
// The legacy Prisma ExternalPreApprovalSubmission model is NOT used for writes.
// Prisma is only used for ComplianceEvent logging and User lookup (separate
// systems not covered by the canonical external preapproval backend).
// ---------------------------------------------------------------------------

/** Approved Prompt 4 storage bucket for buyer pre-approval documents. */
export const STORAGE_BUCKET = "buyer-docs"

/** Approved Prompt 4 canonical table name. */
const SUBMISSIONS_TABLE = "external_preapproval_submissions"
const DOCUMENTS_TABLE = "external_preapproval_documents"

// Valid status transitions — mirrors the DB CHECK and set_status() function.
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ["IN_REVIEW", "APPROVED", "REJECTED", "SUPERSEDED"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["EXPIRED", "SUPERSEDED"],
  REJECTED: [],
  EXPIRED: [],
  SUPERSEDED: [],
}

// ---------------------------------------------------------------------------
// Row-shape mapping: The canonical Prompt 4 table uses snake_case columns.
// The rest of the app (API routes, frontend) expects camelCase.  These tiny
// mappers keep the translation in one place.
// ---------------------------------------------------------------------------

interface CanonicalSubmissionRow {
  id: string
  buyer_id: string
  workspace_id: string | null
  lender_name: string
  approved_amount: number
  max_otd_amount_cents: number | null
  apr: number | null
  apr_bps: number | null
  term_months: number | null
  min_monthly_payment_cents: number | null
  max_monthly_payment_cents: number | null
  dti_ratio_bps: number | null
  expires_at: string | null
  submission_notes: string | null
  storage_bucket: string | null
  document_storage_path: string | null
  original_file_name: string | null
  file_size_bytes: number | null
  mime_type: string | null
  sha256: string | null
  status: string
  reviewed_by: string | null
  reviewed_at: string | null
  decision_at: string | null
  review_notes: string | null
  rejection_reason: string | null
  rejection_reason_code: string | null
  superseded_by_id: string | null
  prequalification_id: string | null
  created_at: string
  updated_at: string
}

/** Map a canonical snake_case row to the camelCase shape the app expects. */
function toCamelCase(row: CanonicalSubmissionRow) {
  return {
    id: row.id,
    buyerId: row.buyer_id,
    workspaceId: row.workspace_id,
    lenderName: row.lender_name,
    approvedAmount: row.approved_amount,
    maxOtdAmountCents: row.max_otd_amount_cents,
    apr: row.apr,
    aprBps: row.apr_bps,
    termMonths: row.term_months,
    minMonthlyPaymentCents: row.min_monthly_payment_cents,
    maxMonthlyPaymentCents: row.max_monthly_payment_cents,
    dtiRatioBps: row.dti_ratio_bps,
    expiresAt: row.expires_at,
    submissionNotes: row.submission_notes,
    storageBucket: row.storage_bucket,
    documentStoragePath: row.document_storage_path,
    originalFileName: row.original_file_name,
    fileSizeBytes: row.file_size_bytes,
    mimeType: row.mime_type,
    sha256: row.sha256,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    decisionAt: row.decision_at,
    reviewNotes: row.review_notes,
    rejectionReason: row.rejection_reason,
    rejectionReasonCode: row.rejection_reason_code,
    supersededById: row.superseded_by_id,
    preQualificationId: row.prequalification_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class ExternalPreApprovalService {
  /**
   * Buyer submits an external pre-approval document.
   * Writes to the Prompt 4 canonical table `external_preapproval_submissions`
   * and optionally to `external_preapproval_documents`.
   * RBAC: Only the owning buyer can submit.
   */
  async submit(
    buyerId: string,
    input: ExternalPreApprovalSubmitInput,
    fileMetadata?: {
      storagePath: string
      originalFileName: string
      fileSizeBytes: number
      mimeType: string
      storageBucket?: string
      sha256?: string
    },
    workspaceId?: string | null,
  ) {
    // Supersede any existing SUBMITTED/IN_REVIEW submissions for this buyer
    const { data: superseded } = await supabase
      .from(SUBMISSIONS_TABLE)
      .select("id")
      .eq("buyer_id", buyerId)
      .in("status", ["SUBMITTED", "IN_REVIEW"])

    if (superseded && superseded.length > 0) {
      await supabase
        .from(SUBMISSIONS_TABLE)
        .update({ status: "SUPERSEDED", updated_at: new Date().toISOString() })
        .eq("buyer_id", buyerId)
        .in("status", ["SUBMITTED", "IN_REVIEW"])
    }

    // Compute normalized cents fields
    const maxOtdAmountCents = Math.floor(input.approvedAmount * 100)
    const aprBps = input.apr != null ? Math.round(input.apr * 100) : null

    // DB constraint: storageBucket and documentStoragePath must be both null or both populated.
    const storageBucket = fileMetadata?.storageBucket ?? null
    const documentStoragePath = fileMetadata?.storagePath ?? null
    if ((storageBucket == null) !== (documentStoragePath == null)) {
      throw new Error(
        "Storage metadata is incomplete: storageBucket and documentStoragePath must both be set or both be null",
      )
    }

    const now = new Date().toISOString()

    const { data: row, error } = await supabase
      .from(SUBMISSIONS_TABLE)
      .insert({
        buyer_id: buyerId,
        workspace_id: workspaceId ?? null,
        lender_name: input.lenderName,
        approved_amount: input.approvedAmount,
        max_otd_amount_cents: maxOtdAmountCents,
        apr: input.apr ?? null,
        apr_bps: aprBps,
        term_months: input.termMonths ?? null,
        expires_at: input.expiresAt ?? null,
        submission_notes: input.submissionNotes ?? null,
        storage_bucket: storageBucket,
        document_storage_path: documentStoragePath,
        original_file_name: fileMetadata?.originalFileName ?? null,
        file_size_bytes: fileMetadata?.fileSizeBytes ?? null,
        mime_type: fileMetadata?.mimeType ?? null,
        sha256: fileMetadata?.sha256 ?? null,
        superseded_by_id: (superseded && superseded[0]?.id) ?? null,
        status: "SUBMITTED",
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error || !row) {
      throw new Error(`Failed to create submission: ${error?.message ?? "unknown"}`)
    }

    const submission = toCamelCase(row as CanonicalSubmissionRow)

    // Write document metadata to canonical documents table (if file attached)
    if (fileMetadata && documentStoragePath) {
      await supabase.from(DOCUMENTS_TABLE).insert({
        submission_id: row.id,
        storage_bucket: storageBucket ?? STORAGE_BUCKET,
        storage_path: documentStoragePath,
        original_name: fileMetadata.originalFileName ?? null,
        file_size_bytes: fileMetadata.fileSizeBytes ?? null,
        mime_type: fileMetadata.mimeType ?? null,
        sha256: fileMetadata.sha256 ?? null,
        uploaded_by: buyerId,
      })
    }

    // Notify admin of new submission (best-effort)
    try {
      const adminEmail = process.env['ADMIN_NOTIFICATION_EMAIL'] || process.env['NOTIFICATION_EMAIL']
      if (adminEmail) {
        await emailService.sendNotification(
          adminEmail,
          "New External Pre-Approval Submission",
          `A buyer has submitted an external bank pre-approval from ${input.lenderName} for $${input.approvedAmount.toLocaleString()}. Please review in the admin portal.`,
          "Review Now",
          `${process.env['NEXT_PUBLIC_APP_URL'] || ''}/admin/external-preapprovals`,
        )
      }
    } catch {
      // Email is best-effort; don't fail submission
    }

    return submission
  }

  /**
   * Get the latest submission for a buyer.
   * Reads from canonical Prompt 4 table `external_preapproval_submissions`.
   * RBAC: scoped to buyerId (caller must verify ownership).
   */
  async getLatestForBuyer(buyerId: string) {
    const { data } = await supabase
      .from(SUBMISSIONS_TABLE)
      .select("*")
      .eq("buyer_id", buyerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    return data ? toCamelCase(data as CanonicalSubmissionRow) : null
  }

  /**
   * Get all submissions for a buyer (history).
   * RBAC: admin only.
   */
  async getAllForBuyer(buyerId: string) {
    const { data } = await supabase
      .from(SUBMISSIONS_TABLE)
      .select("*")
      .eq("buyer_id", buyerId)
      .order("created_at", { ascending: false })

    return (data ?? []).map((r) => toCamelCase(r as CanonicalSubmissionRow))
  }

  /**
   * Admin: list submissions filtered by status values.
   */
  async listByStatus(statuses: string[]) {
    const { data } = await supabase
      .from(SUBMISSIONS_TABLE)
      .select("*")
      .in("status", statuses)
      .order("created_at", { ascending: true })

    return (data ?? []).map((r) => toCamelCase(r as CanonicalSubmissionRow))
  }

  /**
   * Admin: list pending submissions for review queue.
   */
  async listPendingReview(options?: { page?: number; perPage?: number }) {
    const page = options?.page ?? 1
    const perPage = options?.perPage ?? 20
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const { data, error, count } = await supabase
      .from(SUBMISSIONS_TABLE)
      .select("*", { count: "exact" })
      .in("status", ["SUBMITTED", "IN_REVIEW"])
      .order("created_at", { ascending: true })
      .range(from, to)

    if (error) {
      console.error("[External PreApproval] listPendingReview error:", error.message)
    }

    return {
      submissions: (data ?? []).map((r) => toCamelCase(r as CanonicalSubmissionRow)),
      total: count ?? 0,
      page,
      perPage,
    }
  }

  /**
   * Admin: get a single submission by ID.
   * Reads from canonical Prompt 4 table `external_preapproval_submissions`.
   */
  async getById(id: string) {
    const { data } = await supabase
      .from(SUBMISSIONS_TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle()

    return data ? toCamelCase(data as CanonicalSubmissionRow) : null
  }

  /**
   * Admin: review (approve/reject) a submission.
   * Uses the approved Prompt 4 canonical DB functions:
   *   - external_preapproval_approve(...)  for APPROVED
   *   - external_preapproval_set_status(...) for REJECTED / other transitions
   * On APPROVED: the DB function creates a PreQualification record with
   * source=EXTERNAL_MANUAL, ensuring full gating equivalence with the
   * native pre-qualification flow.
   */
  async review(
    submissionId: string,
    adminUserId: string,
    input: ExternalPreApprovalReviewInput,
  ) {
    // Fetch current submission from canonical table
    const existing = await this.getById(submissionId)

    if (!existing) {
      throw new Error("Submission not found")
    }

    // Idempotency: if submission is already in the target state, return current.
    if (existing.status === input.action) {
      let existingPreQual = null
      if (existing.preQualificationId) {
        const { data: pqData, error: pqError } = await supabase
          .from("PreQualification")
          .select("*")
          .eq("id", existing.preQualificationId)
          .maybeSingle()
        if (pqError) {
          console.error("[External PreApproval] idempotent prequal lookup error:", pqError.message)
        }
        existingPreQual = pqData
      }
      return { submission: existing, preQualification: existingPreQual }
    }

    // Validate status transition (client-side check — the DB function also validates)
    const allowedNext = VALID_STATUS_TRANSITIONS[existing.status] || []
    if (!allowedNext.includes(input.action)) {
      throw new Error(
        `Cannot transition from ${existing.status} to ${input.action}`,
      )
    }

    if (input.action === "REJECTED" && !input.rejectionReason) {
      throw new Error("Rejection reason is required")
    }

    let updatedSubmission = existing
    let preQualification: Record<string, unknown> | null = null

    if (input.action === "APPROVED") {
      // Use the Prompt 4 canonical approve function — it transitions the
      // status, creates the PreQualification, and records status history.
      const { data: approveResult, error: approveError } = await supabase.rpc(
        "external_preapproval_approve",
        {
          p_submission_id: submissionId,
          p_admin_user_id: adminUserId,
          p_review_notes: input.reviewNotes ?? null,
          p_credit_tier_override: input.creditTier ?? null,
          p_approved_amount_override: input.approvedAmount ?? null,
          p_max_monthly_override: input.maxMonthlyPaymentCents ?? null,
          p_expiry_days: PREQUAL_EXPIRY_DAYS,
        },
      )

      if (approveError) {
        throw new Error(
          `external_preapproval_approve RPC failed: ${approveError.message}`,
        )
      }

      if (
        !approveResult ||
        (Array.isArray(approveResult) && approveResult.length === 0)
      ) {
        throw new Error(
          "external_preapproval_approve RPC returned no result — function may not be deployed",
        )
      }

      // RPC returns [{prequal_id: "..."}] or a scalar id string
      const firstResult = Array.isArray(approveResult)
        ? approveResult[0]
        : approveResult
      const prequalId =
        typeof firstResult === "object" && firstResult !== null
          ? firstResult.prequal_id
          : firstResult

      // Re-read updated submission
      const refreshed = await this.getById(submissionId)
      if (refreshed) updatedSubmission = refreshed

      // Resolve final prequalId — prefer RPC result, fall back to refreshed submission
      const resolvedPrequalId =
        (typeof prequalId === "string" ? prequalId : null) ??
        refreshed?.preQualificationId

      // FCRA: Log permissible purpose for the external pre-approval review
      await prisma.permissiblePurposeLog.create({
        data: {
          userId:             existing.buyerId,
          // Prisma requires undefined (not null) to omit optional fields
          prequalificationId: resolvedPrequalId ?? undefined,
          permissiblePurpose: "WRITTEN_INSTRUCTIONS_OF_CONSUMER",
          purposeDescription:
            "Consumer-submitted external bank pre-approval reviewed and approved by admin",
          providerName:       existing.lenderName ?? "External Lender",
          inquiryType:        "SOFT_PULL",
          createdAt:          new Date(),
        },
      })

      if (resolvedPrequalId) {
        const { data: pq } = await supabase
          .from("PreQualification")
          .select("*")
          .eq("id", resolvedPrequalId)
          .maybeSingle()
        preQualification = pq
      }
    } else {
      // Use the Prompt 4 canonical set_status function for non-approve transitions
      const { error: statusError } = await supabase.rpc(
        "external_preapproval_set_status",
        {
          p_submission_id: submissionId,
          p_new_status: input.action,
          p_changed_by: adminUserId,
          p_reason: input.rejectionReason ?? null,
          p_review_notes: input.reviewNotes ?? null,
          p_rejection_reason: input.rejectionReason ?? null,
          p_rejection_reason_code: input.rejectionReasonCode ?? null,
        },
      )

      if (statusError) {
        throw new Error(`Status transition failed: ${statusError.message}`)
      }

      const refreshed = await this.getById(submissionId)
      if (refreshed) updatedSubmission = refreshed
    }

    // Log compliance event (ComplianceEvent is a separate system — keep Prisma)
    await prisma.complianceEvent.create({
      data: {
        eventType:
          input.action === "APPROVED"
            ? "EXTERNAL_PREAPPROVAL_APPROVED"
            : "EXTERNAL_PREAPPROVAL_REJECTED",
        userId: existing.buyerId,
        buyerId: existing.buyerId,
        action: input.action === "APPROVED" ? "APPROVE" : "REJECT",
        details: {
          submissionId,
          action: input.action,
          reviewedBy: adminUserId,
          reviewNotes: input.reviewNotes,
          rejectionReason: input.rejectionReason,
          rejectionReasonCode: input.rejectionReasonCode,
          lenderName: existing.lenderName,
          approvedAmount: existing.approvedAmount,
          preQualId: (preQualification as Record<string, unknown> | null)?.id,
        },
        createdAt: new Date(),
      },
    })

    // Emit canonical event
    const eventType = input.action === "APPROVED"
      ? PlatformEventType.EXTERNAL_PREAPPROVAL_APPROVED
      : PlatformEventType.EXTERNAL_PREAPPROVAL_REJECTED
    writeEventAsync({
      eventType,
      entityType: EntityType.PREAPPROVAL,
      entityId: submissionId,
      actorId: adminUserId,
      actorType: ActorType.ADMIN,
      sourceModule: "external-preapproval.service",
      correlationId: crypto.randomUUID(),
      idempotencyKey: `ext-preapproval-review-${submissionId}-${input.action}`,
      payload: { action: input.action, buyerId: existing.buyerId, lenderName: existing.lenderName },
    }).catch(() => { /* non-critical */ })

    // Log additional audit event when PreQualification was upserted
    if (preQualification) {
      await prisma.complianceEvent.create({
        data: {
          eventType: "PREQUALIFICATION_UPSERTED_FROM_MANUAL",
          userId: existing.buyerId,
          buyerId: existing.buyerId,
          action: "UPSERT_PREQUAL",
          details: {
            submissionId,
            preQualId: preQualification.id,
            source: "EXTERNAL_MANUAL",
            reviewedBy: adminUserId,
            lenderName: existing.lenderName,
            approvedAmount: existing.approvedAmount,
            creditTier: preQualification.creditTier,
            maxOtd: preQualification.maxOtd,
          },
          createdAt: new Date(),
        },
      })
    }

    // Send email notification to buyer (best-effort)
    try {
      const buyer = await prisma.user.findFirst({
        where: { buyerProfile: { id: existing.buyerId } },
        select: { email: true },
      })
      if (buyer?.email) {
        if (input.action === "APPROVED") {
          await emailService.sendNotification(
            buyer.email,
            "Pre-Approval Approved",
            `Your external bank pre-approval from ${existing.lenderName} has been approved. You are now pre-qualified and can proceed with vehicle discovery, shortlisting, and the full purchase workflow.`,
            "Browse Vehicles",
            `${process.env['NEXT_PUBLIC_APP_URL'] || ''}/buyer/search`,
          )
        } else {
          await emailService.sendNotification(
            buyer.email,
            "Pre-Approval Review Update",
            `Your external bank pre-approval from ${existing.lenderName} was not approved. Reason: ${input.rejectionReason || 'Please contact support for details.'}. You may resubmit with updated documentation.`,
            "Resubmit",
            `${process.env['NEXT_PUBLIC_APP_URL'] || ''}/buyer/prequal`,
          )
        }
      }
    } catch {
      // Email is best-effort; don't fail the review
    }

    return {
      submission: updatedSubmission,
      preQualification,
    }
  }

  /**
   * Validate status transition is allowed.
   */
  static isValidTransition(from: string, to: string): boolean {
    return (VALID_STATUS_TRANSITIONS[from] || []).includes(to)
  }

  /**
   * Get valid statuses.
   */
  static get STATUSES() {
    return [
      "SUBMITTED",
      "IN_REVIEW",
      "APPROVED",
      "REJECTED",
      "EXPIRED",
      "SUPERSEDED",
    ] as const
  }
}

// Singleton
export const externalPreApprovalService = new ExternalPreApprovalService()
